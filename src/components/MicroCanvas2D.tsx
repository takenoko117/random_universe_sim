import React, { useEffect, useRef } from 'react';
import type { ParameterValues, UniverseSimulationResult } from '../types/physics';

interface MicroCanvas2DProps {
  simulation: UniverseSimulationResult;
  parameters: ParameterValues;
}

export const MicroCanvas2D: React.FC<MicroCanvas2DProps> = ({ simulation, parameters }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const render = () => {
      time += 0.025;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // 背景グリッド（量子ゆらぎ空間）
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // パラメータ取得
      const alpha_s = parameters['alpha_s'] || 1.0;
      const alpha_em = parameters['alpha_em'] || 1.0;
      const m_e = parameters['m_e'] || 1.0;
      const hbar = parameters['hbar'] || 1.0;
      const m_u = parameters['m_u'] || 1.0;
      const m_d = parameters['m_d'] || 1.0;

      const isProtonDecayed = m_u > m_d * 1.05;
      const isDiproton = alpha_s > 1.025;
      const isDeuteronBroken = alpha_s < 0.93;

      // ボーア半径スケール: r_bohr ~ hbar^2 / (m_e * alpha_em)
      const bohrRadius = Math.max(15, Math.min(130, 65 * (Math.pow(hbar, 2) / (m_e * alpha_em))));

      // 1. 原子核（クォーク・核子）の描画
      const nuclearRadius = 24 * Math.pow(alpha_s, 0.3);
      
      // 原子核グロー
      const nuclearGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, nuclearRadius * 2);
      if (isProtonDecayed) {
        nuclearGrad.addColorStop(0, 'rgba(148, 163, 184, 0.8)'); // 灰色（中性子海）
        nuclearGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
      } else if (isDiproton) {
        nuclearGrad.addColorStop(0, 'rgba(239, 68, 68, 0.8)'); // 赤色（超核融合ジプロトン）
        nuclearGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (isDeuteronBroken) {
        nuclearGrad.addColorStop(0, 'rgba(59, 130, 246, 0.6)'); // 青色（バラバラ）
        nuclearGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else {
        nuclearGrad.addColorStop(0, 'rgba(245, 158, 11, 0.8)'); // 黄金（安定核）
        nuclearGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      }
      ctx.fillStyle = nuclearGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, nuclearRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // 核子（陽子・中性子）の個体
      const nucleonCount = isProtonDecayed ? 4 : (isDiproton ? 2 : 3);
      for (let i = 0; i < nucleonCount; i++) {
        const angle = time * 0.8 + (i * 2 * Math.PI) / nucleonCount;
        const nDist = isDeuteronBroken ? 35 + Math.sin(time * 2 + i) * 15 : 12;
        const nx = cx + Math.cos(angle) * nDist;
        const ny = cy + Math.sin(angle) * nDist;

        // 陽子(赤) or 中性子(青灰)
        const isProton = !isProtonDecayed && (isDiproton || i % 2 === 0);
        ctx.fillStyle = isProton ? '#ef4444' : '#64748b';
        ctx.beginPath();
        ctx.arc(nx, ny, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 核子ラベル
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isProton ? 'p+' : 'n', nx, ny);
      }

      // 2. 電子軌道と電子雲の描画
      if (!isProtonDecayed) {
        // 電子軌道リング
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, bohrRadius, bohrRadius * 0.65, time * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 電子
        const eAngle = time * 3.5;
        const ex = cx + Math.cos(eAngle) * bohrRadius;
        const ey = cy + Math.sin(eAngle) * (bohrRadius * 0.65);

        // 電子グロー
        const eGrad = ctx.createRadialGradient(ex, ey, 1, ex, ey, 10);
        eGrad.addColorStop(0, '#38bdf8');
        eGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = eGrad;
        ctx.beginPath();
        ctx.arc(ex, ey, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '9px monospace';
        ctx.fillText('e⁻', ex + 8, ey - 6);
      }

      // 3. ミクロ状態ステータス表示
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`ボーア半径: a₀ × ${(bohrRadius / 65).toFixed(2)}`, 12, height - 28);
      ctx.fillText(`強い力束縛: α_s × ${alpha_s.toFixed(2)}`, 12, height - 12);

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [simulation, parameters]);

  return (
    <div className="relative w-full h-full min-h-[220px] rounded-2xl overflow-hidden bg-slate-950/90 border border-slate-800 shadow-xl flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={340}
        height={240}
        className="w-full h-full object-contain"
      />
      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/60 pointer-events-none">
        <div className="text-[11px] font-mono text-cyan-400 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          ATOMIC & NUCLEAR SCALE
        </div>
      </div>
    </div>
  );
};
