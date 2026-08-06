"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameState = "intro" | "countdown" | "playing" | "gameover";
type PoseStatus = "off" | "loading" | "ready" | "error";

declare global {
  interface Window {
    Pose?: new (config: { locateFile: (file: string) => string }) => {
      setOptions: (options: Record<string, unknown>) => void;
      onResults: (callback: (results: PoseResults) => void) => void;
      send: (input: { image: HTMLVideoElement }) => Promise<void>;
      close: () => void;
    };
  }
}

type Landmark = { x: number; y: number; visibility?: number };
type PoseResults = { poseLandmarks?: Landmark[] };

const GAME_WIDTH = 1100;
const GAME_HEIGHT = 560;
const GROUND_Y = 446;

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<InstanceType<NonNullable<typeof window.Pose>> | null>(null);
  const poseLoopRef = useRef<number>(0);
  const commandRef = useRef<"none" | "jump" | "duck">("none");
  const gameStateRef = useRef<GameState>("intro");
  const [gameState, setGameState] = useState<GameState>("intro");
  const [poseStatus, setPoseStatus] = useState<PoseStatus>("off");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [motion, setMotion] = useState("FIQUE EM POSIÇÃO");
  const [cameraOpen, setCameraOpen] = useState(false);
  const baselineRef = useRef<{ shoulderY: number; hipY: number } | null>(null);
  const cooldownRef = useRef(0);

  useEffect(() => {
    const saved = Number(localStorage.getItem("corrida-campus-recorde") || 0);
    setBest(saved);
  }, []);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const triggerJump = useCallback(() => {
    if (gameStateRef.current === "playing") commandRef.current = "jump";
  }, []);

  const triggerDuck = useCallback((active: boolean) => {
    if (gameStateRef.current === "playing") commandRef.current = active ? "duck" : "none";
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown"].includes(event.code)) event.preventDefault();
      if (event.code === "Space" || event.code === "ArrowUp") triggerJump();
      if (event.code === "ArrowDown") triggerDuck(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "ArrowDown") triggerDuck(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [triggerDuck, triggerJump]);

  const interpretPose = useCallback((results: PoseResults) => {
    const lm = results.poseLandmarks;
    if (!lm || lm.length < 29) return;
    const shoulderY = (lm[11].y + lm[12].y) / 2;
    const hipY = (lm[23].y + lm[24].y) / 2;
    const ankleY = (lm[27].y + lm[28].y) / 2;
    const now = performance.now();

    if (!baselineRef.current || gameStateRef.current !== "playing") {
      baselineRef.current = { shoulderY, hipY };
      setMotion("CORPO DETECTADO");
      return;
    }

    const baseline = baselineRef.current;
    baseline.shoulderY = baseline.shoulderY * 0.985 + shoulderY * 0.015;
    baseline.hipY = baseline.hipY * 0.985 + hipY * 0.015;
    const bodyHeight = Math.max(0.18, ankleY - shoulderY);
    const jumped = baseline.hipY - hipY > bodyHeight * 0.055;
    const ducked = shoulderY - baseline.shoulderY > bodyHeight * 0.09;

    if (jumped && now > cooldownRef.current) {
      commandRef.current = "jump";
      cooldownRef.current = now + 700;
      setMotion("PULO!");
    } else if (ducked) {
      commandRef.current = "duck";
      setMotion("AGACHOU!");
    } else {
      if (commandRef.current === "duck") commandRef.current = "none";
      setMotion("CORRENDO");
    }
  }, []);

  const enableCamera = useCallback(async () => {
    try {
      setPoseStatus("loading");
      setMotion("CARREGANDO IA...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraOpen(true);

      if (!window.Pose) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
          script.crossOrigin = "anonymous";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Falha ao carregar o modelo"));
          document.head.appendChild(script);
        });
      }
      if (!window.Pose) throw new Error("Modelo indisponível");

      const pose = new window.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      pose.onResults(interpretPose);
      poseRef.current = pose;
      setPoseStatus("ready");
      setMotion("CORPO DETECTADO");

      let processing = false;
      const loop = async () => {
        if (!processing && video.readyState >= 2 && poseRef.current) {
          processing = true;
          try { await poseRef.current.send({ image: video }); } catch { /* próxima imagem */ }
          processing = false;
        }
        poseLoopRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (error) {
      console.error(error);
      setPoseStatus("error");
      setMotion("USE O TECLADO");
    }
  }, [interpretPose]);

  useEffect(() => () => {
    cancelAnimationFrame(poseLoopRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    poseRef.current?.close();
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setGameState("countdown");
    setCountdown(3);
    baselineRef.current = null;
    let n = 3;
    const timer = window.setInterval(() => {
      n -= 1;
      if (n === 0) {
        window.clearInterval(timer);
        commandRef.current = "none";
        setGameState("playing");
      } else setCountdown(n);
    }, 720);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let distance = 0;
    let currentScore = 0;
    let playerY = GROUND_Y - 66;
    let velocityY = 0;
    let ducking = false;
    let nextObstacle = 680;
    let obstacles: { x: number; y: number; w: number; h: number; type: "cone" | "books" | "bird" }[] = [];
    let particles: { x: number; y: number; vx: number; life: number }[] = [];
    const scenery = {
      building: new Image(),
      grass: new Image(),
      road: new Image(),
    };
    scenery.building.src = "/scenarios/predio-unc.png";
    scenery.grass.src = "/scenarios/grama.png";
    scenery.road.src = "/scenarios/estrada.png";

    const resetRound = () => {
      distance = 0;
      currentScore = 0;
      playerY = GROUND_Y - 66;
      velocityY = 0;
      obstacles = [];
      particles = [];
      nextObstacle = 760;
    };

    const drawBackground = (t: number) => {
      const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      sky.addColorStop(0, "#daf7f2");
      sky.addColorStop(0.65, "#fff5d4");
      sky.addColorStop(1, "#f5d19c");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = "rgba(255,255,255,.72)";
      for (let i = 0; i < 4; i++) {
        const x = ((i * 330 - distance * 0.08) % 1400 + 1400) % 1400 - 120;
        ctx.beginPath();
        ctx.arc(x, 92 + (i % 2) * 42, 34, 0, Math.PI * 2);
        ctx.arc(x + 42, 82 + (i % 2) * 42, 48, 0, Math.PI * 2);
        ctx.arc(x + 88, 98 + (i % 2) * 42, 32, 0, Math.PI * 2);
        ctx.fill();
      }

      if (scenery.building.complete && scenery.building.naturalWidth) {
        const buildingCycle = 1720;
        for (let i = 0; i < 2; i++) {
          const bx = ((i * buildingCycle + 420 - distance * 0.055) % (buildingCycle * 2) + buildingCycle * 2) % (buildingCycle * 2) - 820;
          ctx.drawImage(scenery.building, 55, 175, 1405, 705, bx, 112, 800, 401);
        }
      }

      ctx.fillStyle = "#78b968";
      ctx.fillRect(0, 366, GAME_WIDTH, 82);
      if (scenery.grass.complete && scenery.grass.naturalWidth) {
        const grassWidth = 760;
        const grassOffset = (distance * 0.25) % grassWidth;
        for (let i = -1; i < 3; i++) {
          ctx.drawImage(scenery.grass, 55, 395, 1420, 295, i * grassWidth - grassOffset, 332, grassWidth, 158);
        }
      }

      ctx.fillStyle = "#645b63";
      ctx.fillRect(0, GROUND_Y - 6, GAME_WIDTH, GAME_HEIGHT - GROUND_Y + 6);
      if (scenery.road.complete && scenery.road.naturalWidth) {
        const roadWidth = 1100;
        const roadOffset = distance % roadWidth;
        for (let i = -1; i < 2; i++) {
          ctx.drawImage(scenery.road, 14, 404, 1508, 282, i * roadWidth - roadOffset, GROUND_Y - 18, roadWidth, 206);
        }
      }
    };

    const drawPlayer = (t: number) => {
      const x = 145;
      const onGround = playerY >= GROUND_Y - (ducking ? 42 : 66) - 1;
      const bob = onGround && gameStateRef.current === "playing" ? Math.sin(t * 0.018) * 2 : 0;
      const y = playerY + bob;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "rgba(38,54,45,.18)";
      ctx.beginPath(); ctx.ellipse(18, (ducking ? 48 : 73) - bob, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#183d39";
      if (ducking) {
        ctx.fillRect(1, 23, 45, 24);
        ctx.fillStyle = "#f3b57e"; ctx.beginPath(); ctx.arc(47, 18, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#152f2d"; ctx.fillRect(38, 7, 22, 7);
        ctx.strokeStyle = "#183d39"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(13, 44); ctx.lineTo(-4, 58); ctx.moveTo(34, 45); ctx.lineTo(56, 57); ctx.stroke();
      } else {
        ctx.fillStyle = "#f3b57e"; ctx.beginPath(); ctx.arc(19, 13, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#152f2d"; ctx.beginPath(); ctx.arc(17, 8, 15, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#f05d3e"; ctx.fillRect(5, 26, 28, 29);
        ctx.fillStyle = "#fff4d2"; ctx.fillRect(15, 28, 8, 20);
        ctx.strokeStyle = "#183d39"; ctx.lineWidth = 8; ctx.lineCap = "round";
        const stride = Math.sin(t * .022) * 12;
        ctx.beginPath(); ctx.moveTo(12, 53); ctx.lineTo(8 - stride, 70); ctx.moveTo(27, 53); ctx.lineTo(31 + stride, 70); ctx.stroke();
        ctx.strokeStyle = "#f3b57e"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(8, 31); ctx.lineTo(-4 - stride * .4, 46); ctx.moveTo(30, 32); ctx.lineTo(40 + stride * .4, 45); ctx.stroke();
        ctx.fillStyle = "#f5c542"; ctx.beginPath(); ctx.arc(36, 32, 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    };

    const drawObstacle = (o: typeof obstacles[number]) => {
      if (o.type === "cone") {
        ctx.fillStyle = "#ef5c3b"; ctx.beginPath(); ctx.moveTo(o.x + o.w / 2, o.y); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.lineTo(o.x, o.y + o.h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fff3cf"; ctx.fillRect(o.x + 8, o.y + 27, o.w - 16, 8);
        ctx.fillStyle = "#183d39"; ctx.fillRect(o.x - 7, o.y + o.h - 5, o.w + 14, 7);
      } else if (o.type === "books") {
        const colors = ["#e95d46", "#f5c542", "#2f7870"];
        for (let i = 0; i < 3; i++) { ctx.fillStyle = colors[i]; ctx.fillRect(o.x + (i % 2) * 5, o.y + i * 16, o.w - 5, 14); }
      } else {
        ctx.fillStyle = "#243f3d"; ctx.beginPath(); ctx.arc(o.x + 22, o.y + 17, 13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#243f3d"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(o.x + 16, o.y + 15); ctx.lineTo(o.x, o.y + 2); ctx.moveTo(o.x + 27, o.y + 15); ctx.lineTo(o.x + 45, o.y + 2); ctx.stroke();
        ctx.fillStyle = "#f5c542"; ctx.beginPath(); ctx.moveTo(o.x + 34, o.y + 14); ctx.lineTo(o.x + 47, o.y + 18); ctx.lineTo(o.x + 34, o.y + 22); ctx.fill();
      }
    };

    const loop = (time: number) => {
      const dt = Math.min(32, time - last) / 16.67;
      last = time;
      const state = gameStateRef.current;
      if (state === "countdown" && distance !== 0) resetRound();

      if (state === "playing") {
        const speed = Math.min(14, 7.2 + currentScore / 850);
        distance += speed * dt;
        currentScore = Math.floor(distance / 8);
        setScore(currentScore);

        const targetH = commandRef.current === "duck" ? 42 : 66;
        ducking = commandRef.current === "duck" && playerY >= GROUND_Y - 70;
        if (commandRef.current === "jump" && playerY >= GROUND_Y - targetH - 3) {
          velocityY = -15.8;
          commandRef.current = "none";
          for (let i = 0; i < 6; i++) particles.push({ x: 155, y: GROUND_Y - 3, vx: -Math.random() * 4, life: 1 });
        }
        velocityY += 0.9 * dt;
        playerY += velocityY * dt;
        const floorY = GROUND_Y - (ducking ? 42 : 66);
        if (playerY > floorY) { playerY = floorY; velocityY = 0; }

        nextObstacle -= speed * dt;
        if (nextObstacle < 0) {
          const canBird = currentScore > 120;
          const type = canBird && Math.random() > .72 ? "bird" : Math.random() > .5 ? "books" : "cone";
          if (type === "bird") obstacles.push({ x: GAME_WIDTH + 20, y: GROUND_Y - 91, w: 52, h: 34, type });
          else if (type === "books") obstacles.push({ x: GAME_WIDTH + 20, y: GROUND_Y - 48, w: 50, h: 48, type });
          else obstacles.push({ x: GAME_WIDTH + 20, y: GROUND_Y - 58, w: 50, h: 58, type });
          nextObstacle = 460 + Math.random() * 430 - Math.min(130, currentScore * .18);
        }
        obstacles.forEach((o) => o.x -= speed * dt);
        obstacles = obstacles.filter((o) => o.x > -100);
        particles.forEach((p) => { p.x += p.vx * dt; p.life -= .035 * dt; });
        particles = particles.filter((p) => p.life > 0);

        const ph = ducking ? 42 : 66;
        const px = 148, py = playerY + 5, pw = ducking ? 55 : 35;
        const hit = obstacles.some((o) => px < o.x + o.w - 7 && px + pw > o.x + 7 && py < o.y + o.h - 5 && py + ph > o.y + 5);
        if (hit) {
          setGameState("gameover");
          const newBest = Math.max(best, currentScore);
          setBest(newBest);
          localStorage.setItem("corrida-campus-recorde", String(newBest));
          if (navigator.vibrate) navigator.vibrate(120);
        }
      }

      drawBackground(time);
      particles.forEach((p) => { ctx.globalAlpha = p.life; ctx.fillStyle = "#fff0c5"; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      obstacles.forEach(drawObstacle);
      drawPlayer(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [best]);

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">U</span><span>UNC <b>EM MOVIMENTO</b></span></div>
        <div className="event-tag"><span /> JOGO EXPERIMENTAL · EVENTO UNIVERSITÁRIO</div>
        <button className="sound-button" aria-label="Som">♪</button>
      </header>

      <section className="game-shell">
        <div className="game-heading">
          <div><p className="eyebrow">DESAFIO DO CAMPUS</p><h1>Corrida para a aula!</h1></div>
          <div className="scoreboard"><div><small>PONTOS</small><strong>{String(score).padStart(4, "0")}</strong></div><i /><div><small>RECORDE</small><strong>{String(best).padStart(4, "0")}</strong></div></div>
        </div>

        <div className="stage-wrap">
          <canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} aria-label="Jogo Corrida para a aula" />

          {gameState === "intro" && (
            <div className="overlay intro-card">
              <span className="mini-label">PREPARE-SE</span>
              <h2>Chegue na aula<br /><em>sem perder a chamada!</em></h2>
              <p>Pule os obstáculos do campus e agache<br />para escapar dos pássaros.</p>
              <div className="moves"><span><b>↑</b> PULE</span><span><b>↓</b> AGACHE</span></div>
              <button className="primary" onClick={startGame}>COMEÇAR CORRIDA <span>→</span></button>
              <button className="camera-link" onClick={enableCamera} disabled={poseStatus === "loading" || poseStatus === "ready"}>
                <span className={`status-dot ${poseStatus}`} /> {poseStatus === "ready" ? "CÂMERA ATIVA" : poseStatus === "loading" ? "ATIVANDO CÂMERA..." : "ATIVAR CONTROLE POR CÂMERA"}
              </button>
            </div>
          )}

          {gameState === "countdown" && <div className="overlay countdown"><span>{countdown}</span><p>PREPARE O CORPO</p></div>}
          {gameState === "gameover" && (
            <div className="overlay intro-card game-over">
              <span className="mini-label">FIM DA CORRIDA</span><h2>O professor<br /><em>fechou a porta!</em></h2>
              <p>Você fez <b>{score} pontos</b>. Tente outra vez!</p>
              <button className="primary" onClick={startGame}>JOGAR DE NOVO <span>↻</span></button>
            </div>
          )}

          <div className="camera-panel">
            <div className="camera-frame">
              <video ref={videoRef} muted playsInline className={cameraOpen ? "visible" : ""} />
              {!cameraOpen && <div className="camera-placeholder"><span>◎</span><small>CÂMERA</small></div>}
              <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
            </div>
            <div className={`motion-status ${poseStatus}`}><i /> {motion}</div>
          </div>
        </div>

        <div className="instructions">
          <div><span className="number">01</span><p><b>FIQUE DE FRENTE</b><small>Afaste-se para a câmera ver seu corpo</small></p></div>
          <div><span className="number">02</span><p><b>PULE E AGACHE</b><small>Seus movimentos controlam o aluno</small></p></div>
          <div><span className="number">03</span><p><b>FAÇA MAIS PONTOS</b><small>A corrida acelera a cada obstáculo</small></p></div>
        </div>
      </section>

      <footer><span>PRIVACIDADE: A imagem da câmera é processada somente neste navegador e não é gravada.</span><b>ESPAÇO LIVRE RECOMENDADO: 2 METROS</b></footer>
    </main>
  );
}
