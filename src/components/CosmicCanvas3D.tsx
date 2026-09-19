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
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Play, 
  Pause, 
  Compass, 
  Orbit,
  CircleDot
} from 'lucide-react';

interface CosmicCanvas3DProps {
  simulation: UniverseSimulationResult;
  parameters: ParameterValues;
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

export const CosmicCanvas3D: React.FC<CosmicCanvas3DProps> = ({ simulation, parameters }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<ParameterValues>(parameters);
  const simulationRef = useRef<UniverseSimulationResult>(simulation);

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
      sceneRef.current.cameraTargetDistance = 680;
      sceneRef.current.rotX = 0.65;
    }
  };

  const handleZoom = (delta: number) => {
    if (!sceneRef.current) return;
    sceneRef.current.cameraTargetDistance = Math.max(
      28,
      Math.min(950, sceneRef.current.cameraTargetDistance + delta)
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

    // 4. 75,000個のメガスケールGPU星・超銀河団パーティクル
    const starCount = 75000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const clusterTypes = new Float32Array(starCount);
    const orbitSpeeds = new Float32Array(starCount);
    const originalRadii = new Float32Array(starCount);
    const originalAngles = new Float32Array(starCount);
    const heights = new Float32Array(starCount);

    const starTexture = createStarTexture();

    const satelliteCenters = [
      { r: 210, angle: 0.8, y: 35, size: 28 },
      { r: 260, angle: 2.4, y: -45, size: 35 },
      { r: 190, angle: 4.1, y: 20, size: 22 },
      { r: 290, angle: 5.3, y: -30, size: 40 },
      { r: 330, angle: 3.5, y: 60, size: 30 }
    ];

    for (let i = 0; i < starCount; i++) {
      let r = 0;
      let angle = 0;
      let y = 0;
      let size = 2.5;
      let clusterType = 0.0;
      let speed = 1.0;
      let cr = 1.0;
      let cg = 1.0;
      let cb = 1.0;

      if (i < 38000) {
        // [A] 主渦巻銀河 (38,000星)
        clusterType = 0.0;
        const armIndex = i % 4;
        const angleOffset = (armIndex * 2 * Math.PI) / 4;
        r = Math.pow(Math.random(), 1.8) * 145 + 5.5;
        angle = r * 0.075 + angleOffset + (Math.random() - 0.5) * 0.6;
        y = (Math.random() - 0.5) * (18 - (r / 145) * 12);
        size = Math.random() * 2.8 + 2.0;

        const rnd = Math.random();
        if (rnd > 0.85) {
          cr = 0.55; cg = 0.78; cb = 1.0;
        } else if (rnd > 0.35) {
          cr = 1.0; cg = 0.9; cb = 0.6;
        } else {
          cr = 1.0; cg = 0.45; cb = 0.28;
        }
      } else if (i < 53000) {
        // [B] 伴銀河・衛星星団 (15,000星)
        clusterType = 1.0;
        const sat = satelliteCenters[i % satelliteCenters.length];
        const subAngle = Math.random() * Math.PI * 2;
        const subR = Math.pow(Math.random(), 1.5) * sat.size;
        
        const cx = Math.cos(sat.angle) * sat.r;
        const cz = Math.sin(sat.angle) * sat.r;
        const sx = cx + Math.cos(subAngle) * subR;
        const sz = cz + Math.sin(subAngle) * subR;

        r = Math.sqrt(sx * sx + sz * sz);
        angle = Math.atan2(sz, sx);
        y = sat.y + (Math.random() - 0.5) * 12;
        size = Math.random() * 2.2 + 1.6;
        speed = 0.6 / (Math.sqrt(sat.r) * 0.1);

        cr = 0.75; cg = 0.85; cb = 1.0;
      } else {
        // [C] 超銀河団・コズミックウェブ深宇宙銀河 (22,000個)
        clusterType = 2.0;
        const filamentBranch = i % 8;
        const baseAngle = (filamentBranch * 2 * Math.PI) / 8;
        const distFromCenter = Math.pow(Math.random(), 1.2) * 750 + 150;
        const meander = Math.sin(distFromCenter * 0.02) * 0.5;
        angle = baseAngle + meander + (Math.random() - 0.5) * 0.45;
        r = distFromCenter;
        y = (Math.random() - 0.5) * (120 + (distFromCenter / 750) * 160);
        size = Math.random() * 3.5 + 2.5;
        speed = (Math.random() - 0.5) * 0.2;

        const galType = Math.random();
        if (galType > 0.7) {
          cr = 0.45; cg = 0.7; cb = 1.0;
        } else if (galType > 0.3) {
          cr = 1.0; cg = 0.8; cb = 0.45;
        } else {
          cr = 0.95; cg = 0.35; cb = 0.6;
        }
      }

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      originalRadii[i] = r;
      originalAngles[i] = angle;
      heights[i] = y;

      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;

      sizes[i] = size;
      clusterTypes[i] = clusterType;
      orbitSpeeds[i] = speed;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    starGeometry.setAttribute('aClusterType', new THREE.BufferAttribute(clusterTypes, 1));
    starGeometry.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(orbitSpeeds, 1));
    starGeometry.setAttribute('aOriginalRadius', new THREE.BufferAttribute(originalRadii, 1));
    starGeometry.setAttribute('aOriginalAngle', new THREE.BufferAttribute(originalAngles, 1));
    starGeometry.setAttribute('aHeight', new THREE.BufferAttribute(heights, 1));

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
      const zoomFactor = sceneRef.current.currentDistance * 0.002 + 0.15;
      sceneRef.current.cameraTargetDistance = Math.max(
        28,
        Math.min(950, sceneRef.current.cameraTargetDistance + e.deltaY * zoomFactor)
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

      // スケールテキスト更新
      if (sc.currentDistance < 65) {
        setCurrentScaleText('事象の地平面・エルゴ球スケール (光時単位)');
      } else if (sc.currentDistance < 320) {
        setCurrentScaleText('銀河系・星団スケール (約10万光年)');
      } else {
        setCurrentScaleText('超銀河団・コズミックウェブ (数億光年メガスケール)');
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
    <div className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 border border-slate-800/80 shadow-2xl group select-none">
      <div ref={mountRef} className="w-full h-full min-h-[460px] cursor-grab active:cursor-grabbing" />

      {/* 左上: 宇宙ステータス & スケールHUD */}
      <div className="absolute top-3.5 left-3.5 pointer-events-none flex flex-col gap-1 z-10 bg-slate-950/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/60 shadow-xl">
        <div className="text-xs font-mono text-indigo-400 tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          INTERSTELLAR RELATIVISTIC LENSING (75,000 STARS)
        </div>
        <div className="text-sm font-bold text-white flex items-center gap-2">
          {simulation.name}
        </div>
        <div className="text-[11px] text-indigo-300 font-mono">
          {simulation.subtitle}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
          <Orbit size={11} className="animate-spin text-cyan-400" />
          <span>スケール: {currentScaleText}</span>
        </div>
      </div>

      {/* 右上: 視点プリセット & アニメーションコントロール */}
      <div className="absolute top-3.5 right-3.5 flex flex-wrap items-center gap-1.5 z-10 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
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
      </div>

      {/* 左下: レイヤートグルコントロール */}
      <div className="absolute bottom-3 left-3.5 flex flex-wrap items-center gap-2 z-10 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 shadow-lg">
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

      {/* 右下: 操作ガイド */}
      <div className="absolute bottom-3 right-3.5 pointer-events-none text-[11px] font-mono text-slate-400 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800">
        🖱️ ドラッグで360°回転 / ホイールで超巨大ズーム (28〜950)
      </div>
    </div>
  );
};
