import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { attachArenaWebSocket } from "./arena-server.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const sessions = new Map();
const oauthStates = new Map();
const sessionLifetime = 60 * 60 * 1000;
const oauthStateLifetime = 10 * 60 * 1000;

const publicFiles = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/index.html", ["index.html", "text/html; charset=utf-8"]],
    ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
    ["/blade-game.js", ["blade-game.js", "text/javascript; charset=utf-8"]],
    ["/style.css", ["style.css", "text/css; charset=utf-8"]]
]);

function loadLocalEnvironment() {
    let contents;

    try {
        contents = readFileSync(join(root, ".env"), "utf8");
    } catch {
        return;
    }

    for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);

        if (!match || process.env[match[1]] !== undefined) {
            continue;
        }

        const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
        process.env[match[1]] = value;
    }
}

loadLocalEnvironment();

const port = Number(process.env.PORT || 3000);

function sendJson(response, status, body) {
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(JSON.stringify(body));
}

function sendText(response, status, body) {
    response.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(body);
}

function parseCookies(request) {
    return Object.fromEntries(
        (request.headers.cookie || "")
            .split(";")
            .map(cookie => cookie.trim())
            .filter(Boolean)
            .map(cookie => {
                const separator = cookie.indexOf("=");
                return [
                    cookie.slice(0, separator),
                    decodeURIComponent(cookie.slice(separator + 1))
                ];
            })
    );
}

function cookieSecurity(request) {
    return process.env.NODE_ENV === "production" ||
        request.headers["x-forwarded-proto"] === "https";
}

function cookieOptions(request, path, maxAge) {
    const parts = [
        `Path=${path}`,
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${maxAge}`
    ];

    if (cookieSecurity(request)) {
        parts.push("Secure");
    }

    return parts.join("; ");
}

function redirect(response, location, cookies = []) {
    response.writeHead(302, {
        Location: location,
        "Cache-Control": "no-store",
        ...(cookies.length ? { "Set-Cookie": cookies } : {})
    });
    response.end();
}

function redirectWithAuthError(response, error, cookies = []) {
    redirect(
        response,
        `/?discord_error=${encodeURIComponent(error)}`,
        cookies
    );
}

function discordConfig() {
    const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } = process.env;

    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
        return null;
    }

    return {
        clientId: DISCORD_CLIENT_ID,
        clientSecret: DISCORD_CLIENT_SECRET,
        redirectUri: DISCORD_REDIRECT_URI
    };
}

function cleanExpiredEntries() {
    const now = Date.now();

    for (const [state, expiresAt] of oauthStates) {
        if (expiresAt <= now) {
            oauthStates.delete(state);
        }
    }

    for (const [sessionId, session] of sessions) {
        if (session.expiresAt <= now) {
            sessions.delete(sessionId);
        }
    }
}

function getSession(request) {
    cleanExpiredEntries();

    const sessionId = parseCookies(request).discord_session;
    const session = sessionId ? sessions.get(sessionId) : null;

    return session && session.expiresAt > Date.now()
        ? session
        : null;
}

async function beginDiscordLogin(request, response) {
    const config = discordConfig();

    if (!config) {
        redirectWithAuthError(response, "not_configured");
        return;
    }

    const state = randomBytes(32).toString("hex");
    oauthStates.set(state, Date.now() + oauthStateLifetime);

    const authorizationUrl = new URL("https://discord.com/oauth2/authorize");
    authorizationUrl.search = new URLSearchParams({
        client_id: config.clientId,
        response_type: "code",
        scope: "identify",
        redirect_uri: config.redirectUri,
        state
    }).toString();

    const stateCookie = [
        `discord_oauth_state=${state}`,
        cookieOptions(request, "/auth/discord/callback", 600)
    ].join("; ");

    redirect(response, authorizationUrl.toString(), [stateCookie]);
}

async function completeDiscordLogin(request, response, url) {
    const config = discordConfig();
    const cookies = parseCookies(request);
    const state = url.searchParams.get("state");
    const stateExpiry = state ? oauthStates.get(state) : null;
    const clearStateCookie = [
        "discord_oauth_state=",
        cookieOptions(request, "/auth/discord/callback", 0)
    ].join("; ");

    if (!state || cookies.discord_oauth_state !== state || !stateExpiry || stateExpiry <= Date.now()) {
        if (state) {
            oauthStates.delete(state);
        }
        redirectWithAuthError(response, "invalid_state", [clearStateCookie]);
        return;
    }

    oauthStates.delete(state);

    if (url.searchParams.has("error")) {
        redirectWithAuthError(response, "cancelled", [clearStateCookie]);
        return;
    }

    const code = url.searchParams.get("code");

    if (!config || !code) {
        redirectWithAuthError(response, "oauth_failed", [clearStateCookie]);
        return;
    }

    try {
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: config.redirectUri
            }),
            signal: AbortSignal.timeout(10000)
        });

        if (!tokenResponse.ok) {
            throw new Error("Discord token exchange failed");
        }

        const token = await tokenResponse.json();
        const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
            headers: {
                Authorization: `Bearer ${token.access_token}`
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!userResponse.ok) {
            throw new Error("Discord profile lookup failed");
        }

        const discordUser = await userResponse.json();

        if (!/^\d+$/.test(discordUser.id || "") || !discordUser.username) {
            throw new Error("Discord returned an invalid user profile");
        }

        const sessionId = randomBytes(32).toString("hex");
        sessions.set(sessionId, {
            user: {
                id: discordUser.id,
                username: discordUser.username
            },
            expiresAt: Date.now() + sessionLifetime
        });

        const sessionCookie = [
            `discord_session=${sessionId}`,
            cookieOptions(request, "/", sessionLifetime / 1000)
        ].join("; ");

        redirect(response, "/?discord=connected", [clearStateCookie, sessionCookie]);
    } catch {
        redirectWithAuthError(response, "oauth_failed", [clearStateCookie]);
    }
}

async function serveStaticFile(response, pathname) {
    const file = publicFiles.get(pathname);

    if (!file) {
        sendText(response, 404, "Not found");
        return;
    }

    try {
        const contents = await readFile(join(root, file[0]));
        response.writeHead(200, {
            "Content-Type": file[1],
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff"
        });
        response.end(contents);
    } catch {
        sendText(response, 500, "Unable to load site files");
    }
}

async function handleRequest(request, response) {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "GET" && url.pathname === "/auth/discord") {
        await beginDiscordLogin(request, response);
        return;
    }

    if (request.method === "GET" && url.pathname === "/auth/discord/callback") {
        await completeDiscordLogin(request, response, url);
        return;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
        const session = getSession(request);

        if (!session) {
            sendJson(response, 401, { error: "not_authenticated" });
            return;
        }

        sendJson(response, 200, session.user);
        return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
        const sessionId = parseCookies(request).discord_session;

        if (sessionId) {
            sessions.delete(sessionId);
        }

        const clearSessionCookie = [
            "discord_session=",
            cookieOptions(request, "/", 0)
        ].join("; ");

        response.writeHead(204, { "Set-Cookie": clearSessionCookie });
        response.end();
        return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
        sendText(response, 405, "Method not allowed");
        return;
    }

    await serveStaticFile(response, url.pathname);
}

const server = createServer((request, response) => {
    handleRequest(request, response).catch(() => {
        if (!response.headersSent) {
            sendText(response, 500, "Internal server error");
        } else {
            response.end();
        }
    });
});

attachArenaWebSocket(server, {
    getUser: request => getSession(request)?.user || null
});

server.listen(port, "0.0.0.0", () => {
    console.log(`Site listening on port ${port}`);
});