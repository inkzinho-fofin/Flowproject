import { randomUUID } from "node:crypto";
import RAPIER from "@dimforge/rapier3d-compat";
import { WebSocketServer, WebSocket } from "ws";

await RAPIER.init();

const physicsWorld = new RAPIER.World({ x: 0, y: 0, z: 0 });
const players = new Map();
const minPlayers = 3;
const totalRounds = 5;
const arenaRadius = 8;
const raceCheckpoints = [
    { x: 18, z: -15 },
    { x: -18, z: -15 },
    { x: -27, z: 0 },
    { x: -18, z: 15 },
    { x: 18, z: 15 }
];
let phase = "lobby";
let raceModeSelected = false;
let round = 0;
let targetId = null;
let ball = { x: 0, y: 1.2, z: 0 };
let ballBody = null;
let ballCollider = null;
let roundTimer = null;
let matchResetTimer = null;
let raceStartTimer = null;
let raceResetTimer = null;
let previousTick = Date.now();

function publicPlayer(player) {
    return {
        id: player.id,
        username: player.username,
        nick: player.nick,
        score: player.score,
        ready: player.ready,
        quizFinished: player.quizFinished,
        wins: player.wins,
        active: player.active,
        x: player.x,
        z: player.z,
        raceReady: player.raceReady,
        raceCheckpoint: player.raceCheckpoint,
        raceFinished: player.raceFinished,
        raceFinishedAt: player.raceFinishedAt,
        boostUntil: player.boostUntil,
        boostReadyAt: player.boostReadyAt
    };
}

function send(socket, message) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}

function broadcast(message) {
    const data = JSON.stringify(message);

    for (const player of players.values()) {
        if (player.online && player.socket?.readyState === WebSocket.OPEN) {
            player.socket.send(data);
        }
    }
}

function lobbySnapshot() {
    return [...players.values()]
        .filter(player => player.online)
        .map(publicPlayer);
}

function publishLobby() {
    broadcast({ type: "lobby_state", players: lobbySnapshot() });
}

function publishReadiness() {
    broadcast({
        type: "readiness",
        players: lobbySnapshot(),
        requiredPlayers: minPlayers,
        phase
    });
}

function arenaSnapshot() {
    return {
        type: "arena_state",
        phase,
        round,
        totalRounds,
        targetId,
        ball,
        players: lobbySnapshot()
    };
}

function publishArenaState() {
    broadcast(arenaSnapshot());
}

function raceSnapshot() {
    return {
        type: "race_state",
        phase,
        totalCheckpoints: raceCheckpoints.length,
        finish: { x: 27, z: 0 },
        players: lobbySnapshot()
    };
}

function publishRaceState() {
    broadcast(raceSnapshot());
}

function getConnectedPlayers() {
    return [...players.values()].filter(
        player => player.online && player.socket?.readyState === WebSocket.OPEN
    );
}

function chooseTarget(excludedId = null) {
    const candidates = [...players.values()].filter(
        player => player.online && player.active && player.id !== excludedId
    );

    if (candidates.length === 0) {
        return null;
    }

    return candidates[Math.floor(Math.random() * candidates.length)].id;
}

function createPlayerPhysics(player, index, count) {
    const angle = (Math.PI * 2 * index) / count;
    player.x = Math.cos(angle) * 5.4;
    player.z = Math.sin(angle) * 5.4;
    player.moveX = 0;
    player.moveZ = 0;
    player.lastParryAt = 0;
    player.body = physicsWorld.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(player.x, 0.95, player.z)
    );
    player.collider = physicsWorld.createCollider(
        RAPIER.ColliderDesc.capsule(0.45, 0.38).setSensor(true),
        player.body
    );
}

function resetPlayerPositions() {
    const roster = getConnectedPlayers();

    if (ballBody && ballCollider) {
        physicsWorld.removeCollider(ballCollider, true);
        physicsWorld.removeRigidBody(ballBody);
    }

    for (const player of roster) {
        if (player.body) {
            physicsWorld.removeCollider(player.collider, true);
            physicsWorld.removeRigidBody(player.body);
        }
    }

    roster.forEach((player, index) => {
        player.active = true;
        createPlayerPhysics(player, index, roster.length);
    });

    ball = { x: 0, y: 1.2, z: 0 };
    ballBody = physicsWorld.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setGravityScale(0)
            .setLinearDamping(0)
            .setTranslation(ball.x, ball.y, ball.z)
    );
    ballCollider = physicsWorld.createCollider(
        RAPIER.ColliderDesc.ball(0.42).setSensor(true),
        ballBody
    );
}

