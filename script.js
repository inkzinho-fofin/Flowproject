/*
============================================================
DESAFIO DE NATAL — BLOX FRUITS
SCRIPT PRINCIPAL
============================================================

Responsável por:

- Navegação entre páginas
- Cadastro dos jogadores
- Lobby
- Contagem de jogadores
- Quiz
- Pontuação
- Resultado
- Login DEV
- Painel DEV
- Lista de jogadores
- Notificações
- Preparação para Firebase

============================================================
*/


// ==========================================================
// CONFIGURAÇÕES
// ==========================================================

const CONFIG = {

    // Senha solicitada para o painel DEV
    DEV_PASSWORD: "inksuki0",

    // Quantidade mínima de jogadores
    MIN_PLAYERS: 3,

    // Tempo de cada pergunta
    QUESTION_TIME: 20,

    // Total de perguntas
    TOTAL_QUESTIONS: 10

};

const DEV_RACE_CHECKPOINTS = [
    { x: 18, z: -15 },
    { x: -18, z: -15 },
    { x: -27, z: 0 },
    { x: -18, z: 15 },
    { x: 18, z: 15 }
];


// ==========================================================
// ESTADO DO JOGO
// ==========================================================

const gameState = {

    currentPlayer: null,

    discordUser: null,

    players: {},

    currentQuestion: 0,

    score: 0,

    timer: null,

    timeLeft: CONFIG.QUESTION_TIME,

    gameStarted: false,

    testMode: false,

    testReturnState: null,

    gameSocket: null,

    pendingArenaMessages: [],

    localReady: false,

    quizScore: 0,

    arenaState: null,

    arenaResults: [],

    bladeArena: null,

    bladeArenaLoading: false,

    bladeArenaMode: null,

    selectedGame: "blade",

    raceComplete: false,

    bladeBotTest: false,

    bladeBotTestState: null,

    raceBotTest: false,

    raceBotTestState: null,

    devLogged: false,

    notifications: []

};


// ==========================================================
// PERGUNTAS
// ==========================================================

const questions = [

    // ------------------------------------------------------
    // FÁCEIS
    // ------------------------------------------------------

    {
        difficulty: "FÁCIL",

        question:
            "Quantos mares existem atualmente em Blox Fruits?",

        answers: [
            "2",
            "3",
            "4",
            "5"
        ],

        correct: 1
    },


    {
        difficulty: "FÁCIL",

        question:
            "Ao subir de nível, quantos pontos de atributo o jogador recebe?",

        answers: [
            "1",
            "2",
            "3",
            "5"
        ],

        correct: 2
    },


    {
        difficulty: "FÁCIL",

        question:
            "Qual destes é um dos mares principais de progressão?",

        answers: [
            "First Sea",
            "Fourth Sea",
            "Moon Sea",
            "Void Sea"
        ],

        correct: 0
    },


    // ------------------------------------------------------
    // MÉDIAS
    // ------------------------------------------------------

    {
        difficulty: "MÉDIA",

        question:
            "Qual nível é associado ao acesso ao Third Sea?",

        answers: [
            "700",
            "1000",
            "1500",
            "2000"
        ],

        correct: 2
    },


    {
        difficulty: "MÉDIA",

        question:
            "Em qual Sea ficam os caminhos de evolução Race V2 e V3?",

        answers: [
            "First Sea",
            "Second Sea",
            "Third Sea",
            "Nenhuma"
        ],

        correct: 1
    },


    {
        difficulty: "MÉDIA",

        question:
            "A Race V4 está ligada principalmente a qual Sea?",

        answers: [
            "First Sea",
            "Second Sea",
            "Third Sea",
            "Todas igualmente"
        ],

        correct: 2
    },


    // ------------------------------------------------------
    // DIFÍCEIS
    // ------------------------------------------------------

    {
        difficulty: "DIFÍCIL",

        question:
            "Qual destas NÃO é uma das quatro raças iniciais?",

        answers: [
            "Human",
            "Rabbit",
            "Shark",
            "Cyborg"
        ],

        correct: 3
    },


    {
        difficulty: "DIFÍCIL",

        question:
            "Qual raça é obtida por meio do puzzle relacionado ao Cyborg?",

        answers: [
            "Ghoul",
            "Cyborg",
            "Draco",
            "Angel"
        ],

        correct: 1
    },


    {
        difficulty: "DIFÍCIL",

        question:
            "Qual destas é uma raça que pode ser obtida através de uma quest própria?",

        answers: [
            "Human",
            "Angel",
            "Ghoul",
            "Rabbit"
        ],

        correct: 2
    },


    // ------------------------------------------------------
    // DESEMPATE
    // ------------------------------------------------------

    {
        difficulty: "DESEMPATE",

        question:
            "Qual destas raças NÃO faz parte das quatro raças iniciais?",

        answers: [
            "Angel",
            "Ghoul",
            "Human",
            "Shark"
        ],

        correct: 1
    }

];


// ==========================================================
// FUNÇÃO AUXILIAR
// ==========================================================

function get(id) {

    return document.getElementById(id);

}


// ==========================================================
// NAVEGAÇÃO
// ==========================================================

function showPage(pageId) {

    const pages =
        document.querySelectorAll(".page");


    pages.forEach(page => {

        page.classList.remove("active");

    });


    const page =
        get(pageId);


    if (page) {

        page.classList.add("active");

    }

}


// ==========================================================
// TOAST
// ==========================================================

function showToast(message) {

    const toast =
        get("toast");


    if (!toast) {

        return;

    }


    toast.textContent =
        message;


    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 4000);

}


// ==========================================================
// ESCAPAR HTML
// ==========================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ==========================================================
// BOTÃO — JOGADOR
// ==========================================================

get("openPlayerButton").addEventListener(
    "click",
    () => {

        showPage("registerPage");

    }
);


// ==========================================================
// BOTÃO — DEV
// ==========================================================

get("openDevButton").addEventListener(
    "click",
    () => {

        showPage("devLoginPage");

        get("devPassword").focus();

    }
);


// ==========================================================
// VOLTAR DO CADASTRO
// ==========================================================

get("backFromRegister").addEventListener(
    "click",
    () => {

        showPage("homePage");

    }
);


// ==========================================================
// VOLTAR DO LOGIN DEV
// ==========================================================

get("backFromDevLogin").addEventListener(
    "click",
    () => {

        showPage("homePage");

    }
);


// ==========================================================
// CADASTRO
// ==========================================================

get("registerForm").addEventListener(
    "submit",
    event => {

        event.preventDefault();

        registerPlayer();

    }
);


get("connectDiscordButton").addEventListener(
    "click",
    () => {

        if (!window.location.protocol.startsWith("http")) {

            get("discordConnectionMessage").textContent =
                "A conexão OAuth precisa do site aberto pelo servidor configurado.";

            return;

        }


        window.location.assign("/auth/discord");

    }
);


get("disconnectDiscordButton").addEventListener(
    "click",
    async () => {

        try {

            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin"
            });

        }

        finally {

            disconnectArenaSocket();

            setDiscordUser(null);

        }

    }
);


get("bladeReadyButton").addEventListener(
    "click",
    () => {

        gameState.localReady =
            !gameState.localReady;

        sendArenaMessage(gameState.selectedGame === "race"
            ? { type: "race_ready", ready: gameState.localReady }
            : { type: "ready", ready: gameState.localReady });

    }
);


function sendArenaMessage(message) {

    const socket =
        gameState.gameSocket;


    if (socket?.readyState === WebSocket.OPEN) {

        socket.send(JSON.stringify(message));

    }

    else {

        gameState.pendingArenaMessages.push(message);

    }

}


function disconnectArenaSocket() {

    const socket =
        gameState.gameSocket;

    gameState.gameSocket =
        null;

    gameState.pendingArenaMessages =
        [];


    if (
        socket &&
        socket.readyState < WebSocket.CLOSING
    ) {

        socket.close();

    }

}


