import { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { PHYSICS_PARAMETERS, PARAMETER_CATEGORIES, DEFAULT_PARAMETERS } from './data/parameters';
import { evaluateUniverse } from './engine/physicsEvaluator';
import { soundSystem } from './audio/soundSystem';
import type { ParameterValues, ParameterCategory, UniverseSimulationResult } from './types/physics';

import { Header } from './components/Header';
import { CosmicCanvas3D } from './components/CosmicCanvas3D';
import { MicroCanvas2D } from './components/MicroCanvas2D';
import { ParameterSlider } from './components/ParameterSlider';
import { UniverseDiagnostic } from './components/UniverseDiagnostic';
import { MultiverseRoulette } from './components/MultiverseRoulette';
import { ArchiveGallery, type SavedUniverse } from './components/ArchiveGallery';
import { Eye, SlidersHorizontal } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<'view' | 'lab' | 'archive'>('view');
  const [parameters, setParameters] = useState<ParameterValues>(DEFAULT_PARAMETERS);
  const [currentSeed, setCurrentSeed] = useState<string>('994821');
  const [history, setHistory] = useState<SavedUniverse[]>(() => {
    try {
      const saved = localStorage.getItem('multiverse_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<ParameterCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'macro' | 'micro' | 'split'>('split');

  // シミュレーション計算
  const simulation: UniverseSimulationResult = useMemo(() => {
    return evaluateUniverse(parameters, currentSeed);
  }, [parameters, currentSeed]);

  // URLハッシュからの復元
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#univ=')) {
        try {
          const b64 = hash.replace('#univ=', '');
          const data = JSON.parse(atob(b64));
          if (data.params) {
            setParameters(data.params);
            if (data.id) setCurrentSeed(data.id);
          }
        } catch {
          // ignore
        }
      }
    };
    handleHash();
  }, []);

  // 履歴の保存と効果音・演出
  const recordToHistory = useCallback((res: UniverseSimulationResult, params: ParameterValues) => {
    const entry: SavedUniverse = {
      id: res.universeId,
      name: res.name,
      subtitle: res.subtitle,
      rank: res.rank,
      fate: res.fate,
      habitableScore: res.metrics.habitableScore,
      params: { ...params },
      savedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    };

    setHistory((prev) => {
      // 重複チェック
      if (prev.some((h) => h.id === entry.id)) return prev;
      const updated = [entry, ...prev.slice(0, 29)];
      try {
        localStorage.setItem('multiverse_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    // 演出判定
    if (res.rank === 'Type S') {
      soundSystem.playMiracleHarmonic();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#6366f1', '#fbbf24', '#38bdf8']
      });
    } else if (res.rank === 'Type F' || res.rank === 'Type D') {
      soundSystem.playCollapseSound();
    }
  }, []);

  // ガチャでの新宇宙生成
  const handleGenerateRoulette = (newParams: ParameterValues, seed: string) => {
    setParameters(newParams);
    setCurrentSeed(seed);
    const newSim = evaluateUniverse(newParams, seed);
    recordToHistory(newSim, newParams);
  };

  // パラメータ単体変更
  const handleParameterChange = (id: string, value: number) => {
    setParameters((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  // プリセット適用
  const handleApplyPreset = (presetParams: Partial<ParameterValues>) => {
    const merged: ParameterValues = { ...DEFAULT_PARAMETERS };
    Object.entries(presetParams).forEach(([k, v]) => {
      if (typeof v === 'number') {
        merged[k] = v;
      }
    });
    const seed = Math.floor(Math.random() * 900000 + 100000).toString();
    setParameters(merged);
    setCurrentSeed(seed);
    const newSim = evaluateUniverse(merged, seed);
    recordToHistory(newSim, merged);
  };

  // 全リセット
  const handleResetAll = () => {
    setParameters(DEFAULT_PARAMETERS);
    const seed = '100000';
    setCurrentSeed(seed);
    soundSystem.playParameterTick(550);
  };

  // 履歴からの宇宙復元
  const handleSelectFromHistory = (params: ParameterValues, seed: string) => {
    setParameters(params);
    setCurrentSeed(seed);
    soundSystem.playParameterTick(480);
    setCurrentTab('view');
  };

  // ラボでのパラメータフィルタリング
  const filteredParameters = useMemo(() => {
    if (selectedCategory === 'all') return PHYSICS_PARAMETERS;
    return PHYSICS_PARAMETERS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* ナビゲーションバー */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onApplyPreset={handleApplyPreset}
        onResetAll={handleResetAll}
      />

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ==========================================
            TAB 1: 宇宙観測 & ガチャ (Cosmic View & Gacha)
           ========================================== */}
        {currentTab === 'view' && (
          <div className="space-y-6 animate-fadeIn">
            {/* ルーレット（宇宙ガチャ） */}
            <MultiverseRoulette onGenerate={handleGenerateRoulette} isGenerating={false} />

            {/* ビジュアライザコントロール & 表示 */}
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-indigo-400" />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    デュアルスケール・リアルタイム観測
                  </span>
                </div>

                <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition ${
                      viewMode === 'split' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    分割ビュー
                  </button>
                  <button
                    onClick={() => setViewMode('macro')}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition ${
                      viewMode === 'macro' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    マクロ (3D宇宙)
                  </button>
                  <button
                    onClick={() => setViewMode('micro')}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition ${
                      viewMode === 'micro' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ミクロ (原子核)
                  </button>
                </div>
              </div>

              {/* ビューアキャンバス */}
              <div className={`grid gap-4 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {(viewMode === 'split' || viewMode === 'macro') && (
                  <div className={viewMode === 'split' ? 'lg:col-span-2 h-[420px]' : 'h-[500px]'}>
                    <CosmicCanvas3D simulation={simulation} parameters={parameters} />
                  </div>
                )}

                {(viewMode === 'split' || viewMode === 'micro') && (
                  <div className={viewMode === 'split' ? 'h-[420px]' : 'h-[400px]'}>
                    <MicroCanvas2D simulation={simulation} parameters={parameters} />
                  </div>
                )}
              </div>
            </div>

            {/* 宇宙診断レポート */}
            <UniverseDiagnostic simulation={simulation} />
          </div>
        )}

        {/* ==========================================
            TAB 2: 30パラメータ・ラボ (Tuning Lab)
           ========================================== */}
        {currentTab === 'lab' && (
          <div className="space-y-6 animate-fadeIn">
            {/* 上部説明とミニビジュアライザ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="text-indigo-400" size={20} />
                    <h2 className="text-base font-bold text-white">
                      30大ハイパーパラメータ・チューニングラボ
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    標準模型と宇宙論の約30の自由定数をスライダー（対数スケール）で操作できます。
                    各パラメータ右の【ⓘ】アイコンで、物理的役割や「なぜその値でなければならないのか（人間原理的微調整）」を学習できます。
                  </p>
                </div>

                {/* カテゴリフィルタ */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      selectedCategory === 'all'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    全 30 パラメータ
                  </button>
                  {PARAMETER_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        selectedCategory === cat.id
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat.nameJa}
                    </button>
                  ))}
                </div>
              </div>

              {/* リアルタイムミニプレビュー */}
              <div className="h-[210px]">
                <CosmicCanvas3D simulation={simulation} parameters={parameters} />
              </div>
            </div>

            {/* 30パラメータスライダーグリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredParameters.map((param) => (
                <ParameterSlider
                  key={param.id}
                  param={param}
                  value={parameters[param.id] !== undefined ? parameters[param.id] : param.standardValue}
                  onChange={handleParameterChange}
                />
              ))}
            </div>

            {/* 下部診断レポート */}
            <div className="pt-4">
              <UniverseDiagnostic simulation={simulation} />
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: 探査図鑑 & 実績 (Archive & Achievements)
           ========================================== */}
        {currentTab === 'archive' && (
          <div className="animate-fadeIn">
            <ArchiveGallery
              history={history}
              onSelectUniverse={handleSelectFromHistory}
              currentSimulation={simulation}
              currentParams={parameters}
            />
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Multiverse Creator &copy; 2026 - Multiverse Fine-Tuning Simulator</span>
          <span className="text-slate-600">
            Based on Standard Model of Particle Physics &amp; &Lambda;CDM Cosmology
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