function finishRound() {
    if (phase !== "playing") {
        return;
    }

    phase = "round-over";
    const winner = [...players.values()].find(
        player => player.online && player.active
    );

    if (winner) {
        winner.wins += 1;
    }

    broadcast({
        type: "round_result",
        round,
        winner: winner ? publicPlayer(winner) : null,
        players: lobbySnapshot()
    });

    roundTimer = setTimeout(startNextRound, 3500);
}

function startNextRound() {
    roundTimer = null;

    if (round >= totalRounds) {
        phase = "finished";
        targetId = null;
        publishArenaState();
        broadcast({
            type: "match_complete",
            players: lobbySnapshot().sort((a, b) => b.wins - a.wins)
        });

        matchResetTimer = setTimeout(resetMatch, 15000);
        return;
    }

    round += 1;
    resetPlayerPositions();
    targetId = chooseTarget();
    phase = "playing";
    publishArenaState();
}

function resetMatch() {
    matchResetTimer = null;
    phase = "lobby";
    round = 0;
    targetId = null;

    for (const player of players.values()) {
        player.quizFinished = false;
        player.ready = false;
        player.wins = 0;
        player.active = false;
    }

    publishLobby();
}

function resetRace() {
    raceResetTimer = null;
    phase = "lobby";
    raceModeSelected = false;

    for (const player of players.values()) {
        player.raceReady = false;
        player.raceFinished = false;
        player.raceCheckpoint = 0;
        player.active = false;
    }

    publishLobby();
}

function tryStartRace() {
    const roster = getConnectedPlayers();

    if (
        phase !== "lobby" ||
        roster.length < minPlayers ||
        !roster.every(player => player.raceReady)
    ) {
        broadcast({
            type: "race_readiness",
            players: lobbySnapshot(),
            requiredPlayers: minPlayers,
            phase
        });
        return;
    }

    if (matchResetTimer) {
        clearTimeout(matchResetTimer);
        matchResetTimer = null;
    }

    roster.forEach((player, index) => {
        player.active = true;
        player.raceFinished = false;
        player.raceCheckpoint = 0;
        player.boostUntil = 0;
        player.boostReadyAt = 0;
        player.moveX = 0;
        player.moveZ = 0;
        player.x = 29;
        player.z = (index - (roster.length - 1) / 2) * 3;
    });

    phase = "race-starting";
    publishRaceState();
    raceStartTimer = setTimeout(() => {
        raceStartTimer = null;
        phase = "racing";
        publishRaceState();
    }, 3000);
}

function finishRace() {
    if (phase !== "racing") return;

    phase = "race-over";
    const results = lobbySnapshot().sort((first, second) => {
        if (first.raceFinished !== second.raceFinished) {
            return first.raceFinished ? -1 : 1;
        }
        if (first.raceFinished) return first.raceFinishedAt - second.raceFinishedAt;
        return second.raceCheckpoint - first.raceCheckpoint;
    });

    broadcast({ type: "race_complete", players: results });
    publishRaceState();
    raceResetTimer = setTimeout(resetRace, 15000);
}

function tryBoost(player) {
    const now = Date.now();
    if (phase !== "racing" || !player.active || player.raceFinished || now < player.boostReadyAt) {
        return;
    }

    player.boostUntil = now + 5000;
    player.boostReadyAt = now + 20000;
    publishRaceState();
}

function tryStartMatch() {
    const roster = getConnectedPlayers();

    if (
        phase !== "lobby" ||
        roster.length < minPlayers ||
        !roster.every(player => player.quizFinished && player.ready)
    ) {
        publishReadiness();
        return;
    }

    if (matchResetTimer) {
        clearTimeout(matchResetTimer);
        matchResetTimer = null;
    }

    for (const player of roster) {
        player.wins = 0;
    }

    round = 0;
    phase = "starting";
    publishArenaState();
    roundTimer = setTimeout(startNextRound, 3000);
}