function connectArenaSocket(nick) {

    if (!gameState.discordUser) {

        return;

    }


    if (
        gameState.gameSocket?.readyState === WebSocket.OPEN
    ) {

        sendArenaMessage({
            type: "register",
            nick
        });

        return;

    }


    const protocol =
        window.location.protocol === "https:"
            ? "wss:"
            : "ws:";

    const socket =
        new WebSocket(`${protocol}//${window.location.host}/ws/arena`);


    gameState.gameSocket =
        socket;


    socket.addEventListener(
        "open",
        () => {

            sendArenaMessage({
                type: "register",
                nick
            });

            gameState.pendingArenaMessages
                .splice(0)
                .forEach(sendArenaMessage);

        }
    );


    socket.addEventListener(
        "message",
        event => {

            try {

                handleArenaMessage(
                    JSON.parse(event.data)
                );

            }

            catch {

                showToast(
                    "Não foi possível atualizar a sala da arena."
                );

            }

        }
    );


    socket.addEventListener(
        "close",
        () => {

            if (gameState.gameSocket === socket) {

                gameState.gameSocket = null;

            }


            if (get("bladeReadyPage").classList.contains("active")) {

                get("bladeReadyStatus").textContent =
                    "Conexão perdida. Reconecte-se para continuar.";

                get("bladeReadyButton").disabled =
                    true;

            }

        }
    );

}


function handleArenaMessage(message) {

    if (message.type === "lobby_state") {

        gameState.players =
            Object.fromEntries(
                message.players.map(player => [player.id, player])
            );

        updateLobby();
        updateDevPanel();

        if (gameState.raceComplete) {
            gameState.raceComplete = false;
            gameState.selectedGame = "blade";
            gameState.bladeArena?.destroy();
            gameState.bladeArena = null;
            gameState.bladeArenaMode = null;
            get("raceCompleteOverlay").hidden = true;
            showPage("lobbyPage");
        }

        return;

    }


    if (message.type === "readiness") {

        gameState.selectedGame = "blade";

        gameState.arenaResults =
            message.players;

        if (!gameState.bladeBotTest) {

            gameState.players =
                Object.fromEntries(
                    message.players.map(player => [player.id, player])
                );

        }

        gameState.currentPlayer =
            gameState.players[gameState.discordUser?.id] ||
            gameState.currentPlayer;

        renderBladeReadiness(
            message
        );

        return;

    }

    if (message.type === "race_readiness") {
        gameState.selectedGame = "race";
        gameState.arenaResults = message.players || [];
        gameState.players = Object.fromEntries(message.players.map(player => [player.id, player]));
        gameState.currentPlayer = gameState.players[gameState.discordUser?.id] || gameState.currentPlayer;
        renderBladeReadiness(message, "race");
        showPage("bladeReadyPage");
        return;
    }


    if (message.type === "arena_state") {

        gameState.arenaState =
            message;

        renderArenaStatus(message);

        if (message.phase === "starting" || message.phase === "playing" || message.phase === "round-over") {

            showPage("bladeArenaPage");

            if (!gameState.bladeArena && !gameState.bladeArenaLoading) {

                gameState.bladeArenaLoading = true;

                import("./blade-game.js")
                    .then(module => {

                        gameState.bladeArena =
                            module.createBladeArena({
                                canvas: get("bladeArenaCanvas"),
                                localPlayerId: gameState.discordUser.id,
                                send: sendArenaMessage
                            });

                        gameState.bladeArenaLoading = false;

                        gameState.bladeArena.update(
                            gameState.arenaState
                        );

                    })
                    .catch(() => {

                        gameState.bladeArenaLoading = false;

                        get("arenaAnnouncement").textContent =
                            "Não foi possível carregar a arena 3D.";

                    });

            }

            else {

                gameState.bladeArena?.update(message);

            }

        }

        return;

    }


    if (message.type === "race_state") {
        gameState.arenaState = message;
        renderRaceStatus(message);
        showPage("bladeArenaPage");

        if (gameState.bladeArenaMode !== "race" && !gameState.bladeArenaLoading) {
            gameState.bladeArena?.destroy();
            gameState.bladeArena = null;
            gameState.bladeArenaLoading = true;
            import("./blade-game.js")
                .then(module => {
                    gameState.bladeArena = module.createBladeArena({
                        canvas: get("bladeArenaCanvas"),
                        localPlayerId: gameState.discordUser.id,
                        send: sendArenaMessage,
                        mode: "race"
                    });
                    gameState.bladeArenaMode = "race";
                    gameState.bladeArenaLoading = false;
                    gameState.bladeArena.update(gameState.arenaState);
                })
                .catch(() => {
                    gameState.bladeArenaLoading = false;
                    get("arenaAnnouncement").textContent = "Não foi possível carregar a pista 3D.";
                });
        } else {
            gameState.bladeArena?.update(message);
        }
        return;
    }

    if (message.type === "race_complete") {
        gameState.raceComplete = true;
        get("raceFinishRanking").innerHTML = message.players.map((player, index) => `
            <div class="race-finish-row">
                <span>#${index + 1}</span>
                <strong>${escapeHTML(player.nick)}</strong>
                <small>${player.raceFinished ? "Finalizou" : `Checkpoint ${player.raceCheckpoint}/5`}</small>
            </div>
        `).join("");
        get("raceCompleteOverlay").hidden = false;
        get("arenaAnnouncement").textContent = "Classificação final";
        return;
    }

    if (message.type === "player_eliminated") {

        const eliminated =
            message.playerId === gameState.discordUser?.id;

        get("arenaAnnouncement").textContent = eliminated
            ? "Você foi eliminado desta rodada. Aguarde a próxima."
            : `${gameState.players[message.playerId]?.nick || "Um jogador"} foi eliminado da rodada.`;

        return;

    }


    if (message.type === "round_result") {

        const winnerName =
            message.winner?.nick || "Ninguém";

        get("arenaPhaseLabel").textContent =
            "Fim da rodada";

        get("arenaAnnouncement").textContent =
            `${winnerName} venceu a rodada ${message.round}.`;

        return;

    }


    if (message.type === "parry_result") {

        get("arenaAnnouncement").textContent = message.success
            ? "Rebatida! A bola mudou de alvo."
            : `Espere a bola se aproximar a 2 m. Distância: ${message.distance ?? "--"} m.`;

        return;

    }


    if (message.type === "match_complete") {

        gameState.arenaResults =
            message.players;

        gameState.players =
            Object.fromEntries(
                message.players.map(player => [player.id, player])
            );

        get("bladeResultPlayerList").innerHTML =
            message.players.map((player, index) => `
                <div class="player-card">
                    <span class="ranking-position">#${index + 1}</span>
                    <div class="ranking-name">
                        <strong>${escapeHTML(player.nick)}</strong>
                        <small>@${escapeHTML(player.username)}</small>
                    </div>
                    <strong class="ranking-score">${player.wins} / 5</strong>
                </div>
            `).join("");

        get("bladeResultRanking").hidden =
            false;

        const localPlayerId =
            gameState.bladeBotTest
                ? gameState.bladeBotTestState?.localPlayerId
                : gameState.discordUser?.id;

        const localResult =
            message.players.find(
                player => player.id === localPlayerId
            );

        get("playerBladeWins").textContent =
            `${localResult?.wins || 0} / 5`;

        get("bladeResultMessage").textContent =
            localResult?.wins === 5
                ? "Campeão da arena"
                : "Vitórias na arena";

        if (gameState.bladeBotTest && gameState.bladeBotTestState) {

            clearInterval(gameState.bladeBotTestState.interval);
            clearTimeout(gameState.bladeBotTestState.transitionTimer);

        }


        gameState.bladeArena?.destroy();
        gameState.bladeArena = null;
        gameState.bladeArenaLoading = false;

        if (gameState.bladeBotTest) {

            get("quizScoreBox").hidden = true;
            get("resultMessage").hidden = true;
            get("questionResultTitle").hidden = true;
            get("resultPlayerList").hidden = true;
            get("resultTitle").textContent =
                "Blade Ball finalizado!";
            get("resultSubtitle").textContent =
                "Resultado das cinco rodadas contra os bots.";

        }

        else {

            updateResultRanking();

        }

        showPage("resultPage");

    }

}


