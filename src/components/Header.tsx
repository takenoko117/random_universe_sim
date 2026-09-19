import React from 'react';
import { UNIVERSE_PRESETS } from '../data/presets';
import { soundSystem } from '../audio/soundSystem';
import type { ParameterValues } from '../types/physics';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Compass, 
  Sliders, 
  Bookmark, 
  Radio
} from 'lucide-react';

import type { MultiverseTourState } from '../hooks/useMultiverseTour';

interface HeaderProps {
  currentTab: 'view' | 'lab' | 'archive';
  setCurrentTab: (tab: 'view' | 'lab' | 'archive') => void;
  onApplyPreset: (presetParams: Partial<ParameterValues>) => void;
  onResetAll: () => void;
  tourState?: MultiverseTourState;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onApplyPreset,
  onResetAll,
  tourState
}) => {
  const [isMuted, setIsMuted] = React.useState(soundSystem.getMuted());
  const [isAmbientOn, setIsAmbientOn] = React.useState(soundSystem.isAmbientOn());

  const toggleSound = () => {
    const muted = soundSystem.toggleMute();
    setIsMuted(muted);
  };

  const toggleAmbient = () => {
    const on = soundSystem.toggleCosmicAmbient();
    setIsAmbientOn(on);
  };

  return (
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* ロゴ & タイトル */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white m-0">
                MULTIVERSE CREATOR
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800/60 rounded">
                30 HYPERPARAMS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              宇宙ハイパーパラメータ・多元宇宙シミュレーター
            </p>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCurrentTab('view')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              currentTab === 'view'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass size={14} />
            <span>観測 & ガチャ</span>
          </button>

          <button
            onClick={() => setCurrentTab('lab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              currentTab === 'lab'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={14} />
            <span>30パラメータ・ラボ</span>
          </button>

          <button
            onClick={() => setCurrentTab('archive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              currentTab === 'archive'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark size={14} />
            <span>探査図鑑 & 実績</span>
          </button>
        </div>

        {/* コントロール・プリセット */}
        <div className="flex items-center gap-2">
          {/* 5秒自動遷移ツアーボタン */}
          {tourState && (
            <button
              onClick={tourState.toggleTour}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-1.5 transition ${
                tourState.isTourActive
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80 shadow-md shadow-emerald-900/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="5秒ごとに30大パラメータがシームレスに移り行く多元宇宙ツアー"
            >
              <Radio size={13} className={tourState.isTourActive ? 'animate-pulse text-emerald-400' : ''} />
              <span>{tourState.isTourActive ? `ツアー中 (${tourState.tourRemainingSeconds.toFixed(1)}s)` : '5秒自動遷移'}</span>
            </button>
          )}

          {/* プリセット選択 */}
          <select
            onChange={(e) => {
              const preset = UNIVERSE_PRESETS.find((p) => p.id === e.target.value);
              if (preset) {
                onApplyPreset(preset.params);
                soundSystem.playParameterTick(600);
              }
            }}
            defaultValue=""
            className="bg-slate-900 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="" disabled>
              宇宙プリセットを選択...
            </option>
            {UNIVERSE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* 全リセットボタン */}
          <button
            onClick={onResetAll}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 transition"
            title="すべての定数を我々の標準宇宙(1.0)にリセット"
          >
            <RotateCcw size={15} />
          </button>

          {/* 深宇宙アンビエント音 トグル */}
          <button
            onClick={toggleAmbient}
            className={`p-2 rounded-xl border transition flex items-center gap-1 text-xs font-mono ${
              isAmbientOn
                ? 'bg-indigo-950/80 text-indigo-400 border-indigo-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="深宇宙アンビエントBGM (Web Audio)"
          >
            <Radio size={14} className={isAmbientOn ? 'animate-pulse' : ''} />
          </button>

          {/* サウンドミュート */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition ${
              isMuted
                ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title={isMuted ? 'ミュート解除' : 'サウンドミュート'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
};
