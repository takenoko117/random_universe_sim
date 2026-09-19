// 多元宇宙5秒シームレス自動遷移ツアー・カスタムフック
import { useState, useRef, useEffect, useCallback } from 'react';
import { UNIVERSE_PRESETS } from '../data/presets';
import { DEFAULT_PARAMETERS } from '../data/parameters';
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

  const isTourActiveRef = useRef(false);
  const fromParamsRef = useRef<ParameterValues>({ ...currentParameters });
  const targetParamsRef = useRef<ParameterValues>({ ...currentParameters });
  const cycleStartTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const presetIndexRef = useRef(0);

  // プリセット名
  const currentPresetName = UNIVERSE_PRESETS[presetIndexRef.current]?.name || 'カスタム宇宙';
  const nextIndex = (presetIndexRef.current + 1) % UNIVERSE_PRESETS.length;
  const nextPresetName = UNIVERSE_PRESETS[nextIndex]?.name || '我々の宇宙';

  // 次のプリセットへの遷移を設定
  const setupNextPreset = useCallback((nextIdx: number, fromCurrent: boolean = true) => {
    presetIndexRef.current = nextIdx;
    setCurrentPresetIndex(nextIdx);

    const targetPreset = UNIVERSE_PRESETS[nextIdx];
    targetParamsRef.current = expandPresetParams(targetPreset.params);

    if (fromCurrent) {
      fromParamsRef.current = { ...currentParameters };
    }
    cycleStartTimeRef.current = performance.now();
  }, [currentParameters]);

  // アニメーションループ
  useEffect(() => {
    if (!isTourActive) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    const animateTour = (timestamp: number) => {
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

      const allKeys = Array.from(new Set([...Object.keys(fromP), ...Object.keys(toP)]));
      for (const k of allKeys) {
        const valFrom = fromP[k] !== undefined ? fromP[k] : 1.0;
        const valTo = toP[k] !== undefined ? toP[k] : 1.0;
        interpolated[k] = lerpParamLog(valFrom, valTo, progress);
      }

      setParameters(interpolated);

      // 5秒サイクル完了時の処理
      if (progress >= 1.0) {
        // 到達時の効果音
        soundSystem.playParameterTick(620);

        // 履歴に記録
        const seed = Math.floor(Math.random() * 900000 + 100000).toString();
        const res = evaluateUniverse(interpolated, seed);
        if (recordToHistory) {
          recordToHistory(res, interpolated);
        }

        // 次のプリセットをターゲットとして次の5秒サイクルを開始
        const nextIdx = (presetIndexRef.current + 1) % UNIVERSE_PRESETS.length;
        fromParamsRef.current = { ...interpolated };
        setupNextPreset(nextIdx, false);
      }

      animFrameIdRef.current = requestAnimationFrame(animateTour);
    };

    cycleStartTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(animateTour);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isTourActive, setupNextPreset, setParameters, recordToHistory]);

  const startTour = useCallback(() => {
    isTourActiveRef.current = true;
    setIsTourActive(true);
    fromParamsRef.current = { ...currentParameters };
    const nextIdx = (presetIndexRef.current + 1) % UNIVERSE_PRESETS.length;
    setupNextPreset(nextIdx, true);
    soundSystem.playParameterTick(700);
  }, [currentParameters, setupNextPreset]);

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
    const nextIdx = (presetIndexRef.current + 1) % UNIVERSE_PRESETS.length;
    setupNextPreset(nextIdx, true);
    soundSystem.playParameterTick(750);
  }, [setupNextPreset]);

  const skipPrev = useCallback(() => {
    const prevIdx = (presetIndexRef.current - 1 + UNIVERSE_PRESETS.length) % UNIVERSE_PRESETS.length;
    setupNextPreset(prevIdx, true);
    soundSystem.playParameterTick(500);
  }, [setupNextPreset]);

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