function renderBladeReadiness(message, mode = "blade") {

    const players =
        message.players || [];

    const isRace = mode === "race";
    const readyPlayers = players.filter(player => isRace ? player.raceReady : player.ready).length;

    const localPlayer =
        players.find(player => player.id === gameState.discordUser?.id);


    gameState.localReady = Boolean(isRace ? localPlayer?.raceReady : localPlayer?.ready);

    get("readyModeIcon").textContent = isRace ? "🏁" : "⚔️";
    get("readyModeTitle").textContent = isRace ? "Preparados para a corrida?" : "Todos estão prontos?";
    get("readyModeDescription").textContent = isRace
        ? "Complete os checkpoints na pista. Espaço ou o botão de impulso acelera por 5 segundos e recarrega em 20."
        : "Depois da confirmação de todos, começa a arena 3D com 5 rodadas.";


    get("bladeReadyCount").textContent =
        `${readyPlayers} / ${players.length || message.requiredPlayers}`;

    get("bladeReadyPlayers").innerHTML =
        players.map(player => {

            const isReady = isRace ? player.raceReady : player.ready;
            const status = isReady
                ? "Pronto"
                : isRace || player.quizFinished
                    ? "Aguardando confirmação"
                    : "Terminando o quiz";

            return `
                <div class="ready-player-row">
                    <span>${escapeHTML(player.nick)}</span>
                    <small>@${escapeHTML(player.username)} · ${status}</small>
                </div>
            `;

        }).join("") || "<p class=\"empty-message\">Nenhum jogador conectado.</p>";


    const canConfirm =
        (isRace || Boolean(localPlayer?.quizFinished)) &&
        message.phase === "lobby" &&
        gameState.gameSocket?.readyState === WebSocket.OPEN;

    get("bladeReadyButton").disabled =
        !canConfirm;

    get("bladeReadyButton").textContent =
        gameState.localReady
            ? "Cancelar prontidão"
            : "Estou pronto";


    if (players.length < message.requiredPlayers) {

        get("bladeReadyStatus").textContent =
            `Aguardando ${message.requiredPlayers - players.length} jogador(es) para completar a sala.`;

    }

    else if (readyPlayers === players.length && (isRace || players.every(player => player.quizFinished))) {

        get("bladeReadyStatus").textContent =
            isRace ? "Todos prontos. Preparando a largada..." : "Todos prontos. Preparando a arena...";

    }

    else {

        get("bladeReadyStatus").textContent =
            isRace
                ? `Prontos: ${readyPlayers} de ${players.length}. A largada acontece quando todos confirmarem.`
                : `Prontos: ${readyPlayers} de ${players.length}. A partida começa quando todos terminarem o quiz e confirmarem.`;

    }

}


function renderRaceStatus(state) {
    const localPlayer = (state.players || []).find(player => player.id === gameState.discordUser?.id);
    get("arenaRoundStatus").hidden = true;
    get("raceHud").hidden = false;
    get("raceProgressLabel").textContent = `Checkpoint ${Math.min(localPlayer?.raceCheckpoint || 0, state.totalCheckpoints)} / ${state.totalCheckpoints}`;

    const now = Date.now();
    const boostReadyAt = localPlayer?.boostReadyAt || 0;
    const boostUntil = localPlayer?.boostUntil || 0;
    get("boostStatusLabel").textContent = now < boostUntil
        ? `Impulso ativo: ${Math.ceil((boostUntil - now) / 1000)}s`
        : now < boostReadyAt
            ? `Recarga: ${Math.ceil((boostReadyAt - now) / 1000)}s`
            : "Impulso pronto · 5s";

    get("arenaPhaseLabel").textContent = state.phase === "race-starting"
        ? "Na linha de largada"
        : state.phase === "race-over"
            ? "Corrida encerrada"
            : "Correndo";
    get("arenaAnnouncement").textContent = localPlayer?.raceFinished
        ? "Você cruzou a linha de chegada!"
        : "";
}


function renderArenaStatus(state) {

    get("arenaRoundStatus").hidden = false;
    get("raceHud").hidden = true;

    get("arenaRoundLabel").textContent =
        `Rodada ${Math.max(state.round, 1)} / ${state.totalRounds}`;

    if (state.phase === "starting") {

        get("arenaPhaseLabel").textContent =
            "Prepare-se";

    }

    else if (state.phase === "round-over") {

        get("arenaPhaseLabel").textContent =
            "Fim da rodada";

    }

    else {

        get("arenaPhaseLabel").textContent =
            "Em jogo";

    }

}


function setDiscordUser(user) {

    gameState.discordUser = user
        ? {
            id: String(user.id),
            username: String(user.username)
        }
        : null;


    const isConnected =
        Boolean(gameState.discordUser);


    get("connectDiscordButton").hidden =
        isConnected;

    get("discordIdentity").hidden =
        !isConnected;

    get("joinGameButton").disabled =
        !isConnected;


    if (isConnected) {

        get("discordUsername").textContent =
            `@${gameState.discordUser.username}`;

        get("discordUserId").textContent =
            gameState.discordUser.id;

        get("discordConnectionMessage").textContent =
            "Conta confirmada pelo Discord.";

        const savedNick =
            localStorage.getItem(`player-nick-${gameState.discordUser.id}`);

        if (savedNick) {

            connectArenaSocket(savedNick);

        }

    }

    else {

        get("discordConnectionMessage").textContent =
            "Conecte uma conta Discord para confirmar sua identidade.";

    }

}


async function restoreDiscordSession() {

    setDiscordUser(null);


    const params =
        new URLSearchParams(window.location.search);

    const authError =
        params.get("discord_error");


    if (authError) {

        const errorMessages = {
            cancelled:
                "A conexão com o Discord foi cancelada.",
            not_configured:
                "Configure as variáveis OAuth do Discord no servidor.",
            invalid_state:
                "A conexão expirou. Tente conectar novamente.",
            oauth_failed:
                "Não foi possível confirmar a conta Discord. Tente novamente."
        };


        get("discordConnectionMessage").textContent =
            errorMessages[authError] ||
            errorMessages.oauth_failed;

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );

    }


    try {

        const response =
            await fetch("/api/auth/me", {
                credentials: "same-origin"
            });


        if (!response.ok) {

            return;

        }


        const user =
            await response.json();


        setDiscordUser(user);

    }

    catch {

        get("discordConnectionMessage").textContent =
            "A confirmação do Discord ficará disponível quando o site estiver conectado ao servidor.";

    }

}


function registerPlayer() {

    const discordUser =
        gameState.discordUser;


    const nick =
        get("playerNick").value.trim();


    const message =
        get("registerMessage");


    // ------------------------------------------------------
    // VALIDAR CONTA DISCORD
    // ------------------------------------------------------

    if (!discordUser) {

        message.textContent =
            "❌ Conecte e confirme sua conta Discord antes de entrar.";

        return;

    }


    // ------------------------------------------------------
    // VALIDAR NICK
    // ------------------------------------------------------

    if (nick.length < 2) {

        message.textContent =
            "❌ Digite um nick válido.";

        return;

    }


    // ------------------------------------------------------
    // CRIAR JOGADOR
    // ------------------------------------------------------

    gameState.currentPlayer = {

        id: discordUser.id,

        discordUsername: discordUser.username,

        nick: nick,

        score: 0,

        online: true,

        joinedAt: Date.now()

    };


    // ------------------------------------------------------
    // ADICIONAR AO LOBBY LOCAL
    // ------------------------------------------------------

    gameState.players[discordUser.id] =
        gameState.currentPlayer;

    localStorage.setItem(
        `player-nick-${discordUser.id}`,
        nick
    );

    connectArenaSocket(nick);


    message.textContent = "";


    updateLobby();


    updateDevPanel();


    showPage("lobbyPage");


    showToast(
        `🎮 ${nick} entrou no lobby!`
    );


    /*
    ========================================================
    FUTURO FIREBASE

    Aqui posteriormente vamos registrar:

    rooms/
       natal-blox-fruits-2026/
           players/
               DISCORD_ID/

    ========================================================
    */

}


// ==========================================================
// ATUALIZAR LOBBY
// ==========================================================

