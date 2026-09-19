// 多元宇宙5秒シームレス自動遷移ツアー・カスタムフック (バグ修正 & 堅牢化版)
import { useState, useRef, useEffect, useCallback } from 'react';
import { UNIVERSE_PRESETS } from '../data/presets';
import { DEFAULT_PARAMETERS, PHYSICS_PARAMETERS } from '../data/parameters';
import { soundSystem } from '../audio/soundSystem';
import type { ParameterValues, UniverseSimulationResult } from '../types/physics';
import { evaluateUniverse } from '../engine/physicsEvaluator';

export interface MultiverseTourState {
  isTourActive: boolean;
  tourProgress: number; // 0.0 ~ 1.0 (5秒サイクル内の進行度)
  tourRemainingSeconds: number; // 残り秒数 (5.0 ~ 0.0)
  currentPresetIndex: number;
  currentPresetName: string;
  nextPresetName: string;
  toggleTour: () => void;
  startTour: () => void;
  stopTour: () => void;
  skipNext: () => void;
  skipPrev: () => void;
}

const CYCLE_DURATION_MS = 5000; // 5秒サイクル
const ALL_PARAM_KEYS = PHYSICS_PARAMETERS.map((p) => p.id);

/**
 * 2つのパラメータ値を対数空間でスムーズステップ補間 (Smoothstep Lerp in Log-space)
 */
function lerpParamLog(fromVal: number, toVal: number, t: number): number {
  const fromSafe = Math.max(1e-5, Math.min(1e5, fromVal || 1.0));
  const toSafe = Math.max(1e-5, Math.min(1e5, toVal || 1.0));
  const logFrom = Math.log10(fromSafe);
  const logTo = Math.log10(toSafe);
  // Cubic Hermite smoothstep: 3t^2 - 2t^3
  const s = t * t * (3.0 - 2.0 * t);
  const logCurrent = logFrom + (logTo - logFrom) * s;
  return Math.pow(10, logCurrent);
}

/**
 * プリセットのパラメータを全30パラメータの辞書へ展開
 */
function expandPresetParams(partialParams: Partial<ParameterValues>): ParameterValues {
  const expanded: ParameterValues = { ...DEFAULT_PARAMETERS };
  Object.entries(partialParams).forEach(([k, v]) => {
    if (typeof v === 'number') {
      expanded[k] = v;
    }
  });
  return expanded;
}

