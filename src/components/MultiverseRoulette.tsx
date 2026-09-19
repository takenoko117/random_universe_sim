import React, { useState } from 'react';
import { soundSystem } from '../audio/soundSystem';
import { PHYSICS_PARAMETERS } from '../data/parameters';
import type { ParameterValues } from '../types/physics';
import { Dices, Sparkles, Flame, Orbit } from 'lucide-react';

interface MultiverseRouletteProps {
  onGenerate: (newParams: ParameterValues, seed: string) => void;
  isGenerating: boolean;
}

export const MultiverseRoulette: React.FC<MultiverseRouletteProps> = ({ onGenerate }) => {
  const [animating, setAnimating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [chaosMode, setChaosMode] = useState<'drift' | 'standard' | 'chaos'>('standard');

  const executeBigBang = (mode = chaosMode) => {
    if (animating) return;
    setAnimating(true);
    soundSystem.playBigBang();

    const sequence = [
      '量子真空のゆらぎを励起中...',
      'インフレーション発生：時空の急激な伸展...',
      '電弱相転移・ヒッグス機構による質量獲得...',
      'ビッグバン元素合成・クォークの閉じ込め...',
      '宇宙の晴れ上がり・星形成開始...'
    ];

    let step = 0;
    setStatusText(sequence[0]);

    const interval = setInterval(() => {
      step++;
      if (step < sequence.length) {
        setStatusText(sequence[step]);
        soundSystem.playParameterTick(350 + step * 80);
      } else {
        clearInterval(interval);

        // 新しいパラメータの生成
        const newParams: ParameterValues = {};
        PHYSICS_PARAMETERS.forEach((p) => {
          if (p.id === 'D_dim') {
            // 空間次元は基本3、カオスモード時のみ稀に変異
            if (mode === 'chaos') {
              const r = Math.random();
              newParams[p.id] = r < 0.15 ? 4 : (r < 0.25 ? 2 : 3);
            } else {
              newParams[p.id] = 3;
            }
            return;
          }

          let multiplier = 1.0;
          if (mode === 'drift') {
            // ±10% の微小ゆらぎ
            multiplier = 1.0 + (Math.random() - 0.5) * 0.2;
          } else if (mode === 'standard') {
            // 0.2倍 〜 5.0倍 (対数スケール)
            const logRange = (Math.random() - 0.5) * 1.4;
            multiplier = Math.pow(10, logRange);
          } else {
            // カオス: パラメータの定義最小〜最大値の全域
            const logRange = p.minLog + Math.random() * (p.maxLog - p.minLog);
            multiplier = Math.pow(10, logRange);
          }

          if (multiplier >= 10) multiplier = Math.round(multiplier * 10) / 10;
          else if (multiplier >= 1) multiplier = Math.round(multiplier * 100) / 100;
          else multiplier = Math.round(multiplier * 1000) / 1000;

          newParams[p.id] = multiplier;
        });

        const newSeed = Math.floor(Math.random() * 900000 + 100000).toString();
        onGenerate(newParams, newSeed);
        setAnimating(false);
      }
    }, 280);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-4 rounded-2xl border border-indigo-900/50 shadow-2xl relative overflow-hidden">
      {/* 背景アニメーショングロー */}
      <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Orbit className="text-indigo-400 animate-spin" size={18} style={{ animationDuration: '12s' }} />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
              MULTIVERSE GENERATOR
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-0.5">
            マルチバース・ルーレット（宇宙ガチャ）
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-lg">
            30大物理定数をランダムに変異させ、マルチバース仮説に基づく未知の宇宙を誕生させます。
          </p>
        </div>

        {/* ガチャモード選択 */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setChaosMode('drift')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              chaosMode === 'drift'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            微細ゆらぎ (±10%)
          </button>
          <button
            onClick={() => setChaosMode('standard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              chaosMode === 'standard'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            標準マルチバース
          </button>
          <button
            onClick={() => setChaosMode('chaos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
              chaosMode === 'chaos'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame size={12} />
            超混沌カオス
          </button>
        </div>

        {/* 創成ボタン */}
        <button
          onClick={() => executeBigBang()}
          disabled={animating}
          className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition transform active:scale-95 shrink-0 ${
            animating
              ? 'bg-indigo-900/50 text-indigo-300 cursor-not-allowed border border-indigo-700/50'
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white shadow-indigo-500/25'
          }`}
        >
          {animating ? (
            <>
              <Sparkles className="animate-spin text-indigo-300" size={18} />
              <span>ビッグバン進行中...</span>
            </>
          ) : (
            <>
              <Dices size={18} />
              <span>新たな宇宙を創成する</span>
            </>
          )}
        </button>
      </div>

      {/* 創成プロセスプログレス */}
      {animating && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-mono text-indigo-300 mb-1.5">
            <span>{statusText}</span>
            <span className="animate-pulse">BIG BANG IN PROGRESS</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-400 to-emerald-400 animate-pulse w-full" />
          </div>
        </div>
      )}
    </div>
  );
};