function updateLobby() {

    const players =
        Object.values(
            gameState.players
        );


    // ------------------------------------------------------
    // CONTADOR
    // ------------------------------------------------------

    get("onlineCount").textContent =
        `${players.length} jogador(es) online`;


    // ------------------------------------------------------
    // INDICADOR
    // ------------------------------------------------------

    const indicator =
        get("onlineIndicator");


    if (players.length >= CONFIG.MIN_PLAYERS) {

        indicator.classList.add("on");

    } else {

        indicator.classList.remove("on");

    }


    // ------------------------------------------------------
    // LISTA
    // ------------------------------------------------------

    const list =
        get("playerList");


    if (players.length === 0) {

        list.innerHTML = `
            <p class="empty-message">
                Nenhum jogador conectado.
            </p>
        `;

        return;

    }


    list.innerHTML =
        players.map(player => {

            return `

                <div class="player-card">

                    <div class="player-avatar">
                        👤
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(player.nick)}
                        </strong>

                        <small>
                            @${escapeHTML(player.discordUsername)}
                        </small>

                        <small>
                            Discord ID:
                            ${escapeHTML(player.id)}
                        </small>

                    </div>

                    <span class="online">
                        ● ONLINE
                    </span>

                </div>

            `;

        }).join("");


    updateStartButton();

}


// ==========================================================
// BOTÃO COMEÇAR
// ==========================================================

function updateStartButton() {

    const button =
        get("startGameButton");


    const count =
        Object.keys(
            gameState.players
        ).length;

    const raceButton = get("startRaceButton");
    raceButton.disabled = count < CONFIG.MIN_PLAYERS || gameState.gameStarted;


    if (
        count >= CONFIG.MIN_PLAYERS &&
        !gameState.gameStarted
    ) {

        button.disabled = false;

        button.innerHTML =
            "🚀 Começar Parte 1";


        get("lobbyMessage").textContent =
            "✅ Jogadores suficientes! O desafio pode começar.";

    }

    else {

        button.disabled = true;

        button.innerHTML =
            `🔒 Aguardando ${CONFIG.MIN_PLAYERS} jogadores...`;

        get("lobbyMessage").textContent =
            `É necessário ter pelo menos ${CONFIG.MIN_PLAYERS} jogadores online.`;

    }

}


// ==========================================================
// INICIAR JOGO
// ==========================================================

get("startGameButton").addEventListener(
    "click",
    startGame
);

get("startRaceButton").addEventListener("click", () => {
    if (Object.keys(gameState.players).length < CONFIG.MIN_PLAYERS) return;

    gameState.selectedGame = "race";
    gameState.localReady = false;
    get("readyModeIcon").textContent = "🏁";
    get("readyModeTitle").textContent = "Preparados para a corrida?";
    get("readyModeDescription").textContent = "Complete os checkpoints na pista. Espaço ou o botão de impulso acelera por 5 segundos e recarrega em 20.";
    get("bladeReadyButton").disabled = gameState.gameSocket?.readyState !== WebSocket.OPEN;
    get("bladeReadyButton").textContent = "Estou pronto";
    showPage("bladeReadyPage");
    sendArenaMessage({ type: "race_ready", ready: false });
});


get("startDevTestButton").addEventListener(
    "click",
    startDevTestGame
);


get("startDevBladeBotTestButton").addEventListener(
    "click",
    startDevBladeBotTest
);

get("startDevRaceBotTestButton").addEventListener(
    "click",
    startDevRaceBotTest
);


get("exitDevTestButton").addEventListener(
    "click",
    exitDevTest
);


function startDevTestGame() {

    if (gameState.gameStarted) {

        showToast(
            "❌ Aguarde a partida atual terminar antes de iniciar um teste."
        );

        return;

    }


    gameState.testReturnState = {
        currentPlayer: gameState.currentPlayer,
        currentQuestion: gameState.currentQuestion,
        score: gameState.score,
        timeLeft: gameState.timeLeft
    };

    gameState.testMode = true;

    gameState.currentPlayer = {
        id: "dev-test-player",
        nick: "Teste DEV",
        discordUsername: "modo-teste",
        score: 0,
        online: false,
        joinedAt: Date.now()
    };

    gameState.gameStarted = true;
    gameState.currentQuestion = 0;
    gameState.score = 0;

    get("exitDevTestButton").hidden = false;

    showPage("quizPage");

    loadQuestion();

}


function exitDevTest() {

    if (!gameState.testMode) {

        return;

    }


    clearInterval(gameState.timer);

    gameState.gameStarted = false;
    gameState.testMode = false;


    if (gameState.testReturnState) {

        gameState.currentPlayer =
            gameState.testReturnState.currentPlayer;

        gameState.currentQuestion =
            gameState.testReturnState.currentQuestion;

        gameState.score =
            gameState.testReturnState.score;

        gameState.timeLeft =
            gameState.testReturnState.timeLeft;

    }


    gameState.testReturnState = null;

    get("exitDevTestButton").hidden = true;

    updateDevPanel();

    showPage("devPage");

}


function startDevBladeBotTest() {

    if (
        gameState.gameStarted ||
        gameState.bladeBotTest ||
        gameState.raceBotTest ||
        gameState.arenaState?.phase === "playing" ||
        gameState.arenaState?.phase === "race-starting" ||
        gameState.arenaState?.phase === "racing"
    ) {

        showToast(
            "❌ Termine a partida atual antes de iniciar o teste solo."
        );

        return;

    }


    const localPlayerId =
        "dev-bot-test-player";

    const roster = [
        {
            id: localPlayerId,
            username: "DEV",
            nick: "Você",
            isBot: false
        },
        {
            id: "dev-bot-1",
            username: "bot_celeste",
            nick: "Bot Celeste",
            isBot: true
        },
        {
            id: "dev-bot-2",
            username: "bot_ember",
            nick: "Bot Ember",
            isBot: true
        },
        {
            id: "dev-bot-3",
            username: "bot_vortex",
            nick: "Bot Vortex",
            isBot: true
        }
    ].map((player, index, players) => {

        const angle =
            (Math.PI * 2 * index) / players.length;

        return {
            ...player,
            score: 0,
            wins: 0,
            ready: true,
            quizFinished: true,
            active: true,
            x: Math.cos(angle) * 5.4,
            z: Math.sin(angle) * 5.4,
            angle,
            moveX: 0,
            moveZ: 0,
            changeDirectionAt: 0,
            movementSpeed: 1.7 + Math.random() * 1.1,
            nextParryAt: 0
        };

    });


    const state = {
        phase: "starting",
        round: 0,
        totalRounds: 5,
        targetId: null,
        ball: { x: 0, y: 1.2, z: 0 },
        players: roster,
        lastTick: Date.now(),
        roundEndsAt: 0,
        interval: null,
        transitionTimer: null,
        localPlayerId
    };

    gameState.bladeBotTest =
        true;

    gameState.bladeBotTestState =
        state;

    get("exitDevBladeBotTestButton").hidden =
        false;

    get("bladeArenaPage").classList.add("dev-bot-test");

    get("arenaAnnouncement").textContent =
        "Prepare-se. Você enfrentará 3 bots em 5 rodadas.";

    showPage("bladeArenaPage");


    gameState.bladeArenaLoading =
        true;

    import("./blade-game.js")
        .then(module => {

            gameState.bladeArenaLoading =
                false;

            if (!gameState.bladeBotTest) {

                return;

            }


            gameState.bladeArena =
                module.createBladeArena({
                    canvas: get("bladeArenaCanvas"),
                    localPlayerId,
                    send: handleDevBladeBotInput
                });

            startDevBladeBotRound();

            state.interval =
                setInterval(updateDevBladeBotTest, 50);

        })
        .catch(() => {

            gameState.bladeArenaLoading =
                false;

            get("arenaAnnouncement").textContent =
                "Não foi possível carregar a arena 3D. Verifique sua conexão e tente novamente.";

        });

}


