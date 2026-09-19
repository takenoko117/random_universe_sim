import React from 'react';
import type { UniverseSimulationResult, ParameterValues } from '../types/physics';
import { 
  Trophy, 
  History, 
  Share2, 
  RotateCcw, 
  Check
} from 'lucide-react';

export interface SavedUniverse {
  id: string;
  name: string;
  subtitle: string;
  rank: string;
  fate: string;
  habitableScore: number;
  params: ParameterValues;
  savedAt: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

interface ArchiveGalleryProps {
  history: SavedUniverse[];
  onSelectUniverse: (params: ParameterValues, id: string) => void;
  currentSimulation: UniverseSimulationResult;
  currentParams: ParameterValues;
}

export const ArchiveGallery: React.FC<ArchiveGalleryProps> = ({
  history,
  onSelectUniverse,
  currentSimulation,
  currentParams
}) => {
  const [copied, setCopied] = React.useState(false);

  // 実績の判定
  const achievements: AchievementItem[] = [
    {
      id: 'first_life',
      title: '意識のゆりかご',
      description: '生命居住指数70以上の【Type S】宇宙を創成または発見する。',
      unlocked: history.some((u) => u.rank === 'Type S') || currentSimulation.rank === 'Type S',
      icon: '✨'
    },
    {
      id: 'diproton',
      title: 'ジプロトンの悪夢',
      description: '二陽子が結合し全水素が一瞬でヘリウム化した宇宙を観測。',
      unlocked: history.some((u) => (u.params['alpha_s'] || 1) > 1.025) || (currentParams['alpha_s'] || 1) > 1.025,
      icon: '🔥'
    },
    {
      id: 'big_rip',
      title: '引き裂かれし時空',
      description: '暗黒エネルギーの暴走によるビッグリップ宇宙を観測。',
      unlocked: history.some((u) => u.fate === 'big_rip') || currentSimulation.fate === 'big_rip',
      icon: '🌌'
    },
    {
      id: 'big_crunch',
      title: '特異点への回帰',
      description: '重力崩壊により宇宙が再収縮するビッグクランチを観測。',
      unlocked: history.some((u) => u.fate === 'big_crunch') || currentSimulation.fate === 'big_crunch',
      icon: '💥'
    },
    {
      id: 'neutron_sea',
      title: '電荷なき中性子の海',
      description: 'アップクォーク過重により陽子が全滅した中性子宇宙を観測。',
      unlocked: history.some((u) => (u.params['m_u'] || 1) > (u.params['m_d'] || 1) * 1.05) || (currentParams['m_u'] || 1) > (currentParams['m_d'] || 1) * 1.05,
      icon: '⚪'
    },
    {
      id: 'vacuum_decay',
      title: '泡沫の夢 (真空崩壊)',
      description: 'ヒッグス真空が真の基底状態へ崩壊した宇宙を観測。',
      unlocked: history.some((u) => u.fate === 'vacuum_decay') || currentSimulation.fate === 'vacuum_decay',
      icon: '💀'
    },
    {
      id: 'four_dim',
      title: '4次元の迷宮',
      description: '空間次元が4次元の幾何学的軌道破綻宇宙を観測。',
      unlocked: history.some((u) => u.params['D_dim'] === 4) || currentParams['D_dim'] === 4,
      icon: '🌀'
    },
    {
      id: 'eternal_gas',
      title: '未点火の水素墓場',
      description: '強い力が弱すぎて核融合が点火しない冷淡宇宙を観測。',
      unlocked: history.some((u) => (u.params['alpha_s'] || 1) < 0.93) || (currentParams['alpha_s'] || 1) < 0.93,
      icon: '❄️'
    }
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const handleShare = () => {
    // パラメータをJSON Base64としてURLハッシュ化
    try {
      const payload = {
        id: currentSimulation.universeId,
        params: currentParams
      };
      const b64 = btoa(JSON.stringify(payload));
      const url = `${window.location.origin}${window.location.pathname}#univ=${b64}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* 共有と実績ステータス */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-400" size={20} />
            <h3 className="text-base font-bold text-white">
              マルチバース探査実績 ({unlockedCount} / {achievements.length})
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            極限パラメータによって生じる特異な宇宙の運命をコレクションしましょう。
          </p>
        </div>

        <button
          onClick={handleShare}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
        >
          {copied ? <Check size={15} className="text-emerald-300" /> : <Share2 size={15} />}
          <span>{copied ? '宇宙共有リンクをコピーしました！' : '現在の宇宙URLを共有'}</span>
        </button>
      </div>

      {/* 実績バッジ一覧 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`p-3 rounded-xl border transition flex flex-col justify-between ${
              ach.unlocked
                ? 'bg-gradient-to-b from-slate-900 to-indigo-950/40 border-indigo-500/40 text-slate-200'
                : 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xl">{ach.icon}</span>
                {ach.unlocked ? (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                    UNLOCKED
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-slate-600">LOCKED</span>
                )}
              </div>
              <div className="text-xs font-bold truncate">{ach.title}</div>
              <div className="text-[10px] leading-tight mt-1 text-slate-400">
                {ach.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 宇宙探査ログ（履歴） */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <History className="text-indigo-400" size={18} />
          <h3 className="text-sm font-bold text-slate-200 font-mono tracking-wider">
            探査アーカイブ履歴 ({history.length} 件)
          </h3>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs font-mono">
            まだ創成された宇宙の履歴がありません。ルーレットを回して宇宙を探査しましょう。
          </div>
        ) : (
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {history.map((univ) => (
              <div
                key={univ.id}
                onClick={() => onSelectUniverse(univ.params, univ.id)}
                className="p-3 bg-slate-950/60 hover:bg-slate-900/90 rounded-xl border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    univ.rank === 'Type S' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                    univ.rank === 'Type A' ? 'bg-blue-950 text-blue-400 border-blue-800' :
                    univ.rank === 'Type B' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                    'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    {univ.rank}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                      {univ.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {univ.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-[10px] font-mono text-slate-500">生命指数</div>
                    <div className={`text-xs font-mono font-bold ${
                      univ.habitableScore > 70 ? 'text-emerald-400' :
                      univ.habitableScore > 30 ? 'text-amber-400' : 'text-slate-500'
                    }`}>
                      {univ.habitableScore}
                    </div>
                  </div>
                  <RotateCcw size={14} className="text-slate-600 group-hover:text-indigo-400 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
