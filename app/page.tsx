"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameState = "intro" | "countdown" | "playing" | "gameover";
type PoseStatus = "off" | "loading" | "ready" | "error";
type GestureMode = "standard" | "accessible";

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
  const poseCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<InstanceType<NonNullable<typeof window.Pose>> | null>(null);
  const poseLoopRef = useRef<number>(0);
  const commandRef = useRef<"none" | "jump" | "duck">("none");
  const gameStateRef = useRef<GameState>("intro");
  const [gameState, setGameState] = useState<GameState>("intro");
  const [poseStatus, setPoseStatus] = useState<PoseStatus>("off");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState(1);
  const [countdown, setCountdown] = useState(3);
  const [motion, setMotion] = useState("FIQUE EM POSIÇÃO");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [calibrating, setCalibrating] = useState(false);
  const calibratingRef = useRef(false);
  const [calibrated, setCalibrated] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [gestureMode, setGestureMode] = useState<GestureMode>("standard");
  const gestureModeRef = useRef<GestureMode>("standard");
  const calibrationFramesRef = useRef(0);
  const gestureFramesRef = useRef({ jump: 0, duck: 0 });
  const [timeLeft, setTimeLeft] = useState(90);
  const [ranking, setRanking] = useState<number[]>([]);
  const baselineRef = useRef<{ shoulderY: number; hipY: number } | null>(null);
  const cooldownRef = useRef(0);

  useEffect(() => {
    const saved = Number(localStorage.getItem("corrida-campus-recorde") || 0);
    setBest(saved);
    setRanking(JSON.parse(localStorage.getItem("corrida-campus-ranking") || "[]"));
  }, []);

  const clearScoreHistory = useCallback(() => {
    if (!window.confirm("Deseja apagar todo o ranking local e o recorde?")) return;

    localStorage.removeItem("corrida-campus-recorde");
    localStorage.removeItem("corrida-campus-ranking");
    setBest(0);
    setRanking([]);
  }, []);

  useEffect(() => { gestureModeRef.current = gestureMode; }, [gestureMode]);
  useEffect(() => { calibratingRef.current = calibrating; }, [calibrating]);

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
    const overlay = poseCanvasRef.current;
    const overlayCtx = overlay?.getContext("2d");
    if (overlay && overlayCtx) overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    if (!lm || lm.length < 29) {
      calibrationFramesRef.current = 0;
      setMotion("CORPO NÃO ENCONTRADO");
      return;
    }
    if (overlay && overlayCtx) {
      const connections = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
      overlayCtx.strokeStyle = "#f5c542"; overlayCtx.lineWidth = 4; overlayCtx.lineCap = "round";
      connections.forEach(([a,b]) => { overlayCtx.beginPath(); overlayCtx.moveTo(lm[a].x * overlay.width, lm[a].y * overlay.height); overlayCtx.lineTo(lm[b].x * overlay.width, lm[b].y * overlay.height); overlayCtx.stroke(); });
      overlayCtx.fillStyle = "#fff8e7";
      [11,12,13,14,15,16,23,24,25,26,27,28].forEach((i) => { overlayCtx.beginPath(); overlayCtx.arc(lm[i].x * overlay.width, lm[i].y * overlay.height, 4, 0, Math.PI * 2); overlayCtx.fill(); });
    }
    const shoulderY = (lm[11].y + lm[12].y) / 2;
    const hipY = (lm[23].y + lm[24].y) / 2;
    const ankleY = (lm[27].y + lm[28].y) / 2;
    const now = performance.now();
    const required = [11,12,23,24,27,28];
    const visible = required.every((i) => (lm[i].visibility ?? 1) > .55);
    const centered = ((lm[11].x + lm[12].x) / 2) > .25 && ((lm[11].x + lm[12].x) / 2) < .75;

    if (calibratingRef.current) {
      if (visible && centered && ankleY > .72) {
        calibrationFramesRef.current += 1;
        const progress = Math.min(100, Math.round(calibrationFramesRef.current / 75 * 100));
        setCalibrationProgress(progress);
        setMotion("FIQUE PARADO");
        if (calibrationFramesRef.current >= 75) {
          baselineRef.current = { shoulderY, hipY };
          calibratingRef.current = false; setCalibrated(true); setCalibrating(false); setPoseStatus("ready"); setMotion("CALIBRADO");
        }
      } else {
        calibrationFramesRef.current = Math.max(0, calibrationFramesRef.current - 3);
        setCalibrationProgress(Math.round(calibrationFramesRef.current / 75 * 100));
        setMotion(!visible ? "MOSTRE O CORPO TODO" : "FIQUE NO CENTRO");
      }
      return;
    }

    if (!baselineRef.current || gameStateRef.current !== "playing") {
      baselineRef.current = { shoulderY, hipY };
      setMotion("CORPO DETECTADO");
      return;
    }

    const baseline = baselineRef.current;
    baseline.shoulderY = baseline.shoulderY * 0.985 + shoulderY * 0.015;
    baseline.hipY = baseline.hipY * 0.985 + hipY * 0.015;
    const bodyHeight = Math.max(0.18, ankleY - shoulderY);
    const armsRaised = lm[15].y < lm[11].y && lm[16].y < lm[12].y;
    const torsoLean = Math.abs(((lm[11].x + lm[12].x) / 2) - ((lm[23].x + lm[24].x) / 2)) > .075;
    const jumped = gestureModeRef.current === "accessible" ? armsRaised : baseline.hipY - hipY > bodyHeight * 0.055;
    const ducked = gestureModeRef.current === "accessible" ? torsoLean : shoulderY - baseline.shoulderY > bodyHeight * 0.09;
    gestureFramesRef.current.jump = jumped ? gestureFramesRef.current.jump + 1 : 0;
    gestureFramesRef.current.duck = ducked ? gestureFramesRef.current.duck + 1 : 0;

    if (gestureFramesRef.current.jump >= 3 && now > cooldownRef.current) {
      commandRef.current = "jump";
      cooldownRef.current = now + 700;
      gestureFramesRef.current.jump = 0;
      setMotion("PULO!");
    } else if (gestureFramesRef.current.duck >= 3) {
      commandRef.current = "duck";
      setMotion("AGACHOU!");
    } else {
      if (commandRef.current === "duck") commandRef.current = "none";
      setMotion("CORRENDO");
    }
  }, []);

  const enableCamera = useCallback(async () => {
    try {
      setCameraError("");
      setPoseStatus("loading");
      setMotion("AGUARDANDO PERMISSÃO...");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("CAMERA_UNAVAILABLE");
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: "camera" as PermissionName }).catch(() => null);
        if (cameraPermission?.state === "denied") throw new DOMException("Permissão bloqueada", "NotAllowedError");
      }
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        }),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("CAMERA_TIMEOUT")), 8000)),
      ]);
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      setCameraOpen(true);
      setMotion("INICIANDO VÍDEO...");
      await video.play().catch(() => undefined);

      if (!window.Pose) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "/mediapipe/pose/pose.js";
          script.crossOrigin = "anonymous";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Falha ao carregar o modelo"));
          document.head.appendChild(script);
        });
      }
      if (!window.Pose) throw new Error("Modelo indisponível");

      const pose = new window.Pose({
        locateFile: (file) => `/mediapipe/pose/${file}`,
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
      setCalibrated(false); calibratingRef.current = true; setCalibrating(true); setCalibrationProgress(0); calibrationFramesRef.current = 0;
      setMotion("ENTRE NO ENQUADRAMENTO");

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
      const message = error instanceof Error ? error.message : "";
      const permissionDenied = error instanceof DOMException && error.name === "NotAllowedError";
      setCameraError(permissionDenied
        ? "A permissão da câmera foi negada. Libere a câmera nas configurações do navegador e tente novamente."
        : message === "CAMERA_TIMEOUT" || message === "CAMERA_UNAVAILABLE"
          ? "Esta prévia não conseguiu acessar a webcam. Abra http://localhost:3000 no Google Chrome para usar os movimentos."
          : "Não foi possível iniciar a webcam. Verifique se outra aplicação está usando a câmera.");
      setMotion("CÂMERA INDISPONÍVEL");
    }
  }, [interpretPose]);

  useEffect(() => () => {
    cancelAnimationFrame(poseLoopRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    poseRef.current?.close();
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setPhase(1);
    setGameState("countdown");
    setCountdown(3);
    setTimeLeft(90);
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

  const recalibrate = useCallback(() => {
    if (!cameraOpen) return;
    baselineRef.current = null; calibrationFramesRef.current = 0;
    setCalibrationProgress(0); setCalibrated(false); calibratingRef.current = true; setCalibrating(true); setMotion("ENTRE NO ENQUADRAMENTO");
  }, [cameraOpen]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => undefined);
    else document.exitFullscreen().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!calibrated || gameStateRef.current !== "intro") return;
    const timer = window.setTimeout(startGame, 1200);
    return () => window.clearTimeout(timer);
  }, [calibrated, startGame]);

  useEffect(() => {
    const operatorKeys = (event: KeyboardEvent) => {
      if (event.code === "KeyR") recalibrate();
      if (event.code === "KeyF") toggleFullscreen();
    };
    window.addEventListener("keydown", operatorKeys);
    return () => window.removeEventListener("keydown", operatorKeys);
  }, [recalibrate, toggleFullscreen]);

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
    let activePhase = 1;
    let phaseElapsedMs = 0;
    let roundElapsedMs = 0;
    let displayedSecond = 90;
    let roundFinished = false;
    let phaseTransitionUntil = 0;
    let nextObstacle = 680;
    type ObstacleType = "cone" | "books" | "bird" | "fossil" | "plinth" | "lamp";
    let obstacles: { x: number; y: number; w: number; h: number; type: ObstacleType }[] = [];
    let particles: { x: number; y: number; vx: number; life: number }[] = [];
    const scenery = {
      building: new Image(),
      grass: new Image(),
      road: new Image(),
      museum: new Image(),
    };
    scenery.building.src = "/scenarios/predio-unc.png";
    scenery.grass.src = "/scenarios/grama.png";
    scenery.road.src = "/scenarios/estrada.png";
    scenery.museum.src = "/scenarios/museu/museu-paleontologia.png";

    const resetRound = () => {
      distance = 0;
      currentScore = 0;
      activePhase = 1;
      phaseElapsedMs = 0;
      roundElapsedMs = 0;
      displayedSecond = 90;
      roundFinished = false;
      setTimeLeft(90);
      phaseTransitionUntil = 0;
      setPhase(1);
      playerY = GROUND_Y - 66;
      velocityY = 0;
      obstacles = [];
      particles = [];
      nextObstacle = 760;
    };

    const finishRound = () => {
      if (roundFinished) return;
      roundFinished = true;
      setGameState("gameover");
      const newBest = Math.max(best, currentScore);
      setBest(newBest);
      localStorage.setItem("corrida-campus-recorde", String(newBest));
      const scores = [...JSON.parse(localStorage.getItem("corrida-campus-ranking") || "[]"), currentScore]
        .sort((a: number, b: number) => b - a).slice(0, 5);
      localStorage.setItem("corrida-campus-ranking", JSON.stringify(scores));
      setRanking(scores);
      if (navigator.vibrate) navigator.vibrate(120);
    };

    const drawCampus = () => {
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

    const drawMuseum = () => {
      ctx.fillStyle = "#1b1817";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      if (scenery.museum.complete && scenery.museum.naturalWidth) {
        const cropWidth = 1370;
        const maxPan = Math.max(0, scenery.museum.naturalWidth - cropWidth);
        const panProgress = (Math.sin(distance * 0.0009) + 1) / 2;
        const sourceX = panProgress * maxPan;
        ctx.drawImage(scenery.museum, sourceX, 0, cropWidth, 700, 0, 0, GAME_WIDTH, GAME_HEIGHT);
      }
      const vignette = ctx.createRadialGradient(550, 270, 180, 550, 270, 650);
      vignette.addColorStop(0, "rgba(255,205,112,0)");
      vignette.addColorStop(1, "rgba(8,7,8,.38)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    };

    const drawBackground = () => {
      if (activePhase === 1) drawCampus();
      else drawMuseum();
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
        if (o.type === "fossil") {
          ctx.fillStyle = "#8b7660"; ctx.fillRect(o.x - 5, o.y + o.h - 10, o.w + 10, 10);
          ctx.strokeStyle = "#ead2a0"; ctx.lineWidth = 9; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(o.x + 8, o.y + 25); ctx.lineTo(o.x + o.w - 8, o.y + o.h - 15); ctx.moveTo(o.x + 8, o.y + o.h - 15); ctx.lineTo(o.x + o.w - 8, o.y + 22); ctx.stroke();
          ctx.fillStyle = "#ead2a0"; [12, o.w - 12].forEach((dx) => { ctx.beginPath(); ctx.arc(o.x + dx, o.y + 22, 8, 0, Math.PI * 2); ctx.fill(); });
          return;
        }
        if (o.type === "plinth") {
          ctx.fillStyle = "#4b4642"; ctx.fillRect(o.x, o.y + 9, o.w, o.h - 9);
          ctx.fillStyle = "#91877c"; ctx.fillRect(o.x - 5, o.y, o.w + 10, 12); ctx.fillRect(o.x - 5, o.y + o.h - 7, o.w + 10, 7);
          ctx.fillStyle = "#d4bc85"; ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y - 3, 12, 0, Math.PI * 2); ctx.fill();
          return;
        }
        if (o.type === "lamp") {
          ctx.strokeStyle = "#17191a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(o.x + o.w / 2, o.y - 28); ctx.lineTo(o.x + o.w / 2, o.y + 4); ctx.stroke();
          ctx.fillStyle = "#26282a"; ctx.beginPath(); ctx.moveTo(o.x + 5, o.y + 5); ctx.lineTo(o.x + o.w - 5, o.y + 5); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.lineTo(o.x, o.y + o.h); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#ffe092"; ctx.fillRect(o.x + 9, o.y + o.h - 5, o.w - 18, 6);
          return;
        }
        ctx.fillStyle = "#243f3d"; ctx.beginPath(); ctx.arc(o.x + 22, o.y + 17, 13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#243f3d"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(o.x + 16, o.y + 15); ctx.lineTo(o.x, o.y + 2); ctx.moveTo(o.x + 27, o.y + 15); ctx.lineTo(o.x + 45, o.y + 2); ctx.stroke();
        ctx.fillStyle = "#f5c542"; ctx.beginPath(); ctx.moveTo(o.x + 34, o.y + 14); ctx.lineTo(o.x + 47, o.y + 18); ctx.lineTo(o.x + 34, o.y + 22); ctx.fill();
      }
    };

    const loop = (time: number) => {
      const elapsedMs = Math.min(50, time - last);
      const dt = elapsedMs / 16.67;
      last = time;
      const state = gameStateRef.current;
      if (state === "countdown" && distance !== 0) resetRound();

      const transitioning = time < phaseTransitionUntil;
      if (state === "playing" && !transitioning) {
        const speed = 7.2;
        roundElapsedMs += elapsedMs;
        const seconds = Math.max(0, 90 - Math.floor(roundElapsedMs / 1000));
        if (seconds !== displayedSecond) { displayedSecond = seconds; setTimeLeft(seconds); }
        if (roundElapsedMs >= 90000) { finishRound(); }
        distance += speed * dt;
        currentScore = Math.floor(distance / 8);
        setScore(currentScore);
        phaseElapsedMs += elapsedMs;

        if (phaseElapsedMs >= 40000) {
          activePhase = activePhase === 1 ? 2 : 1;
          phaseElapsedMs = 0;
          phaseTransitionUntil = time + 2100;
          obstacles = [];
          nextObstacle = activePhase === 2 ? 880 : 650;
          setPhase(activePhase);
        }

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
          const obstacleRoll = Math.random();
          const type: ObstacleType = activePhase === 2
            ? (obstacleRoll > .88 ? "lamp" : obstacleRoll > .42 ? "fossil" : "plinth")
            : (obstacleRoll > .76 ? "bird" : obstacleRoll > .42 ? "books" : "cone");
          if (type === "bird") obstacles.push({ x: GAME_WIDTH + 20, y: GROUND_Y - 91, w: 52, h: 34, type });
          else if (type === "lamp") obstacles.push({ x: GAME_WIDTH + 20, y: GROUND_Y - 96, w: 56, h: 39, type });
          else if (type === "fossil") obstacles.push({ x: GAME_WIDTH + 20, y: GROUND_Y - 44, w: 60, h: 44, type });
          else if (type === "plinth") obstacles.push({ x: GAME_WIDTH + 20, y: GROUND_Y - 50, w: 46, h: 50, type });
          else if (type === "books") obstacles.push({ x: GAME_WIDTH + 20, y: GROUND_Y - 48, w: 50, h: 48, type });
          else obstacles.push({ x: GAME_WIDTH + 20, y: GROUND_Y - 58, w: 50, h: 58, type });
          nextObstacle = activePhase === 2
            ? 780 + Math.random() * 300
            : 560 + Math.random() * 360;
        }
        obstacles.forEach((o) => o.x -= speed * dt);
        obstacles = obstacles.filter((o) => o.x > -100);
        particles.forEach((p) => { p.x += p.vx * dt; p.life -= .035 * dt; });
        particles = particles.filter((p) => p.life > 0);

        const ph = ducking ? 42 : 66;
        const px = 148, py = playerY + 5, pw = ducking ? 55 : 35;
        const collisionInsetX = activePhase === 2 ? 16 : 7;
        const collisionInsetY = activePhase === 2 ? 11 : 5;
        const hit = obstacles.some((o) =>
          px < o.x + o.w - collisionInsetX &&
          px + pw > o.x + collisionInsetX &&
          py < o.y + o.h - collisionInsetY &&
          py + ph > o.y + collisionInsetY
        );
        if (hit) {
          finishRound();
        }
      }

      drawBackground();
      particles.forEach((p) => { ctx.globalAlpha = p.life; ctx.fillStyle = "#fff0c5"; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      obstacles.forEach(drawObstacle);
      drawPlayer(time);
      if (transitioning) {
        ctx.fillStyle = "rgba(10,9,8,.72)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = "#f2c56f";
        ctx.textAlign = "center";
        ctx.font = "900 18px Arial";
        ctx.fillText("MUDANÇA DE CENÁRIO", GAME_WIDTH / 2, 225);
        ctx.fillStyle = "#fff5dc";
        ctx.font = "700 54px Georgia";
        ctx.fillText(activePhase === 2 ? "Museu Paleontológico" : "Campus UNC", GAME_WIDTH / 2, 286);
        ctx.font = "800 14px Arial";
        ctx.fillStyle = "#d4c3a5";
        ctx.fillText(activePhase === 2 ? "CUIDADO COM OS FÓSSEIS!" : "DE VOLTA À CORRIDA!", GAME_WIDTH / 2, 322);
      }
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
          <div><p className="eyebrow">FASE {phase} · {phase === 1 ? "CAMPUS UNC" : "MUSEU PALEONTOLÓGICO"}</p><h1>{phase === 1 ? "Corrida para a aula!" : "Aventura entre fósseis!"}</h1></div>
          <div className="scoreboard"><div><small>TEMPO</small><strong>{String(timeLeft).padStart(2, "0")}</strong></div><i /><div><small>PONTOS</small><strong>{String(score).padStart(4, "0")}</strong></div><i /><div><small>RECORDE</small><strong>{String(best).padStart(4, "0")}</strong></div></div>
        </div>

        <div className="stage-wrap">
          <canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} aria-label="Jogo Corrida para a aula" />

          {gameState === "intro" && !calibrating && (
            <div className="overlay intro-card">
              <span className="mini-label">PREPARE-SE</span>
              <h2>Chegue na aula<br /><em>sem perder a chamada!</em></h2>
              <p>Pule os obstáculos do campus e agache<br />para escapar dos pássaros.</p>
              <div className="moves"><span><b>↑</b> PULE</span><span><b>↓</b> AGACHE</span></div>
              <div className="mode-picker" role="group" aria-label="Modo de movimento">
                <button className={gestureMode === "standard" ? "active" : ""} onClick={() => setGestureMode("standard")}>CORPO</button>
                <button className={gestureMode === "accessible" ? "active" : ""} onClick={() => setGestureMode("accessible")}>ACESSÍVEL</button>
              </div>
              <button className="primary" onClick={startGame} disabled={cameraOpen && !calibrated}>COMEÇAR CORRIDA <span>→</span></button>
              <button className="camera-link" onClick={enableCamera} disabled={poseStatus === "loading" || poseStatus === "ready"}>
                <span className={`status-dot ${poseStatus}`} /> {calibrated ? "CÂMERA CALIBRADA" : poseStatus === "loading" ? "ATIVANDO CÂMERA..." : "ATIVAR E CALIBRAR CÂMERA"}
              </button>
              {cameraError && <p className="camera-error">{cameraError}</p>}
            </div>
          )}

          {calibrating && (
            <div className="overlay calibration-card">
              <span className="mini-label">CALIBRAÇÃO</span>
              <h2>Fique no centro</h2>
              <p>A câmera precisa enxergar seus ombros, quadril e pés.<br />Fique parado até a barra completar.</p>
              <div className="body-guide"><span className="guide-head" /><span className="guide-body" /></div>
              <div className="progress"><i style={{ width: `${calibrationProgress}%` }} /></div>
              <b>{calibrationProgress}% · {motion}</b>
            </div>
          )}

          {gameState === "countdown" && <div className="overlay countdown"><span>{countdown}</span><p>PREPARE O CORPO</p></div>}
          {gameState === "gameover" && (
            <div className="overlay intro-card game-over">
              <span className="mini-label">FIM DA CORRIDA</span><h2>O professor<br /><em>fechou a porta!</em></h2>
              <p>Você fez <b>{score} pontos</b>. Tente outra vez!</p>
              <button className="primary" onClick={startGame}>JOGAR DE NOVO <span>↻</span></button>
              {ranking.length > 0 && (
                <div className="ranking">
                  <b>RANKING LOCAL</b>
                  {ranking.map((value, i) => <span key={`${value}-${i}`}>{i + 1}º <strong>{value}</strong></span>)}
                  <button className="clear-ranking" onClick={clearScoreHistory}>LIMPAR HISTÓRICO</button>
                </div>
              )}
            </div>
          )}

          <div className="camera-panel">
            <div className="camera-frame">
              <video ref={videoRef} muted playsInline className={cameraOpen ? "visible" : ""} />
              <canvas ref={poseCanvasRef} width="320" height="240" className="pose-overlay" aria-hidden="true" />
              {!cameraOpen && <div className="camera-placeholder"><span>◎</span><small>CÂMERA</small></div>}
              <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
            </div>
            <div className={`motion-status ${poseStatus}`}><i /> {motion}</div>
          </div>
          <div className="operator-tools">
            <button onClick={recalibrate} disabled={!cameraOpen}>◎ RECALIBRAR</button>
            <button onClick={toggleFullscreen}>⛶ TELA CHEIA</button>
          </div>
        </div>

        <div className="instructions">
          <div><span className="number">01</span><p><b>FIQUE DE FRENTE</b><small>Afaste-se para a câmera ver seu corpo</small></p></div>
          <div><span className="number">02</span><p><b>{gestureMode === "standard" ? "PULE E AGACHE" : "BRAÇOS E INCLINAÇÃO"}</b><small>Seus movimentos controlam o aluno</small></p></div>
          <div><span className="number">03</span><p><b>90 SEGUNDOS</b><small>Os cenários alternam a cada 40 segundos</small></p></div>
        </div>
      </section>

      <footer><span>PRIVACIDADE: A imagem é processada localmente, não é gravada e a IA funciona sem internet.</span><b>ESPAÇO LIVRE: 2 METROS · R RECALIBRA · F TELA CHEIA</b></footer>
    </main>
  );
}