function startDevRaceBotTest() {
    if (
        gameState.gameStarted ||
        gameState.bladeBotTest ||
        gameState.raceBotTest ||
        gameState.arenaState?.phase === "playing" ||
        gameState.arenaState?.phase === "race-starting" ||
        gameState.arenaState?.phase === "racing"
    ) {
        showToast("❌ Termine a partida atual antes de iniciar o teste de corrida.");
        return;
    }

    const localPlayerId = "dev-race-test-player";
    const roster = [
        { id: localPlayerId, username: "DEV", nick: "Você", isBot: false },
        { id: "dev-race-bot-1", username: "bot_celeste", nick: "Bot Celeste", isBot: true },
        { id: "dev-race-bot-2", username: "bot_ember", nick: "Bot Ember", isBot: true },
        { id: "dev-race-bot-3", username: "bot_vortex", nick: "Bot Vortex", isBot: true }
    ].map((player, index, players) => ({
        ...player,
        active: true,
        x: 29,
        z: (index - (players.length - 1) / 2) * 3,
        raceCheckpoint: 0,
        raceFinished: false,
        raceFinishedAt: 0,
        boostUntil: 0,
        boostReadyAt: 0,
        moveX: 0,
        moveZ: 0,
        movementSpeed: player.isBot ? 4.8 + Math.random() * 1.1 : 6
    }));

    const state = {
        phase: "race-starting",
        totalCheckpoints: DEV_RACE_CHECKPOINTS.length,
        finish: { x: 27, z: 0 },
        players: roster,
        lastTick: Date.now(),
        startedAt: 0,
        interval: null,
        transitionTimer: null,
        localPlayerId
    };

    gameState.raceBotTest = true;
    gameState.raceBotTestState = state;
    gameState.bladeArenaLoading = true;
    get("exitDevBladeBotTestButton").hidden = false;
    get("bladeArenaPage").classList.add("dev-bot-test", "race-mode");
    get("raceCompleteOverlay").hidden = true;
    get("raceCompletePanel").textContent = "Preparando a corrida...";
    get("arenaAnnouncement").textContent = "Você contra 3 bots. Passe por todos os checkpoints e complete o circuito.";
    renderDevRaceBotStatus(state);
    showPage("bladeArenaPage");

    import("./blade-game.js")
        .then(module => {
            gameState.bladeArenaLoading = false;
            if (!gameState.raceBotTest) return;

            gameState.bladeArena = module.createBladeArena({
                canvas: get("bladeArenaCanvas"),
                localPlayerId,
                send: handleDevRaceBotInput,
                mode: "race"
            });
            gameState.bladeArenaMode = "race";
            gameState.bladeArena.update(state);

            state.transitionTimer = setTimeout(() => {
                if (!gameState.raceBotTest) return;
                state.phase = "racing";
                state.startedAt = Date.now();
                state.lastTick = state.startedAt;
                renderDevRaceBotStatus(state);
                state.interval = setInterval(updateDevRaceBotTest, 50);
            }, 2500);
        })
        .catch(() => {
            gameState.bladeArenaLoading = false;
            gameState.raceBotTest = false;
            gameState.raceBotTestState = null;
            get("exitDevBladeBotTestButton").hidden = true;
            get("bladeArenaPage").classList.remove("dev-bot-test", "race-mode");
            get("arenaAnnouncement").textContent = "Não foi possível carregar a pista 3D.";
            showPage("devPage");
        });
}


function handleDevRaceBotInput(message) {
    const state = gameState.raceBotTestState;
    if (!gameState.raceBotTest || !state || state.phase !== "racing") return;

    const localPlayer = state.players.find(player => player.id === state.localPlayerId);
    if (!localPlayer || localPlayer.raceFinished) return;

    if (message.type === "move") {
        localPlayer.moveX = Number(message.x) || 0;
        localPlayer.moveZ = Number(message.z) || 0;
    } else if (message.type === "boost" && Date.now() >= localPlayer.boostReadyAt) {
        localPlayer.boostUntil = Date.now() + 5000;
        localPlayer.boostReadyAt = Date.now() + 20000;
    }
}


function updateDevRaceBotTest() {
    const state = gameState.raceBotTestState;
    if (!gameState.raceBotTest || !state || state.phase !== "racing") return;

    const now = Date.now();
    const delta = Math.min((now - state.lastTick) / 1000, 0.08);
    state.lastTick = now;

    for (const player of state.players) {
        if (player.raceFinished) continue;

        const target = DEV_RACE_CHECKPOINTS[player.raceCheckpoint] || state.finish;
        const dx = target.x - player.x;
        const dz = target.z - player.z;
        const distance = Math.hypot(dx, dz) || 1;

        if (player.isBot) {
            player.moveX = dx / distance;
            player.moveZ = dz / distance;
            if (distance > 10 && now >= player.boostReadyAt) {
                player.boostUntil = now + 5000;
                player.boostReadyAt = now + 20000;
            }
        }

        const speed = now < player.boostUntil ? 12 : player.movementSpeed;
        player.x = Math.max(-34, Math.min(34, player.x + player.moveX * speed * delta));
        player.z = Math.max(-23, Math.min(23, player.z + player.moveZ * speed * delta));

        const checkpoint = DEV_RACE_CHECKPOINTS[player.raceCheckpoint];
        if (checkpoint && Math.hypot(player.x - checkpoint.x, player.z - checkpoint.z) <= 5.5) {
            player.raceCheckpoint += 1;
        } else if (
            player.raceCheckpoint === DEV_RACE_CHECKPOINTS.length &&
            Math.hypot(player.x - state.finish.x, player.z - state.finish.z) <= 5.5
        ) {
            player.raceFinished = true;
            player.raceFinishedAt = now;
            player.moveX = 0;
            player.moveZ = 0;
        }
    }

    gameState.bladeArena?.update(state);
    renderDevRaceBotStatus(state);

    if (state.players.every(player => player.raceFinished) || now - state.startedAt >= 120000) {
        finishDevRaceBotTest();
    }
}


function renderDevRaceBotStatus(state) {
    const localPlayer = state.players.find(player => player.id === state.localPlayerId);
    get("arenaRoundStatus").hidden = true;
    get("raceHud").hidden = false;
    get("raceProgressLabel").textContent = `Checkpoint ${Math.min(localPlayer.raceCheckpoint, state.totalCheckpoints)} / ${state.totalCheckpoints}`;

    const now = Date.now();
    get("boostStatusLabel").textContent = now < localPlayer.boostUntil
        ? `Impulso ativo: ${Math.ceil((localPlayer.boostUntil - now) / 1000)}s`
        : now < localPlayer.boostReadyAt
            ? `Recarga: ${Math.ceil((localPlayer.boostReadyAt - now) / 1000)}s`
            : "Impulso pronto · 5s";
    get("arenaPhaseLabel").textContent = state.phase === "race-starting"
        ? "Na linha de largada"
        : state.phase === "race-over"
            ? "Teste finalizado"
            : "Correndo contra bots";
}


function finishDevRaceBotTest() {
    const state = gameState.raceBotTestState;
    if (!state || state.phase !== "racing") return;

    state.phase = "race-over";
    clearInterval(state.interval);
    const results = [...state.players].sort((first, second) => {
        if (first.raceFinished !== second.raceFinished) return first.raceFinished ? -1 : 1;
        if (first.raceFinished) return first.raceFinishedAt - second.raceFinishedAt;
        return second.raceCheckpoint - first.raceCheckpoint;
    });

    get("raceCompletePanel").textContent = "Resultado do teste";
    get("raceFinishRanking").innerHTML = results.map((player, index) => `
        <div class="race-finish-row">
            <span>#${index + 1}</span>
            <strong>${escapeHTML(player.nick)}</strong>
            <small>${player.raceFinished ? `${((player.raceFinishedAt - state.startedAt) / 1000).toFixed(1)}s` : `Checkpoint ${player.raceCheckpoint}/5`}</small>
        </div>
    `).join("");
    get("raceCompleteOverlay").hidden = false;
    renderDevRaceBotStatus(state);
}


function chooseDevBladeTarget(excludedId = null) {

    const state =
        gameState.bladeBotTestState;

    const candidates =
        state.players.filter(
            player => player.active && player.id !== excludedId
        );


    return candidates.length
        ? candidates[Math.floor(Math.random() * candidates.length)].id
        : null;

}


function updateDevBladeBotArena() {

    const state =
        gameState.bladeBotTestState;


    if (state && gameState.bladeArena) {

        gameState.bladeArena.update(state);

    }

}


function chooseDevBotDirection(player, now) {

    const angle =
        Math.random() * Math.PI * 2;

    player.moveX =
        Math.cos(angle);

    player.moveZ =
        Math.sin(angle);

    player.changeDirectionAt =
        now + 700 + Math.random() * 2200;

}


function startDevBladeBotRound() {

    const state =
        gameState.bladeBotTestState;


    if (!gameState.bladeBotTest || !state) {

        return;

    }


    state.round++;
    state.phase = "playing";
    state.lastTick = Date.now();
    state.roundEndsAt = state.lastTick + 30000;
    state.ball = { x: 0, y: 1.2, z: 0 };

    state.players.forEach((player, index) => {

        const angle =
            (Math.PI * 2 * index) / state.players.length;

        player.angle = angle;
        player.x = Math.cos(angle) * 5.4;
        player.z = Math.sin(angle) * 5.4;
        player.active = true;
        player.changeDirectionAt = 0;
        player.nextParryAt = Date.now() + 1200 + index * 450;

    });

    state.targetId =
        chooseDevBladeTarget();

    renderArenaStatus(state);
    get("arenaAnnouncement").textContent =
        `Rodada ${state.round}: sobreviva e rebata quando a bola chegar a 2 m.`;

    updateDevBladeBotArena();

}


