import React, { useState } from 'react';
import type { PhysicsParameter } from '../types/physics';
import { soundSystem } from '../audio/soundSystem';
import { Info, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ParameterSliderProps {
  param: PhysicsParameter;
  value: number;
  onChange: (id: string, value: number) => void;
}

export const ParameterSlider: React.FC<ParameterSliderProps> = ({ param, value, onChange }) => {
  const [showInfo, setShowInfo] = useState(false);

  // D_dim の場合は整数スライダー
  const isDimension = param.id === 'D_dim';

  // 対数スライダー用変換 (log10(value) -> slider position)
  const logVal = isDimension ? value : Math.log10(Math.max(1e-6, value));
  const minSlider = isDimension ? 1 : param.minLog;
  const maxSlider = isDimension ? 6 : param.maxLog;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = parseFloat(e.target.value);
    let newVal: number;
    if (isDimension) {
      newVal = Math.round(rawVal);
    } else {
      newVal = Math.pow(10, rawVal);
      // 小数点第3位程度に丸める
      if (newVal >= 10) newVal = Math.round(newVal * 10) / 10;
      else if (newVal >= 1) newVal = Math.round(newVal * 100) / 100;
      else newVal = Math.round(newVal * 1000) / 1000;
    }
    onChange(param.id, newVal);
    soundSystem.playParameterTick(300 + (rawVal - minSlider) * 60);
  };

  const handleReset = () => {
    onChange(param.id, param.standardValue);
    soundSystem.playParameterTick(520);
  };

  const isStandard = isDimension ? value === 3 : Math.abs(value - 1.0) < 0.001;

  // フォーマット表示
  const displayVal = isDimension 
    ? `${value} 次元` 
    : value >= 100 || value <= 0.01 
      ? `× ${value.toExponential(2)}` 
      : `× ${value.toFixed(2)}`;

  return (
    <div className={`p-3 rounded-xl border transition-all duration-200 ${
      !isStandard 
        ? 'bg-slate-900/90 border-indigo-500/40 shadow-sm shadow-indigo-950/40' 
        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
    }`}>
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
            {param.symbol}
          </span>
          <span className="text-xs font-medium text-slate-200 truncate max-w-[130px] sm:max-w-[180px]">
            {param.nameJa}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
            isStandard ? 'text-slate-400 bg-slate-900' : 'text-amber-400 bg-amber-950/60 border border-amber-800/40'
          }`}>
            {displayVal}
          </span>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition ${
              showInfo ? 'text-indigo-400 bg-slate-800' : ''
            }`}
            title="科学的解説を見る"
          >
            <Info size={14} />
          </button>

          {!isStandard && (
            <button
              onClick={handleReset}
              className="p-1 rounded hover:bg-indigo-950/80 text-indigo-400 hover:text-indigo-300 transition"
              title="我々の宇宙の標準値 (1.0) に戻す"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* スライダー */}
      <div className="relative flex items-center gap-2">
        <span className="text-[10px] font-mono text-slate-500">
          {isDimension ? '1D' : `10^${minSlider}`}
        </span>
        <input
          type="range"
          min={minSlider}
          max={maxSlider}
          step={param.step}
          value={logVal}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none"
        />
        <span className="text-[10px] font-mono text-slate-500">
          {isDimension ? '6D' : `10^${maxSlider}`}
        </span>
      </div>

      {/* 詳細解説ドロワー */}
      {showInfo && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs text-slate-300 space-y-2 animate-fadeIn">
          <p className="text-slate-400 leading-relaxed">{param.description}</p>
          
          <div className="bg-indigo-950/30 p-2 rounded-lg border border-indigo-900/40 flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                人間原理の微調整理由
              </span>
              <span className="text-slate-300 text-[11px] leading-snug">{param.anthropicReason}</span>
            </div>
          </div>

          <div className="bg-amber-950/20 p-2 rounded-lg border border-amber-900/40 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 space-y-1">
              <div><strong className="text-amber-300">極大時:</strong> {param.extremeHighEffect}</div>
              <div><strong className="text-amber-300">極小時:</strong> {param.extremeLowEffect}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