function eliminateTarget(player) {
    if (phase !== "playing" || player.id !== targetId) {
        return;
    }

    player.active = false;
    player.moveX = 0;
    player.moveZ = 0;

    broadcast({
        type: "player_eliminated",
        playerId: player.id,
        round
    });

    const activePlayers = [...players.values()].filter(
        candidate => candidate.online && candidate.active
    );

    if (activePlayers.length <= 1) {
        targetId = null;
        finishRound();
        return;
    }

    targetId = chooseTarget(player.id);
    publishArenaState();
}

function tryParry(player) {
    const now = Date.now();
    const distance = Math.hypot(
        player.x - ball.x,
        0.25,
        player.z - ball.z
    );
    const success =
        phase === "playing" &&
        targetId === player.id &&
        player.active &&
        distance <= 2 &&
        now - player.lastParryAt >= 650;

    if (success) {
        player.lastParryAt = now;
        targetId = chooseTarget(player.id);
        send(player.socket, { type: "parry_result", success: true });

        if (!targetId) {
            finishRound();
        } else {
            publishArenaState();
        }
        return;
    }

    send(player.socket, {
        type: "parry_result",
        success: false,
        distance: Number(distance.toFixed(1))
    });
}

function handleMessage(player, rawData) {
    let message;

    try {
        message = JSON.parse(rawData.toString());
    } catch {
        return;
    }

    if (message.type === "register") {
        const nick = String(message.nick || "").trim().slice(0, 20);

        if (nick.length < 2) {
            send(player.socket, { type: "error", message: "Apelido inválido." });
            return;
        }

        player.nick = nick;
        player.online = true;
        publishLobby();
        return;
    }

    if (message.type === "quiz_finished") {
        player.quizFinished = true;
        player.ready = false;
        player.score = Math.max(0, Math.min(10, Number(message.score) || 0));
        publishReadiness();
        return;
    }

    if (message.type === "ready") {
        if (player.quizFinished && phase === "lobby") {
            player.ready = Boolean(message.ready);
        }
        tryStartMatch();
        return;
    }

    if (message.type === "race_ready") {
        if (phase === "lobby") {
            raceModeSelected = true;
            player.raceReady = Boolean(message.ready);
        }
        tryStartRace();
        return;
    }

    if (message.type === "move" && (phase === "playing" || phase === "racing") && player.active) {
        const moveX = Number(message.x);
        const moveZ = Number(message.z);

        if (Number.isFinite(moveX) && Number.isFinite(moveZ)) {
            const magnitude = Math.hypot(moveX, moveZ) || 1;
            player.moveX = Math.max(-1, Math.min(1, moveX / magnitude));
            player.moveZ = Math.max(-1, Math.min(1, moveZ / magnitude));
        }
        return;
    }

    if (message.type === "boost") {
        tryBoost(player);
        return;
    }

    if (message.type === "parry") {
        tryParry(player);
    }
}

function disconnectPlayer(player) {
    if (player.socket && player.socket.readyState === WebSocket.OPEN) {
        return;
    }

    player.online = false;
    player.ready = false;

    if (phase === "playing" && player.active) {
        player.active = false;

        const activePlayers = [...players.values()].filter(
            candidate => candidate.online && candidate.active
        );

        if (activePlayers.length <= 1) {
            targetId = null;
            finishRound();
        } else if (targetId === player.id) {
            targetId = chooseTarget(player.id);
        }
    } else if (phase === "race-starting" || phase === "racing" || phase === "race-over") {
        player.active = false;
        player.moveX = 0;
        player.moveZ = 0;
        publishRaceState();
        const racersRemain = [...players.values()].some(candidate => candidate.online && candidate.active);
        if (phase === "race-starting" && !racersRemain) {
            clearTimeout(raceStartTimer);
            raceStartTimer = null;
            phase = "lobby";
            raceModeSelected = false;
            publishLobby();
        } else if (phase === "racing" && !racersRemain) {
            finishRace();
        }
    }

    if (phase === "lobby") {
        if (getConnectedPlayers().length === 0) raceModeSelected = false;
        if (raceModeSelected) {
            broadcast({
                type: "race_readiness",
                players: lobbySnapshot(),
                requiredPlayers: minPlayers,
                phase
            });
        } else {
            publishReadiness();
        }
    } else if (phase !== "race-starting" && phase !== "racing" && phase !== "race-over") {
        publishArenaState();
    }
}