function handleDevBladeBotInput(message) {

    const state =
        gameState.bladeBotTestState;


    if (!state || state.phase !== "playing") {

        return;

    }


    const localPlayer =
        state.players.find(
            player => player.id === state.localPlayerId
        );


    if (message.type === "move" && localPlayer?.active) {

        let nextX =
            localPlayer.x + Number(message.x || 0) * 4.4 * 0.065;

        let nextZ =
            localPlayer.z + Number(message.z || 0) * 4.4 * 0.065;

        const radius =
            Math.hypot(nextX, nextZ);


        if (radius > 8) {

            nextX = (nextX / radius) * 8;
            nextZ = (nextZ / radius) * 8;

        }


        localPlayer.x = nextX;
        localPlayer.z = nextZ;

        return;

    }


    if (message.type === "parry") {

        const distance =
            Math.hypot(
                localPlayer.x - state.ball.x,
                0.25,
                localPlayer.z - state.ball.z
            );

        if (
            localPlayer.active &&
            state.targetId === localPlayer.id &&
            distance <= 2
        ) {

            state.targetId =
                chooseDevBladeTarget(localPlayer.id);

            get("arenaAnnouncement").textContent =
                state.targetId
                    ? "Rebatida! A bola mudou de alvo."
                    : "Rebatida perfeita! Você venceu a rodada.";

            if (!state.targetId) {

                finishDevBladeBotRound(localPlayer);

            }

        }

        else {

            get("arenaAnnouncement").textContent =
                `Aguarde a bola chegar a 2 m. Distância: ${distance.toFixed(1)} m.`;

        }


        updateDevBladeBotArena();

    }

}


function updateDevBladeBotTest() {

    const state =
        gameState.bladeBotTestState;


    if (!gameState.bladeBotTest || !state || state.phase !== "playing") {

        return;

    }


    const now =
        Date.now();

    const delta =
        Math.min((now - state.lastTick) / 1000, 0.08);

    state.lastTick = now;


    for (const player of state.players) {

        if (!player.isBot || !player.active) {

            continue;

        }


        if (now >= player.changeDirectionAt) {

            chooseDevBotDirection(player, now);

        }


        let nextX =
            player.x + player.moveX * player.movementSpeed * delta;

        let nextZ =
            player.z + player.moveZ * player.movementSpeed * delta;

        const radius =
            Math.hypot(nextX, nextZ);


        if (radius >= 7.35) {

            nextX = (nextX / radius) * 7.35;
            nextZ = (nextZ / radius) * 7.35;
            chooseDevBotDirection(player, now);

        }


        player.x = nextX;
        player.z = nextZ;

    }


    const target =
        state.players.find(
            player => player.id === state.targetId && player.active
        );


    if (target) {

        const dx =
            target.x - state.ball.x;

        const dz =
            target.z - state.ball.z;

        const distance =
            Math.hypot(dx, dz) || 1;


        if (
            target.isBot &&
            distance <= 2 &&
            now >= target.nextParryAt
        ) {

            target.nextParryAt =
                now + 1000 + Math.random() * 900;

            state.targetId =
                chooseDevBladeTarget(target.id);

            get("arenaAnnouncement").textContent =
                `${target.nick} rebateu a bola!`;

        }

        else {

            const speed =
                5.2 + state.round * 0.35;

            state.ball.x +=
                (dx / distance) * speed * delta;

            state.ball.z +=
                (dz / distance) * speed * delta;

            if (distance <= 0.78) {

                target.active = false;

                get("arenaAnnouncement").textContent =
                    `${target.nick} foi eliminado da rodada.`;

                state.targetId =
                    chooseDevBladeTarget(target.id);

                const remaining =
                    state.players.filter(player => player.active);

                if (remaining.length <= 1) {

                    finishDevBladeBotRound(remaining[0] || null);

                }

            }

        }

    }


    if (now >= state.roundEndsAt && state.phase === "playing") {

        const activePlayers =
            state.players.filter(player => player.active);

        const winner =
            activePlayers[Math.floor(Math.random() * activePlayers.length)] || null;

        finishDevBladeBotRound(winner);

    }


    updateDevBladeBotArena();

}


function finishDevBladeBotRound(winner) {

    const state =
        gameState.bladeBotTestState;


    if (!state || state.phase !== "playing") {

        return;

    }


    state.phase = "round-over";
    state.targetId = null;


    if (winner) {

        winner.wins++;

        get("arenaAnnouncement").textContent =
            `${winner.nick} venceu a rodada ${state.round}.`;

    }


    get("arenaPhaseLabel").textContent =
        "Fim da rodada";

    updateDevBladeBotArena();


    state.transitionTimer =
        setTimeout(() => {

            if (!gameState.bladeBotTest) {

                return;

            }


            if (state.round >= state.totalRounds) {

                state.phase = "finished";

                handleArenaMessage({
                    type: "match_complete",
                    players: state.players
                        .map(player => ({ ...player }))
                        .sort((a, b) => b.wins - a.wins)
                });

            }

            else {

                startDevBladeBotRound();

            }

        }, 1800);

}


function exitDevBladeBotTest() {

    if (gameState.raceBotTest) {
        exitDevRaceBotTest();
        return;
    }

    const state =
        gameState.bladeBotTestState;


    if (state) {

        clearInterval(state.interval);
        clearTimeout(state.transitionTimer);

    }


    gameState.bladeArena?.destroy();
    gameState.bladeArena = null;
    gameState.bladeArenaLoading = false;
    gameState.bladeBotTest = false;
    gameState.bladeBotTestState = null;

    get("exitDevBladeBotTestButton").hidden = true;
    get("bladeArenaPage").classList.remove("dev-bot-test");
    get("quizScoreBox").hidden = false;
    get("resultMessage").hidden = false;
    get("questionResultTitle").hidden = false;
    get("resultPlayerList").hidden = false;
    get("resultTitle").textContent = "Desafio Finalizado!";
    get("resultSubtitle").textContent = "Confira sua pontuação.";

    updateDevPanel();
    showPage("devPage");

}


function exitDevRaceBotTest() {
    const state = gameState.raceBotTestState;
    if (state) {
        clearInterval(state.interval);
        clearTimeout(state.transitionTimer);
    }

    gameState.bladeArena?.destroy();
    gameState.bladeArena = null;
    gameState.bladeArenaMode = null;
    gameState.bladeArenaLoading = false;
    gameState.raceBotTest = false;
    gameState.raceBotTestState = null;

    get("exitDevBladeBotTestButton").hidden = true;
    get("bladeArenaPage").classList.remove("dev-bot-test", "race-mode");
    get("raceCompleteOverlay").hidden = true;
    get("raceCompletePanel").textContent = "Corrida concluída";
    get("arenaRoundStatus").hidden = false;
    get("raceHud").hidden = true;
    get("mobileParryButton").innerHTML = "Rebater<small>2 m</small>";
    get("mobileParryButton").setAttribute("aria-label", "Rebater a bola");
    document.querySelector(".desktop-parry-hint").textContent = "F para rebater · alcance de 2 m";

    updateDevPanel();
    showPage("devPage");
}


function startGame() {

    const count =
        Object.keys(
            gameState.players
        ).length;


    if (count < CONFIG.MIN_PLAYERS) {

        showToast(
            "❌ Ainda não existem jogadores suficientes."
        );

        return;

    }


    gameState.gameStarted = true;

    gameState.testMode = false;

    gameState.currentQuestion = 0;

    gameState.score = 0;


    showPage("quizPage");

    loadQuestion();

}

// ==========================================================
// CARREGAR PERGUNTA
// ==========================================================