export function useMultiverseTour(
  currentParameters: ParameterValues,
  setParameters: (params: ParameterValues) => void,
  recordToHistory?: (res: UniverseSimulationResult, params: ParameterValues) => void
): MultiverseTourState {
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourProgress, setTourProgress] = useState(0.0);
  const [tourRemainingSeconds, setTourRemainingSeconds] = useState(5.0);
  const [currentPresetIndex, setCurrentPresetIndex] = useState(0);

  // 外部からの更新・コールバックへの参照（依存配列を空にして再レンダリングループを防ぐ）
  const currentParametersRef = useRef<ParameterValues>(currentParameters);
  const setParametersRef = useRef(setParameters);
  const recordToHistoryRef = useRef(recordToHistory);

  useEffect(() => {
    setParametersRef.current = setParameters;
  }, [setParameters]);

  useEffect(() => {
    recordToHistoryRef.current = recordToHistory;
  }, [recordToHistory]);

  // アニメーション制御用 ref
  const isTourActiveRef = useRef(false);
  const fromParamsRef = useRef<ParameterValues>({ ...currentParameters });
  const targetParamsRef = useRef<ParameterValues>({ ...currentParameters });
  const cycleStartTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const presetIndexRef = useRef(0);

  // プリセット名
  const currentPresetName = UNIVERSE_PRESETS[currentPresetIndex]?.name || '我々の宇宙';
  const nextIndex = (currentPresetIndex + 1) % UNIVERSE_PRESETS.length;
  const nextPresetName = UNIVERSE_PRESETS[nextIndex]?.name || '次の宇宙';

  // 次のプリセットへの遷移を設定
  const setupPresetTarget = useCallback((targetIdx: number) => {
    presetIndexRef.current = targetIdx;
    setCurrentPresetIndex(targetIdx);

    const targetPreset = UNIVERSE_PRESETS[targetIdx];
    targetParamsRef.current = expandPresetParams(targetPreset.params);
    cycleStartTimeRef.current = performance.now();
  }, []);

  // アニメーションループ: isTourActive の切り替え時のみ起動・停止
  useEffect(() => {
    if (!isTourActive) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    isTourActiveRef.current = true;
    cycleStartTimeRef.current = performance.now();

    const animateTour = (timestamp: number) => {
      if (!isTourActiveRef.current) return;

      if (!cycleStartTimeRef.current) {
        cycleStartTimeRef.current = timestamp;
      }

      const elapsed = timestamp - cycleStartTimeRef.current;
      const progress = Math.min(1.0, elapsed / CYCLE_DURATION_MS);
      const remainingSec = Math.max(0.0, (CYCLE_DURATION_MS - elapsed) / 1000.0);

      setTourProgress(progress);
      setTourRemainingSeconds(remainingSec);

      // 全30パラメータを対数空間でシームレス補間
      const fromP = fromParamsRef.current;
      const toP = targetParamsRef.current;
      const interpolated: ParameterValues = {};

      for (const k of ALL_PARAM_KEYS) {
        const valFrom = fromP[k] !== undefined ? fromP[k] : 1.0;
        const valTo = toP[k] !== undefined ? toP[k] : 1.0;
        interpolated[k] = lerpParamLog(valFrom, valTo, progress);
      }

      // パラメータを更新
      setParametersRef.current(interpolated);

      // 5秒サイクル完了時の処理
      if (progress >= 1.0) {
        // 到達時の効果音
        soundSystem.playParameterTick(620);

        // 履歴に自動記録
        const seed = Math.floor(Math.random() * 900000 + 100000).toString();
        const res = evaluateUniverse(interpolated, seed);
        if (recordToHistoryRef.current) {
          recordToHistoryRef.current(res, interpolated);
        }

        // 次のプリセットへ移行
        const nextIdx = (presetIndexRef.current + 1) % UNIVERSE_PRESETS.length;
        presetIndexRef.current = nextIdx;
        setCurrentPresetIndex(nextIdx);

        // 現在の補間完了値を新しい起点とする
        fromParamsRef.current = { ...interpolated };
        targetParamsRef.current = expandPresetParams(UNIVERSE_PRESETS[nextIdx].params);
        cycleStartTimeRef.current = timestamp;
      }

      animFrameIdRef.current = requestAnimationFrame(animateTour);
    };

    animFrameIdRef.current = requestAnimationFrame(animateTour);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      isTourActiveRef.current = false;
    };
  }, [isTourActive]);

  const startTour = useCallback(() => {
    isTourActiveRef.current = true;
    // 開始点を現在のパラメータに設定
    fromParamsRef.current = { ...currentParametersRef.current };
    const nextIdx = (presetIndexRef.current + 1) % UNIVERSE_PRESETS.length;
    presetIndexRef.current = nextIdx;
    setCurrentPresetIndex(nextIdx);
    targetParamsRef.current = expandPresetParams(UNIVERSE_PRESETS[nextIdx].params);
    cycleStartTimeRef.current = performance.now();

    setIsTourActive(true);
    soundSystem.playParameterTick(700);
  }, []);

  const stopTour = useCallback(() => {
    isTourActiveRef.current = false;
    setIsTourActive(false);
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
  }, []);

  const toggleTour = useCallback(() => {
    if (isTourActive) {
      stopTour();
    } else {
      startTour();
    }
  }, [isTourActive, startTour, stopTour]);

  const skipNext = useCallback(() => {
    // 現在のパラメータを起点として即座に次のターゲットを設定
    fromParamsRef.current = { ...currentParametersRef.current };
    const nextIdx = (presetIndexRef.current + 1) % UNIVERSE_PRESETS.length;
    setupPresetTarget(nextIdx);
    soundSystem.playParameterTick(750);
  }, [setupPresetTarget]);

  const skipPrev = useCallback(() => {
    fromParamsRef.current = { ...currentParametersRef.current };
    const prevIdx = (presetIndexRef.current - 1 + UNIVERSE_PRESETS.length) % UNIVERSE_PRESETS.length;
    setupPresetTarget(prevIdx);
    soundSystem.playParameterTick(500);
  }, [setupPresetTarget]);

  // 手動でパラメータが変更された場合は起点を更新
  useEffect(() => {
    if (!isTourActive) {
      currentParametersRef.current = currentParameters;
    }
  }, [currentParameters, isTourActive]);

  return {
    isTourActive,
    tourProgress,
    tourRemainingSeconds,
    currentPresetIndex,
    currentPresetName,
    nextPresetName,
    toggleTour,
    startTour,
    stopTour,
    skipNext,
    skipPrev
  };
}
