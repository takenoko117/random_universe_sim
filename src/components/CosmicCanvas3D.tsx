import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ParameterValues, UniverseSimulationResult } from '../types/physics';
import { 
  cosmicStarVertexShader, 
  cosmicStarFragmentShader 
} from '../shaders/cosmicStarShader';
import { 
  interstellarLensingVertexShader, 
  interstellarLensingFragmentShader 
} from '../shaders/interstellarLensingShader';
import { 
  Maximize2, 
  Minimize2,
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Play, 
  Pause, 
  Compass, 
  Orbit,
  CircleDot,
  Radio,
  SkipForward,
  Timer
} from 'lucide-react';
import type { MultiverseTourState } from '../hooks/useMultiverseTour';

interface CosmicCanvas3DProps {
  simulation: UniverseSimulationResult;
  parameters: ParameterValues;
  tourState?: MultiverseTourState;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/**
 * プロシージャルな発光星テクスチャ
 */
function createStarTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.18, 'rgba(235, 245, 255, 0.9)');
    gradient.addColorStop(0.45, 'rgba(129, 140, 248, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const CosmicCanvas3D: React.FC<CosmicCanvas3DProps> = ({ 
  simulation, 
  parameters,
  tourState,
  isFullscreen: isExternalFullscreen,
  onToggleFullscreen
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<ParameterValues>(parameters);
  const simulationRef = useRef<UniverseSimulationResult>(simulation);

  // フルスクリーン状態 (外部制御または内部制御)
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const isFullscreen = isExternalFullscreen !== undefined ? isExternalFullscreen : localFullscreen;

  // コントロールステート
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [showSpacetimeGrid, setShowSpacetimeGrid] = useState(true);
  const [showCosmicWeb, setShowCosmicWeb] = useState(true);
  const [showBlackHoleLens, setShowBlackHoleLens] = useState(true);
  const [activePresetView, setActivePresetView] = useState<'blackhole' | 'galaxy' | 'supercluster'>('galaxy');
  const [currentScaleText, setCurrentScaleText] = useState('銀河系スケール (約10万光年)');

  const isPlayingRef = useRef(true);
  const speedRef = useRef(1.0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    speedRef.current = speedMultiplier;
  }, [isPlaying, speedMultiplier]);

  useEffect(() => {
    parametersRef.current = parameters;
    simulationRef.current = simulation;
  }, [parameters, simulation]);

  // フルスクリーン操作ハンドラ
  const handleEnterFullscreen = async () => {
    setLocalFullscreen(true);
    if (onToggleFullscreen && !isExternalFullscreen) onToggleFullscreen();
    try {
      if (wrapperRef.current && !document.fullscreenElement) {
        await wrapperRef.current.requestFullscreen();
      }
    } catch {
      // ブラウザ制限等時はCSSベース全画面で動作
    }
  };

  const handleExitFullscreen = async () => {
    setLocalFullscreen(false);
    if (onToggleFullscreen && isExternalFullscreen) onToggleFullscreen();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      handleExitFullscreen();
    } else {
      handleEnterFullscreen();
    }
  };

  // キーボードショートカット (ESC で解除, F で全画面切り替え)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;

      if (e.key === 'Escape' && isFullscreen) {
        handleExitFullscreen();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // ブラウザのネイティブ全画面変更イベントの監視
  useEffect(() => {
    const onFsChange = () => {
      const isDocFs = !!document.fullscreenElement;
      if (!isDocFs && isFullscreen) {
        setLocalFullscreen(false);
        if (onToggleFullscreen && isExternalFullscreen) onToggleFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isFullscreen, isExternalFullscreen, onToggleFullscreen]);

  // Three.js シーン・レンダーターゲット参照
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    starMaterial: THREE.ShaderMaterial;
    bgRenderTarget: THREE.WebGLRenderTarget;
    postScene: THREE.Scene;
    postCamera: THREE.OrthographicCamera;
    lensingMaterial: THREE.ShaderMaterial;
    spacetimeGrid: THREE.LineSegments;
    spacetimeGeometry: THREE.BufferGeometry;
    cosmicWebLines: THREE.LineSegments;
    cameraTargetDistance: number;
    currentDistance: number;
    rotY: number;
    rotX: number;
    isDragging: boolean;
    animationFrameId?: number;
  } | null>(null);

  // 視点切り替え
  const handleViewPreset = (view: 'blackhole' | 'galaxy' | 'supercluster') => {
    setActivePresetView(view);
    if (!sceneRef.current) return;
    if (view === 'blackhole') {
      sceneRef.current.cameraTargetDistance = 38;
      sceneRef.current.rotX = 0.16;
    } else if (view === 'galaxy') {
      sceneRef.current.cameraTargetDistance = 180;
      sceneRef.current.rotX = 0.35;
    } else {
      sceneRef.current.cameraTargetDistance = 1100;
      sceneRef.current.rotX = 0.65;
    }
  };

  const handleZoom = (delta: number) => {
    if (!sceneRef.current) return;
    sceneRef.current.cameraTargetDistance = Math.max(
      28,
      Math.min(1600, sceneRef.current.cameraTargetDistance + delta)
    );
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040a, 0.0006);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 8000);
    camera.position.set(0, 55, 180);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    // 3. オフスクリーン・レンダーターゲット (Pass 1: 星空と宇宙背景を描画)
    const dpr = Math.min(window.devicePixelRatio, 2);
    const bgRenderTarget = new THREE.WebGLRenderTarget(width * dpr, height * dpr, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType // HDRハイダイナミックレンジ
    });

    // 4. 280,000個のメガスケールGPU星・2,800個以上の超銀河団・コズミックウェブ
    const starCount = 280000;
    const positions = new Float32Array(starCount * 3);
    const localPositions = new Float32Array(starCount * 3);
    const galaxyCenters = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const clusterTypes = new Float32Array(starCount);
    const spinSpeeds = new Float32Array(starCount);
    const orbitSpeeds = new Float32Array(starCount);

    const starTexture = createStarTexture();

    // 3Dオイラー回転ヘルパー (pitch, roll, yaw)
    const rotateLocal = (x: number, y: number, z: number, pitch: number, roll: number, yaw: number): [number, number, number] => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y1 = y;

      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const y2 = y1 * cp - z1 * sp;
      const z2 = y1 * sp + z1 * cp;
      const x2 = x1;

      const cr = Math.cos(roll), sr = Math.sin(roll);
      const x3 = x2 * cr - y2 * sr;
      const y3 = x2 * sr + y2 * cr;
      const z3 = z2;
      return [x3, y3, z3];
    };

    let starIdx = 0;
    const addStar = (
      lx: number, ly: number, lz: number,
      cx: number, cy: number, cz: number,
      cr: number, cg: number, cb: number,
      size: number,
      spinSpeed: number,
      orbitSpeed: number,
      clusterType: number
    ) => {
      if (starIdx >= starCount) return;
      localPositions[starIdx * 3] = lx;
      localPositions[starIdx * 3 + 1] = ly;
      localPositions[starIdx * 3 + 2] = lz;

      galaxyCenters[starIdx * 3] = cx;
      galaxyCenters[starIdx * 3 + 1] = cy;
      galaxyCenters[starIdx * 3 + 2] = cz;

      positions[starIdx * 3] = cx + lx;
      positions[starIdx * 3 + 1] = cy + ly;
      positions[starIdx * 3 + 2] = cz + lz;

      colors[starIdx * 3] = cr;
      colors[starIdx * 3 + 1] = cg;
      colors[starIdx * 3 + 2] = cb;

      sizes[starIdx] = size;
      spinSpeeds[starIdx] = spinSpeed;
      orbitSpeeds[starIdx] = orbitSpeed;
      clusterTypes[starIdx] = clusterType;

      starIdx++;
    };

    // =============================================================
    // [PART A] 近景〜中景の主要メガ銀河 (約30個 / 計約 88,000星)
    // =============================================================

    // 1. 主銀河 (The Central Grand Spiral) - 25,000星
    for (let i = 0; i < 6000; i++) {
      const r = Math.pow(Math.random(), 2.2) * 26 + 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.7;
      const lx = r * Math.cos(phi) * Math.cos(theta);
      const ly = r * Math.sin(phi) * 0.45;
      const lz = r * Math.cos(phi) * Math.sin(theta);
      addStar(lx, ly, lz, 0, 0, 0, 1.0, 0.86, 0.58, Math.random() * 2.8 + 2.0, 1.0, 0.0, 0.0);
    }
    for (let i = 0; i < 19000; i++) {
      const arm = i % 4;
      const armOffset = (arm * Math.PI * 2) / 4;
      const r = Math.pow(Math.random(), 1.7) * 135 + 12;
      const angle = r * 0.085 + armOffset + (Math.random() - 0.5) * 0.55;
      const lx = Math.cos(angle) * r;
      const lz = Math.sin(angle) * r;
      const ly = (Math.random() - 0.5) * (14 - (r / 135) * 10);
      const rnd = Math.random();
      let cr = 0.55, cg = 0.82, cb = 1.0;
      if (rnd > 0.85) { cr = 1.0; cg = 0.45; cb = 0.7; }
      else if (rnd > 0.35) { cr = 0.6; cg = 0.85; cb = 1.0; }
      else { cr = 0.95; cg = 0.92; cb = 0.7; }
      addStar(lx, ly, lz, 0, 0, 0, cr, cg, cb, Math.random() * 2.6 + 1.8, 1.0, 0.0, 0.0);
    }

    // 2. アンドロメダ型大型傾斜銀河 (M31) - 10,000星
    const andCenter: [number, number, number] = [-170, 45, 120];
    const andP = 0.6, andR = 0.4, andY = 0.3;
    for (let i = 0; i < 2500; i++) {
      const r = Math.pow(Math.random(), 2.0) * 18 + 1.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.6;
      const [lx, ly, lz] = rotateLocal(r * Math.cos(phi) * Math.cos(theta), r * Math.sin(phi) * 0.5, r * Math.cos(phi) * Math.sin(theta), andP, andR, andY);
      addStar(lx, ly, lz, andCenter[0], andCenter[1], andCenter[2], 1.0, 0.9, 0.72, Math.random() * 2.5 + 2.0, 0.85, 0.75, 1.0);
    }
    for (let i = 0; i < 7500; i++) {
      const arm = i % 2;
      const r = Math.pow(Math.random(), 1.6) * 65 + 10;
      const angle = r * 0.12 + arm * Math.PI + (Math.random() - 0.5) * 0.5;
      const [lx, ly, lz] = rotateLocal(Math.cos(angle) * r, (Math.random() - 0.5) * 6, Math.sin(angle) * r, andP, andR, andY);
      addStar(lx, ly, lz, andCenter[0], andCenter[1], andCenter[2], 0.6, 0.85, 1.0, Math.random() * 2.4 + 1.6, 0.85, 0.75, 1.0);
    }

    // 3. ソンブレロ型エッジオン銀河 (M104) - 8,000星
    const somCenter: [number, number, number] = [185, -40, -115];
    const somP = 1.45, somR = 0.15, somY = -0.5;
    for (let i = 0; i < 3500; i++) {
      const r = Math.pow(Math.random(), 2.0) * 24 + 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const [lx, ly, lz] = rotateLocal(r * Math.cos(phi) * Math.cos(theta), r * Math.sin(phi) * 0.65, r * Math.cos(phi) * Math.sin(theta), somP, somR, somY);
      addStar(lx, ly, lz, somCenter[0], somCenter[1], somCenter[2], 1.0, 0.82, 0.5, Math.random() * 2.8 + 1.8, 1.2, 0.65, 1.0);
    }
    for (let i = 0; i < 4500; i++) {
      const r = Math.pow(Math.random(), 1.4) * 58 + 8;
      const theta = Math.random() * Math.PI * 2;
      const [lx, ly, lz] = rotateLocal(Math.cos(theta) * r, (Math.random() - 0.5) * 3.5, Math.sin(theta) * r, somP, somR, somY);
      addStar(lx, ly, lz, somCenter[0], somCenter[1], somCenter[2], 0.9, 0.92, 1.0, Math.random() * 2.2 + 1.5, 1.2, 0.65, 1.0);
    }

    // 4. 車輪銀河 (Cartwheel Ring Galaxy) - 6,000星
    const cwCenter: [number, number, number] = [-95, 85, -175];
    const cwP = 0.45, cwR = -0.5, cwY = 0.2;
    for (let i = 0; i < 4000; i++) {
      const ringR = 34 + (Math.random() - 0.5) * 8.5;
      const theta = Math.random() * Math.PI * 2;
      const [lx, ly, lz] = rotateLocal(Math.cos(theta) * ringR, (Math.random() - 0.5) * 4.0, Math.sin(theta) * ringR, cwP, cwR, cwY);
      addStar(lx, ly, lz, cwCenter[0], cwCenter[1], cwCenter[2], 0.45, 0.88, 1.0, Math.random() * 3.0 + 2.0, 0.95, 0.7, 1.0);
    }
    for (let i = 0; i < 2000; i++) {
      const r = Math.pow(Math.random(), 2.0) * 11 + 1.0;
      const theta = Math.random() * Math.PI * 2;
      const [lx, ly, lz] = rotateLocal(Math.cos(theta) * r, (Math.random() - 0.5) * 5.0, Math.sin(theta) * r, cwP, cwR, cwY);
      addStar(lx, ly, lz, cwCenter[0], cwCenter[1], cwCenter[2], 1.0, 0.8, 0.4, Math.random() * 2.6 + 1.8, 0.95, 0.7, 1.0);
    }

    // 5. 触角銀河 (Antennae Galaxies) - 8,000星
    const antA: [number, number, number] = [135, 60, 140];
    const antB: [number, number, number] = [155, 42, 155];
    for (let i = 0; i < 3000; i++) {
      const r = Math.pow(Math.random(), 1.8) * 22 + 1.0;
      const theta = Math.random() * Math.PI * 2;
      const [lx, ly, lz] = rotateLocal(Math.cos(theta) * r, (Math.random() - 0.5) * (6 - r * 0.15), Math.sin(theta) * r, 0.4, 0.3, 0.5);
      addStar(lx, ly, lz, antA[0], antA[1], antA[2], 1.0, 0.38, 0.75, Math.random() * 2.8 + 1.8, 1.1, 0.55, 1.0);
    }
    for (let i = 0; i < 3000; i++) {
      const r = Math.pow(Math.random(), 1.8) * 20 + 1.0;
      const theta = Math.random() * Math.PI * 2;
      const [lx, ly, lz] = rotateLocal(Math.cos(theta) * r, (Math.random() - 0.5) * (5 - r * 0.15), Math.sin(theta) * r, -0.5, -0.2, -0.4);
      addStar(lx, ly, lz, antB[0], antB[1], antB[2], 0.4, 0.88, 1.0, Math.random() * 2.8 + 1.8, -1.0, 0.55, 1.0);
    }
    for (let i = 0; i < 2000; i++) {
      const isA = i % 2 === 0;
      const t = Math.random();
      const len = t * 75 + 10;
      const [cx, cy, cz] = isA ? antA : antB;
      const sign = isA ? -1 : 1;
      const lx = sign * Math.cos(t * 1.8) * len;
      const ly = sign * Math.sin(t * 1.8) * (len * 0.6) + (Math.random() - 0.5) * 4.0;
      const lz = (t * 40 * sign) + (Math.random() - 0.5) * 4.0;
      addStar(lx, ly, lz, cx, cy, cz, 0.6, 0.82, 1.0, Math.random() * 2.5 + 1.6, 0.4, 0.55, 1.0);
    }

    // 6. 大棒渦巻銀河 (Barred Spiral NGC 1300) - 7,000星
    const barCenter: [number, number, number] = [-210, -55, 85];
    const barP = -0.4, barR = 0.6, barY = 0.8;
    for (let i = 0; i < 2800; i++) {
      const barLen = (Math.random() - 0.5) * 46;
      const [lx, ly, lz] = rotateLocal(barLen, (Math.random() - 0.5) * 4.5, (Math.random() - 0.5) * 8.5, barP, barR, barY);
      addStar(lx, ly, lz, barCenter[0], barCenter[1], barCenter[2], 1.0, 0.88, 0.55, Math.random() * 2.6 + 1.8, 1.0, 0.5, 1.0);
    }
    for (let i = 0; i < 4200; i++) {
      const side = (i % 2 === 0) ? 1 : -1;
      const t = Math.pow(Math.random(), 1.4) * 42 + 2;
      const angle = (t * 0.085) * side;
      const armX = side * 23 + Math.sin(angle) * t * side;
      const armZ = (1 - Math.cos(angle)) * t * side * 1.3;
      const [lx, ly, lz] = rotateLocal(armX, (Math.random() - 0.5) * 4.0, armZ, barP, barR, barY);
      addStar(lx, ly, lz, barCenter[0], barCenter[1], barCenter[2], 0.5, 0.8, 1.0, Math.random() * 2.4 + 1.6, 1.0, 0.5, 1.0);
    }

    // 7. 超巨大楕円銀河 (M87) - 6,000星
    const ellipCenter: [number, number, number] = [75, -110, 205];
    for (let i = 0; i < 6000; i++) {
      const r = Math.pow(Math.random(), 2.4) * 52 + 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const lx = r * Math.cos(phi) * Math.cos(theta) * 1.15;
      const ly = r * Math.sin(phi) * 0.75;
      const lz = r * Math.cos(phi) * Math.sin(theta) * 0.95;
      addStar(lx, ly, lz, ellipCenter[0], ellipCenter[1], ellipCenter[2], 1.0, 0.76, 0.46, Math.random() * 2.7 + 1.8, 0.3, 0.45, 1.0);
    }

    // 8. 大・小マゼラン雲ペア - 5,000星
    const lmcC: [number, number, number] = [-115, -52, -85];
    const smcC: [number, number, number] = [-150, -72, -65];
    for (let i = 0; i < 3200; i++) {
      const r = Math.pow(Math.random(), 1.5) * 32 + 1.0;
      const angle = Math.random() * Math.PI * 2;
      const lx = Math.cos(angle) * r * 1.3 + (Math.random() - 0.5) * 8.0;
      const ly = (Math.random() - 0.5) * 12.0;
      const lz = Math.sin(angle) * r + (Math.random() - 0.5) * 8.0;
      addStar(lx, ly, lz, lmcC[0], lmcC[1], lmcC[2], 0.6, 0.85, 1.0, Math.random() * 2.4 + 1.6, 0.65, 0.9, 1.0);
    }
    for (let i = 0; i < 1800; i++) {
      const r = Math.pow(Math.random(), 1.6) * 20 + 1.0;
      const angle = Math.random() * Math.PI * 2;
      const lx = Math.cos(angle) * r;
      const ly = (Math.random() - 0.5) * 9.0;
      const lz = Math.sin(angle) * r * 1.4;
      addStar(lx, ly, lz, smcC[0], smcC[1], smcC[2], 0.75, 0.88, 1.0, Math.random() * 2.2 + 1.5, 0.75, 0.9, 1.0);
    }

    // 9. 中距離主要伴銀河群 (12個) - 13,000星
    const majorSatellites = [
      { pos: [-140, 110, 50], color: [0.35, 0.95, 1.0], radius: 18, spin: 1.1 },
      { pos: [160, 95, -70], color: [1.0, 0.45, 0.45], radius: 19, spin: 0.8 },
      { pos: [-60, -90, 180], color: [0.45, 1.0, 0.75], radius: 22, spin: 1.2 },
      { pos: [110, -80, -160], color: [0.85, 0.55, 1.0], radius: 16, spin: 0.9 },
      { pos: [-190, 30, -100], color: [0.55, 0.8, 1.0], radius: 20, spin: 0.7 },
      { pos: [80, 120, 130], color: [1.0, 0.9, 0.55], radius: 15, spin: 0.5 },
      { pos: [-130, -120, -40], color: [1.0, 0.7, 0.35], radius: 18, spin: 1.0 },
      { pos: [190, 20, 90], color: [0.4, 0.88, 1.0], radius: 17, spin: 1.3 },
      { pos: [-220, 130, -120], color: [0.9, 0.4, 0.85], radius: 18, spin: 0.9 },
      { pos: [210, -110, 160], color: [0.4, 1.0, 0.9], radius: 20, spin: 1.1 },
      { pos: [-160, -140, 140], color: [1.0, 0.85, 0.4], radius: 16, spin: 0.8 },
      { pos: [140, 140, -150], color: [0.6, 0.75, 1.0], radius: 19, spin: 1.2 }
    ];
    for (let s = 0; s < majorSatellites.length; s++) {
      const sat = majorSatellites[s];
      for (let i = 0; i < 1100; i++) {
        const r = Math.pow(Math.random(), 1.7) * sat.radius + 1.0;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI * 0.7;
        const lx = r * Math.cos(phi) * Math.cos(theta);
        const ly = r * Math.sin(phi) * 0.55;
        const lz = r * Math.cos(phi) * Math.sin(theta);
        addStar(lx, ly, lz, sat.pos[0], sat.pos[1], sat.pos[2], sat.color[0], sat.color[1], sat.color[2], Math.random() * 2.4 + 1.6, sat.spin, 0.75, 1.0);
      }
    }

    // =============================================================
    // [PART B] 2,800個の独立した銀河群 (コズミックウェブ・ディープフィールド)
    // 宇宙全域 (半径 110〜1500) に広がる何千もの銀河をGPU並列計算
    // =============================================================
    const proceduralGalaxyCount = 2800;

    // コズミックウェブの12本の主フィラメント軸
    const filamentAxes: [number, number, number][] = [];
    for (let f = 0; f < 12; f++) {
      const fTheta = (f * Math.PI * 2) / 12 + (Math.random() - 0.5) * 0.25;
      const fPhi = Math.sin(f * 1.3) * 0.45 * Math.PI;
      filamentAxes.push([
        Math.cos(fPhi) * Math.cos(fTheta),
        Math.sin(fPhi),
        Math.cos(fPhi) * Math.sin(fTheta)
      ]);
    }

    for (let g = 0; g < proceduralGalaxyCount; g++) {
      if (starIdx >= starCount - 20) break;

      // 1. 銀河の中心位置 (フィラメント沿い 65% / 深宇宙等方分布 35%)
      const dist = Math.pow(Math.random(), 1.35) * 1380 + 110;
      let cx = 0, cy = 0, cz = 0;

      if (Math.random() < 0.65) {
        const axis = filamentAxes[g % filamentAxes.length];
        const scatterR = (Math.random() - 0.5) * (30 + dist * 0.08);
        const scatterY = (Math.random() - 0.5) * (25 + dist * 0.06);
        cx = axis[0] * dist + scatterR;
        cy = axis[1] * dist + scatterY;
        cz = axis[2] * dist + scatterR;
      } else {
        const gTheta = Math.random() * Math.PI * 2;
        const gPhi = (Math.random() - 0.5) * Math.PI * 0.85;
        cx = dist * Math.cos(gPhi) * Math.cos(gTheta);
        cy = dist * Math.sin(gPhi) * 0.75;
        cz = dist * Math.cos(gPhi) * Math.sin(gTheta);
      }

      // 2. 銀河のオイラー回転・運動
      const gPitch = Math.random() * Math.PI;
      const gRoll = Math.random() * Math.PI;
      const gYaw = Math.random() * Math.PI * 2;
      const spinSpeed = (Math.random() * 1.5 + 0.4) * (Math.random() > 0.5 ? 1 : -1);
      const orbitSpeed = (Math.random() - 0.5) * 0.35;
      const clusterType = dist > 550 ? 2.0 : 1.0;

      // 3. 銀河形態 (Morphology)
      // 0: 小渦巻 (35%), 1: 小型棒渦巻 (20%), 2: 楕円/レンズ状 (25%), 3: リング銀河 (8%), 4: 不規則/クエーサー (12%)
      const morphType = g % 5;
      const starsInThisGalaxy = Math.floor(Math.random() * 45 + 45); // 45〜90星

      // カラーパレット決定
      let baseCr = 0.6, baseCg = 0.85, baseCb = 1.0;
      if (dist > 950) {
        // 最深部・高赤方偏移 (サーモンピンク〜深紅〜暖白)
        const zShift = g % 3;
        if (zShift === 0) { baseCr = 1.0; baseCg = 0.48; baseCb = 0.32; }
        else if (zShift === 1) { baseCr = 1.0; baseCg = 0.65; baseCb = 0.45; }
        else { baseCr = 0.85; baseCg = 0.9; baseCb = 1.0; }
      } else if (morphType === 2) {
        // 楕円銀河 (黄金色〜琥珀)
        baseCr = 1.0; baseCg = 0.84; baseCb = 0.52;
      } else if (morphType === 3) {
        // リング銀河 (鮮烈なシアンブルー)
        baseCr = 0.4; baseCg = 0.92; baseCb = 1.0;
      } else if (morphType === 4) {
        // 不規則・特異銀河 (マゼンタ・紫・エメラルド)
        const col = g % 3;
        if (col === 0) { baseCr = 1.0; baseCg = 0.42; baseCb = 0.8; }
        else if (col === 1) { baseCr = 0.45; baseCg = 1.0; baseCb = 0.75; }
        else { baseCr = 0.75; baseCg = 0.6; baseCb = 1.0; }
      }

      // 4. 各星のプロシージャル生成
      for (let s = 0; s < starsInThisGalaxy; s++) {
        let lx = 0, ly = 0, lz = 0;
        let starSize = Math.random() * 2.2 + 1.4;

        if (morphType === 0) {
          // [小渦巻銀河] 2本腕
          const arm = s % 2;
          const armR = Math.pow(Math.random(), 1.6) * 14 + 1.0;
          const angle = armR * 0.22 + arm * Math.PI + (Math.random() - 0.5) * 0.45;
          lx = Math.cos(angle) * armR;
          ly = (Math.random() - 0.5) * (2.8 - armR * 0.1);
          lz = Math.sin(angle) * armR;
        } else if (morphType === 1) {
          // [小型棒渦巻] 中央Bar + 両端腕
          if (s < 20) {
            lx = (Math.random() - 0.5) * 12;
            ly = (Math.random() - 0.5) * 2.0;
            lz = (Math.random() - 0.5) * 3.0;
          } else {
            const side = (s % 2 === 0) ? 1 : -1;
            const t = Math.random() * 10 + 1;
            const ang = (t * 0.15) * side;
            lx = side * 6 + Math.sin(ang) * t * side;
            ly = (Math.random() - 0.5) * 2.5;
            lz = (1 - Math.cos(ang)) * t * side * 1.2;
          }
        } else if (morphType === 2) {
          // [楕円・レンズ状銀河]
          const eR = Math.pow(Math.random(), 2.2) * 15 + 0.8;
          const theta = Math.random() * Math.PI * 2;
          const phi = (Math.random() - 0.5) * Math.PI;
          lx = eR * Math.cos(phi) * Math.cos(theta) * 1.2;
          ly = eR * Math.sin(phi) * 0.65;
          lz = eR * Math.cos(phi) * Math.sin(theta);
        } else if (morphType === 3) {
          // [リング銀河] 外環 + 中心点
          if (s < 8) {
            const cR = Math.random() * 2.5;
            const theta = Math.random() * Math.PI * 2;
            lx = Math.cos(theta) * cR;
            ly = (Math.random() - 0.5) * 1.5;
            lz = Math.sin(theta) * cR;
          } else {
            const ringR = 10 + (Math.random() - 0.5) * 2.5;
            const theta = Math.random() * Math.PI * 2;
            lx = Math.cos(theta) * ringR;
            ly = (Math.random() - 0.5) * 1.8;
            lz = Math.sin(theta) * ringR;
          }
        } else {
          // [不規則・クエーサー]
          const irR = Math.pow(Math.random(), 1.5) * 9 + 0.5;
          const theta = Math.random() * Math.PI * 2;
          lx = Math.cos(theta) * irR + (Math.random() - 0.5) * 3.0;
          ly = (Math.random() - 0.5) * 5.0;
          lz = Math.sin(theta) * irR + (Math.random() - 0.5) * 3.0;
          if (s === 0) starSize = 3.6; // クエーサー高光度中心核
        }

        const [rx, ry, rz] = rotateLocal(lx, ly, lz, gPitch, gRoll, gYaw);
        addStar(
          rx, ry, rz,
          cx, cy, cz,
          baseCr, baseCg, baseCb,
          starSize,
          spinSpeed,
          orbitSpeed,
          clusterType
        );
      }
    }

    // 残りのスロットを深宇宙背景星で埋める
    while (starIdx < starCount) {
      const dist = Math.random() * 1100 + 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const cx = dist * Math.cos(phi) * Math.cos(theta);
      const cy = dist * Math.sin(phi);
      const cz = dist * Math.cos(phi) * Math.sin(theta);
      addStar(0, 0, 0, cx, cy, cz, 0.8, 0.85, 1.0, Math.random() * 2.0 + 1.2, 0.0, 0.08, 2.0);
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('aLocalPos', new THREE.BufferAttribute(localPositions, 3));
    starGeometry.setAttribute('aGalaxyCenter', new THREE.BufferAttribute(galaxyCenters, 3));
    starGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    starGeometry.setAttribute('aSpinSpeed', new THREE.BufferAttribute(spinSpeeds, 1));
    starGeometry.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(orbitSpeeds, 1));
    starGeometry.setAttribute('aClusterType', new THREE.BufferAttribute(clusterTypes, 1));

    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: cosmicStarVertexShader,
      fragmentShader: cosmicStarFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.0 },
        uG: { value: 1.0 },
        uC: { value: 1.0 },
        uLambda: { value: 1.0 },
        uD: { value: 3.0 },
        uCameraDistance: { value: 180.0 },
        uTexture: { value: starTexture }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // 5. アインシュタイン時空曲率グリッド
    const gridRes = 36;
    const gridHalf = 220;
    const gridPoints: number[] = [];
    const gridStep = (gridHalf * 2) / gridRes;

    for (let i = 0; i <= gridRes; i++) {
      const x = -gridHalf + i * gridStep;
      for (let j = 0; j < gridRes; j++) {
        const z1 = -gridHalf + j * gridStep;
        const z2 = -gridHalf + (j + 1) * gridStep;
        gridPoints.push(x, -45, z1, x, -45, z2);
      }
    }
    for (let j = 0; j <= gridRes; j++) {
      const z = -gridHalf + j * gridStep;
      for (let i = 0; i < gridRes; i++) {
        const x1 = -gridHalf + i * gridStep;
        const x2 = -gridHalf + (i + 1) * gridStep;
        gridPoints.push(x1, -45, z, x2, -45, z);
      }
    }

    const spacetimeGeometry = new THREE.BufferGeometry();
    spacetimeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
    const spacetimeMat = new THREE.LineBasicMaterial({
      color: 0x3730a3,
      transparent: true,
      opacity: 0.4
    });
    const spacetimeGrid = new THREE.LineSegments(spacetimeGeometry, spacetimeMat);
    scene.add(spacetimeGrid);

    // 6. コズミックウェブ・フィラメント網
    const webPoints: number[] = [];
    const webNodeCount = 120;
    const webNodes: THREE.Vector3[] = [];
    for (let w = 0; w < webNodeCount; w++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * 550 + 60;
      const y = (Math.random() - 0.5) * 80;
      webNodes.push(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
    }
    for (let a = 0; a < webNodeCount; a++) {
      for (let b = a + 1; b < webNodeCount; b++) {
        if (webNodes[a].distanceTo(webNodes[b]) < 65) {
          webPoints.push(webNodes[a].x, webNodes[a].y, webNodes[a].z);
          webPoints.push(webNodes[b].x, webNodes[b].y, webNodes[b].z);
        }
      }
    }
    const webGeo = new THREE.BufferGeometry();
    webGeo.setAttribute('position', new THREE.Float32BufferAttribute(webPoints, 3));
    const webMat = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending
    });
    const cosmicWebLines = new THREE.LineSegments(webGeo, webMat);
    scene.add(cosmicWebLines);

    // 7. Pass 2: フルスクリーン重力レンズ & ガルガンチュア降着円盤ポストプロセス
    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postQuadGeo = new THREE.PlaneGeometry(2, 2);

    const lensingMaterial = new THREE.ShaderMaterial({
      vertexShader: interstellarLensingVertexShader,
      fragmentShader: interstellarLensingFragmentShader,
      uniforms: {
        tBackground: { value: bgRenderTarget.texture },
        uResolution: { value: new THREE.Vector2(width * dpr, height * dpr) },
        uCameraPos: { value: camera.position.clone() },
        uCameraWorldMatrix: { value: camera.matrixWorld },
        uCameraMatrixWorldInverse: { value: camera.matrixWorldInverse },
        uCameraProjectionMatrix: { value: camera.projectionMatrix },
        uCameraInvProjectionMatrix: { value: camera.projectionMatrixInverse },
        uBhPos: { value: new THREE.Vector3(0, 0, 0) },
        uRs: { value: 4.5 },
        uLensingStrength: { value: 1.0 },
        uCoreColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) }
      },
      depthWrite: false,
      depthTest: false
    });

    const postQuad = new THREE.Mesh(postQuadGeo, lensingMaterial);
    postScene.add(postQuad);

    // シーン保存
    sceneRef.current = {
      scene,
      camera,
      renderer,
      starMaterial,
      bgRenderTarget,
      postScene,
      postCamera,
      lensingMaterial,
      spacetimeGrid,
      spacetimeGeometry,
      cosmicWebLines,
      cameraTargetDistance: 180,
      currentDistance: 180,
      rotY: 0,
      rotX: 0.35,
      isDragging: false
    };

    // マウスドラッグ & ホイール
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (!sceneRef.current) return;
      sceneRef.current.isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!sceneRef.current || !sceneRef.current.isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      sceneRef.current.rotY += deltaX * 0.005;
      sceneRef.current.rotX = Math.max(-1.4, Math.min(1.4, sceneRef.current.rotX + deltaY * 0.005));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      if (sceneRef.current) sceneRef.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!sceneRef.current) return;
      const zoomFactor = sceneRef.current.currentDistance * 0.0025 + 0.2;
      sceneRef.current.cameraTargetDistance = Math.max(
        28,
        Math.min(1600, sceneRef.current.cameraTargetDistance + e.deltaY * zoomFactor)
      );
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // アニメーションループ (2パス・レンダリング)
    let time = 0;
    const animate = () => {
      const speed = speedRef.current;
      const isPaused = !isPlayingRef.current;
      const dt = isPaused ? 0 : 0.016 * speed;
      time += dt;

      const currentParams = parametersRef.current;
      const currentSim = simulationRef.current;

      const G = currentParams['G'] || 1.0;
      const c = currentParams['c'] || 1.0;
      const lambda = currentParams['lambda_cosmo'] || 1.0;
      const D = currentParams['D_dim'] || 3.0;
      const omega_cdm = currentParams['omega_cdm'] || 1.0;

      const sc = sceneRef.current!;

      // スムーズカメラ追従 & オートローテーション
      sc.currentDistance += (sc.cameraTargetDistance - sc.currentDistance) * 0.085;
      if (!sc.isDragging && !isPaused) {
        sc.rotY += 0.0012 * speed;
      }

      camera.position.x = Math.sin(sc.rotY) * Math.cos(sc.rotX) * sc.currentDistance;
      camera.position.z = Math.cos(sc.rotY) * Math.cos(sc.rotX) * sc.currentDistance;
      camera.position.y = Math.sin(sc.rotX) * sc.currentDistance;
      camera.lookAt(0, 0, 0);

      camera.updateMatrixWorld();
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

      // スケールテキスト更新 (2,800個以上の銀河団スケール反映)
      if (sc.currentDistance < 65) {
        setCurrentScaleText('事象の地平面・エルゴ球スケール (光時単位)');
      } else if (sc.currentDistance < 320) {
        setCurrentScaleText('主銀河・近傍星団スケール (約10万光年)');
      } else if (sc.currentDistance < 750) {
        setCurrentScaleText('局所銀河群・伴銀河スケール (数百万光年)');
      } else {
        setCurrentScaleText('2,800個以上の超銀河団・深宇宙コズミックウェブ (数十億光年メガスケール)');
      }

      // 75,000星 GPU Shader Uniforms 更新
      starMaterial.uniforms.uTime.value = time;
      starMaterial.uniforms.uSpeed.value = isPaused ? 0 : speed;
      starMaterial.uniforms.uG.value = G;
      starMaterial.uniforms.uC.value = c;
      starMaterial.uniforms.uLambda.value = lambda;
      starMaterial.uniforms.uD.value = D;
      starMaterial.uniforms.uCameraDistance.value = sc.currentDistance;

      // アインシュタイン時空グリッドの重力井戸更新
      const gridPos = spacetimeGeometry.attributes.position.array as Float32Array;
      const gridPointCount = gridPos.length / 3;
      const gravityDepress = Math.min(45, 14 * Math.log10(Math.max(0.1, G * 10)));

      for (let k = 0; k < gridPointCount; k++) {
        const gx = gridPos[k * 3];
        const gz = gridPos[k * 3 + 2];
        const distToCenter = Math.sqrt(gx * gx + gz * gz);
        gridPos[k * 3 + 1] = -45 - (gravityDepress * 50) / (distToCenter + 15);
      }
      spacetimeGeometry.attributes.position.needsUpdate = true;

      // コズミックウェブ強度
      (cosmicWebLines.material as THREE.LineBasicMaterial).opacity = Math.min(0.65, 0.18 * omega_cdm);

      // ==========================================
      // [PASS 1] 背景シーンをオフスクリーンターゲットへレンダリング
      // ==========================================
      renderer.setRenderTarget(bgRenderTarget);
      renderer.clear();
      renderer.render(scene, camera);

      // ==========================================
      // [PASS 2] 一般相対論的シュワルツシルト重力レンズ・ポストプロセス
      // ==========================================
      renderer.setRenderTarget(null);

      // シュワルツシルト半径 rs = (2GM / c^2)
      const rsCalculated = Math.max(1.8, Math.min(12.0, 4.5 * (G / Math.pow(c, 1.5))));

      lensingMaterial.uniforms.tBackground.value = bgRenderTarget.texture;
      lensingMaterial.uniforms.uCameraPos.value.copy(camera.position);
      lensingMaterial.uniforms.uCameraWorldMatrix.value.copy(camera.matrixWorld);
      lensingMaterial.uniforms.uCameraMatrixWorldInverse.value.copy(camera.matrixWorldInverse);
      lensingMaterial.uniforms.uCameraProjectionMatrix.value.copy(camera.projectionMatrix);
      lensingMaterial.uniforms.uCameraInvProjectionMatrix.value.copy(camera.projectionMatrixInverse);

      lensingMaterial.uniforms.uRs.value = rsCalculated;
      lensingMaterial.uniforms.uLensingStrength.value = showBlackHoleLens ? 1.0 : 0.0;

      // 特殊宇宙ステータスに応じた光子球リング色調
      if (currentSim.fate === 'vacuum_decay') {
        lensingMaterial.uniforms.uCoreColor.value.set(1.0, 0.35, 0.45);
      } else {
        lensingMaterial.uniforms.uCoreColor.value.set(1.0, 1.0, 1.0);
      }

      renderer.render(postScene, postCamera);

      sceneRef.current!.animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width || width;
        const h = entry.contentRect.height || height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          const currentDpr = Math.min(window.devicePixelRatio, 2);
          bgRenderTarget.setSize(w * currentDpr, h * currentDpr);
          lensingMaterial.uniforms.uResolution.value.set(w * currentDpr, h * currentDpr);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (sceneRef.current?.animationFrameId) {
        cancelAnimationFrame(sceneRef.current.animationFrameId);
      }
      renderer.dispose();
      bgRenderTarget.dispose();
      starTexture.dispose();
      if (container && dom.parentNode === container) {
        container.removeChild(dom);
      }
    };
  }, []);

  // レイヤートグルの反映
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.spacetimeGrid.visible = showSpacetimeGrid;
    sceneRef.current.cosmicWebLines.visible = showCosmicWeb;
    sceneRef.current.lensingMaterial.uniforms.uLensingStrength.value = showBlackHoleLens ? 1.0 : 0.0;
  }, [showSpacetimeGrid, showCosmicWeb, showBlackHoleLens]);

  return (
    <div
      ref={wrapperRef}
      className={`select-none transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col rounded-none border-none shadow-none overflow-hidden'
          : 'relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 border border-slate-800/80 shadow-2xl group'
      }`}
    >
      <div
        ref={mountRef}
        className={`w-full h-full cursor-grab active:cursor-grabbing ${
          isFullscreen ? 'flex-1 h-screen' : 'min-h-[460px]'
        }`}
      />

      {/* 左上: 宇宙ステータス & スケールHUD & 5秒ツアー進行度 */}
      <div className="absolute top-3.5 left-3.5 pointer-events-none flex flex-col gap-1.5 z-20 bg-slate-950/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/60 shadow-xl max-w-sm">
        <div className="text-xs font-mono text-indigo-400 tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          SCHWARZSCHILD LENSING (75,000 STARS)
        </div>
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <span>{simulation.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
            simulation.rank === 'Type S' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60' :
            simulation.rank === 'Type A' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/60' :
            simulation.rank === 'Type F' ? 'bg-rose-900/60 text-rose-300 border border-rose-700/60' :
            'bg-amber-900/60 text-amber-300 border border-amber-700/60'
          }`}>
            {simulation.rank}
          </span>
        </div>
        <div className="text-[11px] text-indigo-300 font-mono line-clamp-1">
          {simulation.subtitle}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
          <Orbit size={11} className="animate-spin text-cyan-400" />
          <span>スケール: {currentScaleText}</span>
        </div>

        {/* 5秒自動遷移ツアー進行ゲージ */}
        {tourState?.isTourActive && (
          <div className="mt-1 pt-1.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-emerald-400 flex items-center gap-1">
                <Timer size={11} className="animate-spin text-emerald-400" />
                <span>自動遷移中 ({tourState.tourRemainingSeconds.toFixed(1)}s)</span>
              </span>
              <span className="text-slate-400 truncate max-w-[120px]" title={tourState.nextPresetName}>
                ➔ {tourState.nextPresetName.split(' ')[0]}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-75"
                style={{ width: `${Math.min(100, Math.max(0, tourState.tourProgress * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 右上: 視点プリセット & アニメーションコントロール & ツアー & フルスクリーン */}
      <div className="absolute top-3.5 right-3.5 flex flex-wrap items-center gap-1.5 z-20 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
        {/* 5秒自動遷移ツアートグル */}
        {tourState && (
          <>
            <button
              onClick={tourState.toggleTour}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition ${
                tourState.isTourActive
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-md shadow-emerald-900/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
              title="5秒ごとにハイパーパラメータがシームレスにモーフィング移り行くツアーモード"
            >
              <Radio size={13} className={tourState.isTourActive ? 'animate-pulse text-emerald-400' : ''} />
              <span>{tourState.isTourActive ? 'ツアー稼働中' : '5秒自動遷移'}</span>
            </button>

            {tourState.isTourActive && (
              <button
                onClick={tourState.skipNext}
                className="p-1 text-slate-400 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition"
                title="次の宇宙へ即時スキップ"
              >
                <SkipForward size={13} />
              </button>
            )}

            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
          </>
        )}

        {/* 再生 / 一時停止 */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-1.5 rounded-lg transition ${
            isPlaying ? 'bg-indigo-950 text-indigo-300 hover:bg-indigo-900' : 'bg-amber-950 text-amber-300 hover:bg-amber-900'
          }`}
          title={isPlaying ? 'アニメーション一時停止' : 'アニメーション再生'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        {/* 速度切り替え */}
        <button
          onClick={() => setSpeedMultiplier((prev) => (prev === 1.0 ? 2.0 : prev === 2.0 ? 0.5 : 1.0))}
          className="px-2 py-1 text-[11px] font-mono text-slate-300 bg-slate-900 hover:bg-slate-800 rounded-lg transition"
          title="再生速度 (0.5x / 1.0x / 2.0x)"
        >
          {speedMultiplier}x
        </button>

        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

        {/* ズームボタン */}
        <button
          onClick={() => handleZoom(-60)}
          className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-lg transition"
          title="接近ズームイン"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => handleZoom(60)}
          className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-lg transition"
          title="広域ズームアウト"
        >
          <ZoomOut size={14} />
        </button>

        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

        {/* 視点プリセット */}
        <button
          onClick={() => handleViewPreset('blackhole')}
          className={`px-2.5 py-1 text-xs font-mono rounded-lg transition flex items-center gap-1 ${
            activePresetView === 'blackhole'
              ? 'bg-amber-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="シュワルツシルト・ブラックホール重力レンズ至近視点"
        >
          <CircleDot size={13} className="text-amber-300" />
          ブラックホールBH
        </button>
        <button
          onClick={() => handleViewPreset('galaxy')}
          className={`px-2.5 py-1 text-xs font-mono rounded-lg transition flex items-center gap-1 ${
            activePresetView === 'galaxy'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="銀河系俯瞰"
        >
          <Compass size={13} />
          主銀河
        </button>
        <button
          onClick={() => handleViewPreset('supercluster')}
          className={`px-2.5 py-1 text-xs font-mono rounded-lg transition flex items-center gap-1 ${
            activePresetView === 'supercluster'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="超銀河団・コズミックウェブ深宇宙"
        >
          <Maximize2 size={13} />
          超銀河団 (メガスケール)
        </button>

        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

        {/* フルスクリーン切り替えボタン */}
        <button
          onClick={toggleFullscreen}
          className={`px-2.5 py-1 text-xs font-mono rounded-lg transition flex items-center gap-1 ${
            isFullscreen
              ? 'bg-rose-950/90 text-rose-300 border border-rose-700/80 hover:bg-rose-900 shadow-lg'
              : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 hover:bg-indigo-900 shadow'
          }`}
          title={isFullscreen ? 'フルスクリーン終了 (ESCまたはF)' : 'フルスクリーン最大化 (F)'}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{isFullscreen ? '全画面終了 (ESC)' : '全画面'}</span>
        </button>
      </div>

      {/* 左下: レイヤートグルコントロール */}
      <div className="absolute bottom-3 left-3.5 flex flex-wrap items-center gap-2 z-20 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 shadow-lg">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
          <Layers size={12} className="text-indigo-400" />
          LAYERS
        </span>
        <label className="flex items-center gap-1 cursor-pointer hover:text-white transition">
          <input
            type="checkbox"
            checked={showBlackHoleLens}
            onChange={(e) => setShowBlackHoleLens(e.target.checked)}
            className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
          />
          重力レンズ (シュワルツシルトBH)
        </label>
        <label className="flex items-center gap-1 cursor-pointer hover:text-white transition">
          <input
            type="checkbox"
            checked={showSpacetimeGrid}
            onChange={(e) => setShowSpacetimeGrid(e.target.checked)}
            className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
          />
          時空曲率グリッド
        </label>
        <label className="flex items-center gap-1 cursor-pointer hover:text-white transition">
          <input
            type="checkbox"
            checked={showCosmicWeb}
            onChange={(e) => setShowCosmicWeb(e.target.checked)}
            className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
          />
          超銀河団コズミックウェブ
        </label>
      </div>

      {/* 右下: 操作ガイド & フルスクリーン時クイックステータス */}
      <div className="absolute bottom-3 right-3.5 pointer-events-none flex flex-col items-end gap-1.5 z-20">
        {isFullscreen && (
          <div className="text-xs font-mono text-slate-300 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-xl flex items-center gap-2">
            <span className="text-emerald-400 font-bold">スコア: {simulation.metrics.habitableScore}/100</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-300">
              終末: {simulation.fate === 'heat_death' ? '熱的死' : simulation.fate === 'big_rip' ? 'ビッグリップ' : simulation.fate === 'big_crunch' ? 'ビッグクランチ' : simulation.fate}
            </span>
          </div>
        )}
        <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800">
          🖱️ ドラッグで360°回転 / ホイールで超巨大ズーム {isFullscreen ? ' / [ESC]で全画面解除' : ' / [F]で全画面'}
        </div>
      </div>
    </div>
  );
};