function loadQuestion() {

    clearInterval(
        gameState.timer
    );


    const question =
        questions[
            gameState.currentQuestion
        ];


    // ------------------------------------------------------
    // DIFICULDADE
    // ------------------------------------------------------

    get("difficultyBadge").textContent =
        question.difficulty;


    // ------------------------------------------------------
    // NÚMERO
    // ------------------------------------------------------

    get("questionNumber").textContent =
        `${gameState.currentQuestion + 1} / ${questions.length}`;


    // ------------------------------------------------------
    // PERGUNTA
    // ------------------------------------------------------

    get("questionText").textContent =
        question.question;


    // ------------------------------------------------------
    // PROGRESSO
    // ------------------------------------------------------

    const percentage =
        (
            gameState.currentQuestion /
            questions.length
        ) * 100;


    get("quizProgress").style.width =
        `${percentage}%`;


    // ------------------------------------------------------
    // RESPOSTAS
    // ------------------------------------------------------

    const answerList =
        get("answerList");


    answerList.innerHTML = "";


    question.answers.forEach(
        (answer, index) => {

            const button =
                document.createElement("button");


            button.className =
                "answer-button";


            button.textContent =
                answer;


            button.addEventListener(
                "click",
                () => {

                    answerQuestion(
                        index,
                        button
                    );

                }
            );


            answerList.appendChild(
                button
            );

        }
    );


    get("quizMessage").textContent =
        "";


    // ------------------------------------------------------
    // TIMER
    // ------------------------------------------------------

    startTimer();

}


// ==========================================================
// TIMER
// ==========================================================

function startTimer() {

    gameState.timeLeft =
        CONFIG.QUESTION_TIME;


    updateTimer();


    gameState.timer =
        setInterval(
            () => {

                gameState.timeLeft--;

                updateTimer();


                if (
                    gameState.timeLeft <= 0
                ) {

                    clearInterval(
                        gameState.timer
                    );


                    answerQuestion(
                        -1,
                        null
                    );

                }

            },
            1000
        );

}


// ==========================================================
// ATUALIZAR TIMER
// ==========================================================

function updateTimer() {

    get("questionTimer").textContent =
        `${gameState.timeLeft}s`;


    updateMatchMonitor();

}


// ==========================================================
// RESPONDER
// ==========================================================

function answerQuestion(
    selectedIndex,
    selectedButton
) {

    clearInterval(
        gameState.timer
    );


    const question =
        questions[
            gameState.currentQuestion
        ];


    const buttons =
        document.querySelectorAll(
            "#answerList button"
        );


    // ------------------------------------------------------
    // BLOQUEAR BOTÕES
    // ------------------------------------------------------

    buttons.forEach(
        button => {

            button.disabled = true;

        }
    );


    // ------------------------------------------------------
    // MOSTRAR RESPOSTA CORRETA
    // ------------------------------------------------------

    if (buttons[question.correct]) {

        buttons[
            question.correct
        ].classList.add(
            "correct"
        );

    }


    // ------------------------------------------------------
    // VERIFICAR
    // ------------------------------------------------------

    if (
        selectedIndex ===
        question.correct
    ) {

        gameState.score++;


        if (selectedButton) {

            selectedButton.classList.add(
                "correct"
            );

        }


        get("quizMessage").textContent =
            "✅ Resposta correta!";

    }

    else {

        if (selectedButton) {

            selectedButton.classList.add(
                "wrong"
            );

        }


        get("quizMessage").textContent =
            "❌ Resposta incorreta!";

    }


    if (gameState.currentPlayer) {

        gameState.currentPlayer.score =
            gameState.score;

        updateDevPanel();

    }


    // ------------------------------------------------------
    // PRÓXIMA PERGUNTA
    // ------------------------------------------------------

    setTimeout(
        () => {

            gameState.currentQuestion++;


            if (
                gameState.currentQuestion >=
                questions.length
            ) {

                finishGame();

            }

            else {

                loadQuestion();

            }

        },
        900
    );

}


// ==========================================================
// FINALIZAR JOGO
// ==========================================================

function finishGame() {

    clearInterval(
        gameState.timer
    );


    get("quizScoreBox").hidden = false;
    get("resultMessage").hidden = false;
    get("questionResultTitle").hidden = false;
    get("resultPlayerList").hidden = false;
    get("bladeResultRanking").hidden = true;
    get("resultTitle").textContent = "Desafio Finalizado!";
    get("resultSubtitle").textContent = "Confira sua pontuação.";


    gameState.gameStarted =
        false;


    // ------------------------------------------------------
    // SALVAR PONTUAÇÃO
    // ------------------------------------------------------

    if (
        gameState.currentPlayer
    ) {

        gameState.currentPlayer.score =
            gameState.score;

        if (
            gameState.players[
                gameState.currentPlayer.id
            ]
        ) {

            gameState.players[
                gameState.currentPlayer.id
            ].score =
                gameState.score;

        }

    }


    // ------------------------------------------------------
    // RESULTADO
    // ------------------------------------------------------

    get("playerScore").textContent =
        `${gameState.score} / ${questions.length}`;


    let resultMessage;


    if (gameState.score === 10) {

        resultMessage =
            "🏆 Perfeito! Você acertou tudo!";

    }

    else if (gameState.score >= 7) {

        resultMessage =
            "🔥 Mandou muito bem!";

    }

    else if (gameState.score >= 5) {

        resultMessage =
            "👍 Boa tentativa!";

    }

    else {

        resultMessage =
            "📚 Ainda dá para estudar mais!";

    }


    get("resultMessage").textContent =
        resultMessage;


    get("backHomeButton").textContent =
        gameState.testMode
            ? "← Voltar ao Painel DEV"
            : "🏠 Voltar ao Início";


    updateResultRanking();


    updateDevPanel();

    if (gameState.testMode) {

        showPage("resultPage");

        return;

    }


    gameState.quizScore =
        gameState.score;

    get("bladeResultRanking").hidden =
        true;

    gameState.localReady =
        false;

    get("playerBladeWins").textContent =
        "0 / 5";

    get("bladeResultMessage").textContent =
        "Aguardando início da arena";

    get("bladeReadyStatus").textContent =
        "Enviando resultado do quiz para a sala...";

    get("bladeReadyButton").disabled =
        true;

    showPage("bladeReadyPage");

    sendArenaMessage({
        type: "quiz_finished",
        score: gameState.quizScore
    });

}


// ==========================================================
// RANKING
// ==========================================================

function updateResultRanking() {

    const list =
        get("resultPlayerList");


    const players =
        gameState.testMode
            ? [gameState.currentPlayer]
            : Object.values(gameState.players);


    players.sort(
        (a, b) =>
            b.score - a.score
    );


    list.innerHTML =
        players.map(
            (player, index) => {

                return `

                    <div class="player-card">

                        <div class="ranking-position">

                            #${index + 1}

                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    player.nick
                                )}
                            </strong>

                            <small>
                                @${escapeHTML(player.discordUsername)}
                            </small>

                        </div>

                        <strong>
                            ${player.score} pts
                        </strong>

                    </div>

                `;

            }
        ).join("");

}


// ==========================================================
// VOLTAR AO INÍCIO
// ==========================================================

get("backHomeButton").addEventListener(
    "click",
    () => {

        if (gameState.bladeBotTest) {

            exitDevBladeBotTest();

            return;

        }


        if (gameState.testMode) {

            exitDevTest();

            return;

        }

        showPage(
            "homePage"
        );

    }
);


// ==========================================================
// SAIR DO LOBBY
// ==========================================================

get("leaveLobbyButton").addEventListener(
    "click",
    leaveLobby
);


function leaveLobby() {

    if (
        gameState.currentPlayer
    ) {

        delete gameState.players[
            gameState.currentPlayer.id
        ];

    }


    gameState.currentPlayer =
        null;


    disconnectArenaSocket();


    updateLobby();

    updateDevPanel();


    showPage(
        "homePage"
    );


    showToast(
        "Você saiu do lobby."
    );

}


// ==========================================================
// LOGIN DEV
// ==========================================================

get("devLoginForm").addEventListener(
    "submit",
    event => {

        event.preventDefault();

        loginDev();

    }
);


function loginDev() {

    const password =
        get("devPassword").value;


    if (
        password !==
        CONFIG.DEV_PASSWORD
    ) {

        get("devLoginMessage").textContent =
            "❌ Senha incorreta.";

        return;

    }


    gameState.devLogged =
        true;


    get("devPassword").value =
        "";


    get("devLoginMessage").textContent =
        "";


    updateDevPanel();


    showPage(
        "devPage"
    );


    showToast(
        "🛠️ Painel DEV aberto."
    );

}