function tick() {
    if (phase === "racing") {
        const now = Date.now();
        const delta = Math.min((now - previousTick) / 1000, 0.08);
        previousTick = now;

        for (const player of players.values()) {
            if (!player.online || !player.active || player.raceFinished) continue;

            const speed = now < player.boostUntil ? 12 : 6;
            player.x = Math.max(-34, Math.min(34, player.x + player.moveX * speed * delta));
            player.z = Math.max(-23, Math.min(23, player.z + player.moveZ * speed * delta));

            const checkpoint = raceCheckpoints[player.raceCheckpoint];
            if (checkpoint && Math.hypot(player.x - checkpoint.x, player.z - checkpoint.z) <= 5.5) {
                player.raceCheckpoint += 1;
            } else if (
                player.raceCheckpoint === raceCheckpoints.length &&
                Math.hypot(player.x - 27, player.z) <= 5.5
            ) {
                player.raceFinished = true;
                player.raceFinishedAt = now;
                player.moveX = 0;
                player.moveZ = 0;
            }
        }

        publishRaceState();
        const racers = [...players.values()].filter(player => player.online && player.active);
        if (racers.length && racers.every(player => player.raceFinished)) finishRace();
        return;
    }

    if (phase !== "playing" || !ballBody || !ballCollider) {
        return;
    }

    const now = Date.now();
    const delta = Math.min((now - previousTick) / 1000, 0.08);
    previousTick = now;
    const movementSpeed = 4.4;

    for (const player of players.values()) {
        if (!player.online || !player.active || !player.body) {
            continue;
        }

        let nextX = player.x + player.moveX * movementSpeed * delta;
        let nextZ = player.z + player.moveZ * movementSpeed * delta;
        const radius = Math.hypot(nextX, nextZ);

        if (radius > arenaRadius) {
            nextX = (nextX / radius) * arenaRadius;
            nextZ = (nextZ / radius) * arenaRadius;
        }

        player.x = nextX;
        player.z = nextZ;
        player.body.setNextKinematicTranslation({ x: nextX, y: 0.95, z: nextZ });
    }

    const target = players.get(targetId);

    if (target?.active) {
        const directionX = target.x - ball.x;
        const directionZ = target.z - ball.z;
        const distance = Math.hypot(directionX, directionZ) || 1;
        const speed = 5.5 + round * 0.55;
        ballBody.setLinvel({
            x: (directionX / distance) * speed,
            y: 0,
            z: (directionZ / distance) * speed
        }, true);
    }

    physicsWorld.timestep = delta;
    physicsWorld.step();

    const translation = ballBody.translation();
    ball = { x: translation.x, y: translation.y, z: translation.z };

    if (target?.collider && physicsWorld.intersectionPair(ballCollider, target.collider)) {
        eliminateTarget(target);
    }

    publishArenaState();
}

export function attachArenaWebSocket(server, { getUser }) {
    const webSocketServer = new WebSocketServer({
        noServer: true,
        maxPayload: 8 * 1024
    });

    server.on("upgrade", (request, socket, head) => {
        const url = new URL(request.url, "http://localhost");
        const origin = request.headers.origin;

        if (
            url.pathname !== "/ws/arena" ||
            !origin ||
            new URL(origin).host !== request.headers.host
        ) {
            socket.destroy();
            return;
        }

        const user = getUser(request);

        if (!user) {
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
        }

        webSocketServer.handleUpgrade(request, socket, head, webSocket => {
            const existing = players.get(user.id);

            if (existing?.socket && existing.socket !== webSocket) {
                existing.socket.close(4001, "Session opened elsewhere");
            }

            const player = existing || {
                id: user.id,
                username: user.username,
                nick: user.username,
                score: 0,
                ready: false,
                quizFinished: false,
                wins: 0,
                online: true,
                active: false,
                x: 0,
                z: 0,
                raceReady: false,
                raceCheckpoint: 0,
                raceFinished: false,
                raceFinishedAt: 0,
                boostUntil: 0,
                boostReadyAt: 0,
                moveX: 0,
                moveZ: 0,
                lastParryAt: 0,
                body: null,
                collider: null,
                socket: null
            };

            player.socket = webSocket;
            player.online = true;
            players.set(user.id, player);

            webSocket.on("message", data => handleMessage(player, data));
            webSocket.on("close", () => disconnectPlayer(player));
            webSocket.on("error", () => disconnectPlayer(player));

            send(webSocket, { type: "connected", user: publicPlayer(player) });
            publishLobby();
        });
    });

    setInterval(tick, 50);
}