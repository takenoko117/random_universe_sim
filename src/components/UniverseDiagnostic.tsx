import React from 'react';
import type { UniverseSimulationResult, UniverseRank } from '../types/physics';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Skull, 
  Sparkles, 
  Flame, 
  Clock, 
  Dna,
  ShieldAlert
} from 'lucide-react';

interface UniverseDiagnosticProps {
  simulation: UniverseSimulationResult;
}

export const UniverseDiagnostic: React.FC<UniverseDiagnosticProps> = ({ simulation }) => {
  const getRankBadge = (rank: UniverseRank) => {
    switch (rank) {
      case 'Type S':
        return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-emerald-950/50', label: 'RANK S (奇跡の生命宇宙)' };
      case 'Type A':
        return { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-blue-950/50', label: 'RANK A (化学多様宇宙)' };
      case 'Type B':
        return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-amber-950/50', label: 'RANK B (不毛な恒星宇宙)' };
      case 'Type C':
        return { bg: 'bg-slate-500/20 text-slate-400 border-slate-500/50 shadow-slate-950/50', label: 'RANK C (星なき冷淡ガス)' };
      case 'Type D':
        return { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-purple-950/50', label: 'RANK D (物質不在・特異点)' };
      case 'Type F':
        return { bg: 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-rose-950/50', label: 'RANK F (泡沫の崩壊宇宙)' };
    }
  };

  const badge = getRankBadge(simulation.rank);

  return (
    <div className="space-y-4">
      {/* メインステータスカード */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-lg ${badge.bg}`}>
                {badge.label}
              </span>
              <span className="text-xs font-mono text-slate-400">
                ID: {simulation.universeId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              {simulation.name}
            </h2>
            <p className="text-xs text-indigo-400 italic font-mono mt-0.5">
              {simulation.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 生命居住指数メーター */}
            <div className="text-right">
              <div className="text-[11px] font-mono text-slate-400">生命居住指数</div>
              <div className="text-2xl font-black font-mono">
                <span className={
                  simulation.metrics.habitableScore > 70 ? 'text-emerald-400' :
                  simulation.metrics.habitableScore > 30 ? 'text-amber-400' : 'text-slate-500'
                }>
                  {simulation.metrics.habitableScore}
                </span>
                <span className="text-xs text-slate-500"> / 100</span>
              </div>
            </div>
          </div>
        </div>

        {/* 主要メトリクスグリッド */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock size={12} className="text-indigo-400" />
              宇宙の推定寿命
            </div>
            <div className="text-sm font-mono font-bold text-slate-200 mt-1">
              {simulation.lifespanGyr >= 9999 ? '∞ 永遠' : `${simulation.lifespanGyr} 億年`}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Flame size={12} className="text-amber-400" />
              恒星の平均寿命
            </div>
            <div className="text-sm font-mono font-bold text-slate-200 mt-1">
              {simulation.metrics.averageStarLifespanMyr >= 1000 
                ? `${(simulation.metrics.averageStarLifespanMyr / 1000).toFixed(1)} 億年` 
                : `${simulation.metrics.averageStarLifespanMyr} 百万年`}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles size={12} className="text-cyan-400" />
              化学元素多様性
            </div>
            <div className="text-sm font-mono font-bold text-slate-200 mt-1">
              {simulation.metrics.chemicalDiversity} %
              <span className="text-[10px] text-slate-500 ml-1">
                {simulation.metrics.carbonSynthesis ? '(炭素あり)' : '(炭素なし)'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Skull size={12} className="text-rose-400" />
              BH支配比率
            </div>
            <div className="text-sm font-mono font-bold text-slate-200 mt-1">
              {simulation.metrics.blackHoleDominance} %
            </div>
          </div>
        </div>

        {/* 終末予言カード */}
        <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex items-start gap-3">
          <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={18} />
          <div>
            <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              最終的終焉 (COSMIC DESTINY): {simulation.fate.toUpperCase().replace('_', ' ')}
            </div>
            <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {simulation.fateDescription}
            </div>
          </div>
        </div>

        {/* 生命形態の仮説（もしあれば） */}
        {simulation.lifeFormHypothesis && (
          <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-950 border border-emerald-800/40 flex items-start gap-3">
            <Dna className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  生命形態仮説: {simulation.lifeFormHypothesis.type}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-900/60 text-emerald-300 rounded border border-emerald-700/50">
                  {simulation.lifeFormHypothesis.rarity}
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                {simulation.lifeFormHypothesis.description}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 8段階の進化フェーズ詳細アセスメント */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-300 font-mono tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
          宇宙進化 8段階アセスメント
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {Object.entries(simulation.phases).map(([key, phase]) => {
            const isPass = phase.status === 'passed';
            const isCrit = phase.status === 'critical';

            return (
              <div
                key={key}
                className={`p-3 rounded-xl border transition ${
                  isPass ? 'bg-slate-950/60 border-slate-800' :
                  isCrit ? 'bg-amber-950/20 border-amber-900/50' :
                  'bg-rose-950/25 border-rose-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {isPass && <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
                    {isCrit && <AlertTriangle size={14} className="text-amber-400 shrink-0" />}
                    {!isPass && !isCrit && <XCircle size={14} className="text-rose-400 shrink-0" />}
                    <span className="text-xs font-semibold text-slate-200">
                      {phase.name}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isPass ? 'text-emerald-400 bg-emerald-950/60' :
                    isCrit ? 'text-amber-400 bg-amber-950/60' :
                    'text-rose-400 bg-rose-950/60'
                  }`}>
                    {phase.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-300">
                  {phase.title}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal line-clamp-2 hover:line-clamp-none transition">
                  {phase.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
