import * as THREE from "three";

const PLAYER_COLORS = [
    0x47c8c3,
    0xf0ad4e,
    0x8a7cff,
    0x5dd18a,
    0xef7186,
    0x5ba6ef,
    0xe8d95d,
    0xd27be5
];

export function createBladeArena({ canvas, localPlayerId, send, mode = "blade" }) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.Fog(0x090d16, 24, 60);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 17, 23);
    camera.lookAt(0, 0, 0);
    const cameraFollowPosition = new THREE.Vector3();

    scene.add(new THREE.HemisphereLight(0xa8d3e8, 0x18202b, 2.1));

    const keyLight = new THREE.DirectionalLight(0xfff0d5, 3.3);
    keyLight.position.set(-8, 15, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x3c91a6, 28, 24);
    rimLight.position.set(8, 8, -7);
    scene.add(rimLight);

    const arena = new THREE.Group();
    scene.add(arena);

    const platformMaterial = new THREE.MeshStandardMaterial({
        color: 0x18242d,
        metalness: 0.62,
        roughness: 0.42
    });
    const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(10.5, 11, 0.8, 64),
        platformMaterial
    );
    platform.position.y = -0.42;
    platform.receiveShadow = true;
    arena.add(platform);

    const top = new THREE.Mesh(
        new THREE.CircleGeometry(10.48, 64),
        new THREE.MeshStandardMaterial({
            color: 0x111820,
            metalness: 0.2,
            roughness: 0.78
        })
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.005;
    top.receiveShadow = true;
    arena.add(top);

    const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(10.46, 0.08, 10, 96),
        new THREE.MeshStandardMaterial({
            color: 0x42c6b4,
            emissive: 0x145b53,
            emissiveIntensity: 1.25,
            metalness: 0.72,
            roughness: 0.28
        })
    );
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = 0.08;
    arena.add(outerRing);

    for (let index = 0; index < 8; index++) {
        const angle = (Math.PI * 2 * index) / 8;
        const marker = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.52, 0.12, 6),
            new THREE.MeshStandardMaterial({
                color: 0x30404b,
                metalness: 0.5,
                roughness: 0.4
            })
        );
        marker.position.set(Math.cos(angle) * 8.2, 0.08, Math.sin(angle) * 8.2);
        marker.castShadow = true;
        arena.add(marker);
    }

    const grid = new THREE.GridHelper(18, 18, 0x36565d, 0x26353c);
    grid.position.y = 0.02;
    arena.add(grid);

    if (mode === "race") {
        for (const object of arena.children) object.visible = false;

        const ground = new THREE.Mesh(
            new THREE.BoxGeometry(76, 0.5, 52),
            new THREE.MeshStandardMaterial({ color: 0x18312f, roughness: 0.92 })
        );
        ground.position.y = -0.32;
        ground.receiveShadow = true;
        arena.add(ground);

        const route = [
            { x: 27, z: 0 },
            { x: 18, z: -15 },
            { x: -18, z: -15 },
            { x: -27, z: 0 },
            { x: -18, z: 15 },
            { x: 18, z: 15 },
            { x: 27, z: 0 }
        ];
        const roadMaterial = new THREE.MeshStandardMaterial({
            color: 0x263b3c,
            roughness: 0.82,
            metalness: 0.08
        });

        for (let index = 0; index < route.length - 1; index++) {
            const from = route[index];
            const to = route[index + 1];
            const dx = to.x - from.x;
            const dz = to.z - from.z;
            const road = new THREE.Mesh(
                new THREE.BoxGeometry(Math.hypot(dx, dz) + 10, 0.18, 10),
                roadMaterial
            );
            road.position.set((from.x + to.x) / 2, 0.02, (from.z + to.z) / 2);
            road.rotation.y = -Math.atan2(dz, dx);
            road.receiveShadow = true;
            arena.add(road);
        }

        for (const checkpoint of [...route.slice(1, -1), route[0]]) {
            const gate = new THREE.Mesh(
                new THREE.TorusGeometry(4.4, 0.16, 10, 36),
                new THREE.MeshStandardMaterial({
                    color: checkpoint === route[0] ? 0x63e49b : 0xf0ad4e,
                    emissive: checkpoint === route[0] ? 0x176943 : 0x704317,
                    emissiveIntensity: 1.1,
                    metalness: 0.45
                })
            );
            gate.rotation.x = -Math.PI / 2;
            gate.position.set(checkpoint.x, 0.13, checkpoint.z);
            arena.add(gate);
        }

        const raceGrid = new THREE.GridHelper(72, 36, 0x36565d, 0x243b3d);
        raceGrid.position.y = -0.04;
        arena.add(raceGrid);
    }

    const avatars = new Map();
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 24, 18),
        new THREE.MeshStandardMaterial({
            color: 0xff5363,
            emissive: 0xa70b28,
            emissiveIntensity: 2.5,
            roughness: 0.24,
            metalness: 0.16
        })
    );
    ball.castShadow = true;
    ball.visible = mode !== "race";
    arena.add(ball);

    const ballGlow = new THREE.PointLight(0xff2745, 15, 5);
    ballGlow.visible = mode !== "race";
    arena.add(ballGlow);

    let targetId = null;
    let snapshot = null;
    let frameId = 0;
    let destroyed = false;
    const animationClock = new THREE.Clock();
    let joystickPointer = null;
    let joystickX = 0;
    let joystickZ = 0;
    let joystickBounds = null;
    const pressedKeys = new Set();

    function makeNameTag(text) {
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 512;
        labelCanvas.height = 128;
        const context = labelCanvas.getContext("2d");
        context.fillStyle = "rgba(7, 12, 18, 0.78)";
        context.beginPath();
        context.roundRect(10, 12, 492, 104, 26);
        context.fill();
        context.strokeStyle = "rgba(167, 231, 224, 0.45)";
        context.lineWidth = 3;
        context.stroke();
        context.fillStyle = "#ffffff";
        context.font = "700 38px Segoe UI, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(text).slice(0, 20), 256, 65, 460);

        const texture = new THREE.CanvasTexture(labelCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
        );
        sprite.position.set(0, 2.65, 0);
        sprite.scale.set(2.7, 0.68, 1);
        return sprite;
    }

    function makeAvatar(player, index) {
        const group = new THREE.Group();
        const arms = [];
        const legs = [];
        const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.68,
            metalness: 0.05
        });
        const limbMaterial = new THREE.MeshStandardMaterial({
            color: 0xd7b697,
            roughness: 0.75
        });
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0c8a3,
            roughness: 0.72
        });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.92, 0.42), bodyMaterial);
        torso.position.y = 1.05;
        torso.castShadow = true;
        group.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.58), headMaterial);
        head.position.y = 1.82;
        head.castShadow = true;
        group.add(head);

        for (const side of [-1, 1]) {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.78, 0.32), limbMaterial);
            arm.position.set(side * 0.56, 1.08, 0);
            arm.castShadow = true;
            group.add(arm);
            arms.push(arm);

            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.72, 0.38), bodyMaterial);
            leg.position.set(side * 0.22, 0.39, 0);
            leg.castShadow = true;
            group.add(leg);
            legs.push(leg);
        }

        const nameTag = makeNameTag(player.nick || player.username);
        group.add(nameTag);

        const targetRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.72, 0.075, 8, 32),
            new THREE.MeshBasicMaterial({ color: 0xff314c })
        );
        targetRing.rotation.x = Math.PI / 2;
        targetRing.position.y = 0.14;
        targetRing.visible = false;
        group.add(targetRing);

        const outline = new THREE.BoxHelper(group, 0xff263f);
        outline.visible = false;
        scene.add(outline);

        group.position.set(player.x || 0, 0, player.z || 0);
        group.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
            }
        });
        arena.add(group);

        return {
            group,
            outline,
            targetRing,
            x: player.x || 0,
            z: player.z || 0,
            active: player.active !== false,
            id: player.id,
            arms,
            legs,
            walking: false,
            walkAmount: 0,
            walkPhase: 0,
            facingAngle: 0
        };
    }

    function updatePlayers(players) {
        players.forEach((player, index) => {
            let avatar = avatars.get(player.id);

            if (!avatar) {
                avatar = makeAvatar(player, index);
                avatars.set(player.id, avatar);
            }

            const nextX = player.x || 0;
            const nextZ = player.z || 0;
            const moveX = nextX - avatar.x;
            const moveZ = nextZ - avatar.z;

            avatar.walking =
                Math.hypot(moveX, moveZ) > 0.002;

            if (avatar.walking) {

                avatar.facingAngle =
                    Math.atan2(moveX, moveZ);

            }

            avatar.x = nextX;
            avatar.z = nextZ;
            avatar.active = player.active !== false;
            avatar.group.visible = avatar.active;
            avatar.targetRing.visible = player.id === targetId && avatar.active;
            avatar.outline.visible = player.id === targetId && avatar.active;
        });

        for (const [id, avatar] of avatars) {
            if (!players.some(player => player.id === id)) {
                arena.remove(avatar.group);
                scene.remove(avatar.outline);
                avatars.delete(id);
            }
        }
    }

    function currentInput() {
        let x = joystickX;
        let z = joystickZ;

        if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) x -= 1;
        if (pressedKeys.has("d") || pressedKeys.has("arrowright")) x += 1;
        if (pressedKeys.has("w") || pressedKeys.has("arrowup")) z -= 1;
        if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) z += 1;

        const magnitude = Math.hypot(x, z);
        if (magnitude > 1) {
            x /= magnitude;
            z /= magnitude;
        }

        return { x, z };
    }

    function sendParry() {
        send({ type: "parry" });
        const localAvatar = avatars.get(localPlayerId);
        if (localAvatar) {
            localAvatar.group.scale.setScalar(1.08);
            window.setTimeout(() => localAvatar.group.scale.setScalar(1), 120);
        }
    }

    function sendBoost() {
        send({ type: "boost" });
        const localAvatar = avatars.get(localPlayerId);
        if (localAvatar) {
            localAvatar.group.scale.setScalar(1.12);
            window.setTimeout(() => localAvatar.group.scale.setScalar(1), 160);
        }
    }

    function onKeyDown(event) {
        const key = event.key.toLowerCase();
        if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "f"].includes(key) || (mode === "race" && key === " ")) {
            event.preventDefault();
        }
        if (mode === "race" && key === " " && !event.repeat) {
            sendBoost();
        } else if (key === "f" && mode !== "race" && !event.repeat) {
            sendParry();
        } else if (key !== " ") {
            pressedKeys.add(key);
        }
    }

    function onKeyUp(event) {
        pressedKeys.delete(event.key.toLowerCase());
    }

    function updateJoystick(event) {
        if (!joystickBounds) return;
        const centerX = joystickBounds.left + joystickBounds.width / 2;
        const centerY = joystickBounds.top + joystickBounds.height / 2;
        const maxDistance = joystickBounds.width * 0.34;
        let dx = event.clientX - centerX;
        let dy = event.clientY - centerY;
        const distance = Math.hypot(dx, dy);

        if (distance > maxDistance) {
            dx = (dx / distance) * maxDistance;
            dy = (dy / distance) * maxDistance;
        }

        joystickX = dx / maxDistance;
        joystickZ = dy / maxDistance;
        const thumb = document.getElementById("arenaJoystickThumb");
        thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    function onJoystickDown(event) {
        event.preventDefault();
        joystickPointer = event.pointerId;
        joystickBounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);
        updateJoystick(event);
    }

    function onJoystickMove(event) {
        if (event.pointerId === joystickPointer) updateJoystick(event);
    }

    function onJoystickUp(event) {
        if (event.pointerId !== joystickPointer) return;
        joystickPointer = null;
        joystickX = 0;
        joystickZ = 0;
        document.getElementById("arenaJoystickThumb").style.transform = "translate(0, 0)";
    }

    function onMobileParry(event) {
        event.preventDefault();
        if (mode === "race") sendBoost();
        else sendParry();
    }

    function renderFrame() {
        const delta =
            Math.min(animationClock.getDelta(), 0.05);

        for (const avatar of avatars.values()) {
            avatar.group.position.x = THREE.MathUtils.lerp(avatar.group.position.x, avatar.x, 0.28);
            avatar.group.position.z = THREE.MathUtils.lerp(avatar.group.position.z, avatar.z, 0.28);

            const angleDelta = Math.atan2(
                Math.sin(avatar.facingAngle - avatar.group.rotation.y),
                Math.cos(avatar.facingAngle - avatar.group.rotation.y)
            );

            avatar.group.rotation.y += angleDelta * Math.min(1, delta * 12);
            avatar.walkAmount = THREE.MathUtils.lerp(
                avatar.walkAmount,
                avatar.walking ? 1 : 0,
                Math.min(1, delta * 9)
            );

            if (avatar.walkAmount > 0.01) {

                avatar.walkPhase += delta * 11;
                const swing = Math.sin(avatar.walkPhase) * 0.52 * avatar.walkAmount;

                avatar.arms[0].rotation.x = swing;
                avatar.arms[1].rotation.x = -swing;
                avatar.legs[0].rotation.x = -swing;
                avatar.legs[1].rotation.x = swing;
                avatar.group.position.y =
                    Math.abs(Math.sin(avatar.walkPhase * 2)) * 0.045 * avatar.walkAmount;

            }

            else {

                avatar.arms[0].rotation.x = 0;
                avatar.arms[1].rotation.x = 0;
                avatar.legs[0].rotation.x = 0;
                avatar.legs[1].rotation.x = 0;
                avatar.group.position.y = 0;

            }

            if (avatar.outline.visible) avatar.outline.update();
        }

        if (snapshot?.ball) {
            ball.position.set(snapshot.ball.x, snapshot.ball.y, snapshot.ball.z);
            ballGlow.position.copy(ball.position);
        }

        if (mode === "race") {
            const localAvatar = avatars.get(localPlayerId);
            if (localAvatar) {
                cameraFollowPosition.set(localAvatar.group.position.x, 27, localAvatar.group.position.z + 32);
                camera.position.lerp(cameraFollowPosition, Math.min(1, delta * 4));
                camera.lookAt(localAvatar.group.position.x, 0, localAvatar.group.position.z);
            }
        }

        ball.rotation.x += 0.012;
        ball.rotation.y += 0.018;
        renderer.render(scene, camera);
    }

    const joystick = document.getElementById("arenaJoystick");
    const mobileParryButton = document.getElementById("mobileParryButton");
    canvas.parentElement.classList.toggle("race-mode", mode === "race");
    mobileParryButton.innerHTML = mode === "race" ? "Impulso<small>5s</small>" : "Rebater<small>2 m</small>";
    mobileParryButton.setAttribute("aria-label", mode === "race" ? "Ativar impulso" : "Rebater a bola");
    document.querySelector(".desktop-parry-hint").textContent = mode === "race"
        ? "Espaço para impulso · 5s de duração"
        : "F para rebater · alcance de 2 m";
    joystick.addEventListener("pointerdown", onJoystickDown);
    joystick.addEventListener("pointermove", onJoystickMove);
    joystick.addEventListener("pointerup", onJoystickUp);
    joystick.addEventListener("pointercancel", onJoystickUp);
    mobileParryButton.addEventListener("pointerdown", onMobileParry);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const moveInterval = window.setInterval(() => {
        if (!destroyed) send({ type: "move", ...currentInput() });
    }, 65);

    function resizeRenderer() {
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.position.z = mode === "race" ? 32 : width < 620 ? 27 : 23;
        camera.position.y = mode === "race" ? 27 : width < 620 ? 21 : 17;
        camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(canvas.parentElement);
    window.addEventListener("resize", resizeRenderer);
    resizeRenderer();

    function animate() {
        if (destroyed) return;
        frameId = window.requestAnimationFrame(animate);
        renderFrame();
    }

    renderFrame();
    animate();

    return {
        update(state) {
            snapshot = state;
            targetId = state.targetId;
            updatePlayers(state.players || []);
            renderFrame();
        },
        destroy() {
            destroyed = true;
            window.cancelAnimationFrame(frameId);
            window.clearInterval(moveInterval);
            resizeObserver.disconnect();
            joystick.removeEventListener("pointerdown", onJoystickDown);
            joystick.removeEventListener("pointermove", onJoystickMove);
            joystick.removeEventListener("pointerup", onJoystickUp);
            joystick.removeEventListener("pointercancel", onJoystickUp);
            mobileParryButton.removeEventListener("pointerdown", onMobileParry);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("resize", resizeRenderer);
            renderer.dispose();
        }
    };
}