// ==========================================================
// SAIR DO DEV
// ==========================================================

get("devLogoutButton").addEventListener(
    "click",
    () => {

        gameState.devLogged =
            false;


        showPage(
            "homePage"
        );


        showToast(
            "Painel DEV fechado."
        );

    }
);


// ==========================================================
// PAINEL DEV
// ==========================================================

function updateMatchMonitor() {

    const isRunning =
        gameState.gameStarted;

    const isFinished =
        !isRunning &&
        gameState.currentQuestion >= questions.length;

    const currentQuestion =
        isRunning
            ? questions[gameState.currentQuestion]
            : null;

    const questionNumber =
        isRunning
            ? gameState.currentQuestion + 1
            : isFinished
                ? questions.length
                : 0;

    const progress =
        isRunning
            ? (gameState.currentQuestion / questions.length) * 100
            : isFinished
                ? 100
                : 0;

    const status =
        get("devMatchStatus");


    status.dataset.state =
        isRunning
            ? "running"
            : isFinished
                ? "finished"
                : "waiting";

    status.textContent =
        isRunning
            ? gameState.testMode
                ? "Teste solo"
                : "Em andamento"
            : isFinished
                ? "Finalizada"
                : "Aguardando";

    get("devMatchQuestionNumber").textContent =
        `${questionNumber} / ${questions.length}`;

    get("devMatchTimer").textContent =
        isRunning
            ? `${gameState.timeLeft}s`
            : "--";

    get("devMatchScore").textContent =
        gameState.currentPlayer
            ? `${gameState.score} / ${questions.length}`
            : "--";

    get("devMatchProgressBar").style.width =
        `${progress}%`;

    get("devMatchProgressBar")
        .parentElement
        .setAttribute("aria-valuenow", questionNumber);

    get("devMatchDifficulty").textContent =
        currentQuestion
            ? currentQuestion.difficulty
            : isFinished
                ? "Concluída"
                : "Aguardando partida";

    get("devMatchQuestion").textContent =
        currentQuestion
            ? currentQuestion.question
            : isFinished
                ? "O desafio foi concluído."
                : "A pergunta atual aparecerá aqui quando o desafio começar.";

}


function updateDevPanel() {

    const players =
        Object.values(
            gameState.players
        );


    updateMatchMonitor();


    // ------------------------------------------------------
    // ONLINE
    // ------------------------------------------------------

    get("devOnlinePlayers").textContent =
        players.length;


    get("devOnlineBadge").textContent =
        `${players.length} ONLINE`;


    // ------------------------------------------------------
    // PONTOS
    // ------------------------------------------------------

    const totalPoints =
        players.reduce(
            (total, player) => {

                return total +
                    Number(player.score || 0);

            },
            0
        );


    get("devTotalPoints").textContent =
        totalPoints;


    // ------------------------------------------------------
    // MAIOR PONTUAÇÃO
    // ------------------------------------------------------

    const highest =
        players.length > 0

            ? Math.max(
                ...players.map(
                    player =>
                        Number(
                            player.score || 0
                        )
                )
            )

            : 0;


    get("devHighestScore").textContent =
        highest;


    // ------------------------------------------------------
    // LISTA
    // ------------------------------------------------------

    const list =
        get("devPlayerList");


    if (players.length === 0) {

        list.innerHTML = `
            <p class="empty-message">
                Nenhum jogador online.
            </p>
        `;

        return;

    }


    list.innerHTML =
        players.map(
            player => {

                return `

                    <div class="dev-player-card">

                        <div class="dev-player-info">

                            <div class="player-avatar">
                                👤
                            </div>

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        player.nick
                                    )}
                                </strong>

                                <small>
                                    @${escapeHTML(player.discordUsername)}
                                </small>

                                <small>
                                    Discord ID:
                                    ${escapeHTML(
                                        player.id
                                    )}
                                </small>

                            </div>

                        </div>


                        <div class="dev-player-score">

                            <span>
                                Pontos
                            </span>

                            <strong>
                                ${player.score}
                            </strong>

                        </div>


                        <button
                            class="notify-player-button"
                            data-player-id="${escapeHTML(
                                player.id
                            )}"
                        >

                            🔔 Notificar

                        </button>

                    </div>

                `;

            }
        ).join("");


    // ------------------------------------------------------
    // BOTÕES INDIVIDUAIS
    // ------------------------------------------------------

    document
        .querySelectorAll(
            ".notify-player-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const playerId =
                            button.dataset.playerId;


                        sendNotification(
                            playerId
                        );

                    }
                );

            }
        );

}


// ==========================================================
// NOTIFICAÇÃO PARA TODOS
// ==========================================================

get("notifyAllButton").addEventListener(
    "click",
    () => {

        sendNotification(
            "ALL"
        );

    }
);


// ==========================================================
// ENVIAR NOTIFICAÇÃO
// ==========================================================

function sendNotification(
    target
) {

    const text =
        get("notificationText")
            .value
            .trim();


    if (!text) {

        get("notificationMessage").textContent =
            "❌ Digite uma mensagem.";

        return;

    }


    // ------------------------------------------------------
    // CRIAR NOTIFICAÇÃO
    // ------------------------------------------------------

    const notification = {

        id:
            Date.now(),

        text:

            text,

        target:

            target,

        createdAt:

            new Date()
                .toLocaleTimeString(
                    "pt-BR"
                )

    };


    gameState.notifications.push(
        notification
    );


    // ------------------------------------------------------
    // HISTÓRICO
    // ------------------------------------------------------

    updateNotificationHistory();


    // ------------------------------------------------------
    // LIMPAR
    // ------------------------------------------------------

    get("notificationText")
        .value = "";


    get("notificationMessage").textContent =
        "✅ Notificação enviada.";


    // ------------------------------------------------------
    // SIMULAÇÃO LOCAL
    // ------------------------------------------------------

    if (
        target === "ALL"
    ) {

        showToast(
            `📢 ${text}`
        );

    }

    else {

        const player =
            gameState.players[
                target
            ];


        if (player) {

            showToast(
                `🔔 Enviada para ${player.nick}`
            );

        }

    }


    /*
    ========================================================
    FUTURO FIREBASE

    A notificação será gravada no banco:

    rooms/
       natal-blox-fruits-2026/
           notifications/

    Assim todos os jogadores poderão recebê-la
    instantaneamente.

    ========================================================
    */

}


// ==========================================================
// HISTÓRICO DE NOTIFICAÇÕES
// ==========================================================

function updateNotificationHistory() {

    const container =
        get("notificationHistory");


    if (
        gameState.notifications.length === 0
    ) {

        container.innerHTML = `
            <p class="empty-message">
                Nenhuma notificação enviada.
            </p>
        `;

        return;

    }


    container.innerHTML =
        gameState.notifications
            .slice()
            .reverse()
            .map(
                notification => {

                    const target =
                        notification.target === "ALL"

                            ? "Todos os jogadores"

                            : (
                                gameState.players[
                                    notification.target
                                ]?.nick ||
                                "Jogador"
                            );


                    return `

                        <div class="notification-item">

                            <div>

                                <strong>
                                    📢
                                    ${escapeHTML(
                                        notification.text
                                    )}
                                </strong>

                                <small>

                                    Para:
                                    ${escapeHTML(
                                        target
                                    )}

                                    •
                                    ${notification.createdAt}

                                </small>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


// ==========================================================
// DETECTAR SAÍDA DA PÁGINA
// ==========================================================

window.addEventListener(
    "beforeunload",
    () => {

        /*
        ======================================================
        IMPORTANTE

        Quando colocarmos Firebase, o onDisconnect()
        removerá automaticamente o jogador do lobby.

        Sem servidor/Firebase, o navegador sozinho não
        consegue garantir presença real entre dispositivos.
        ======================================================
        */

    }
);


// ==========================================================
// ESTADO INICIAL
// ==========================================================

updateLobby();

updateDevPanel();

restoreDiscordSession();


// ==========================================================
// LOG
// ==========================================================

console.log(
    "🎄 Desafio Blox Fruits carregado."
);

console.log(
    "🛠️ Painel DEV disponível."
);


get("exitDevBladeBotTestButton").addEventListener(
    "click",
    exitDevBladeBotTest
);