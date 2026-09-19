// 宇宙の30大ハイパーパラメータおよびシミュレーション型の定義

export type ParameterCategory = 
  | 'spacetime'       // 重力・時空・宇宙論
  | 'electroweak'     // 電磁気・弱い力・レプトン
  | 'strong_nuclear'  // 強い力・核物理・クォーク
  | 'cosmology';      // 宇宙論・初期宇宙・対称性

export interface PhysicsParameter {
  id: string;
  symbol: string;
  nameJa: string;
  nameEn: string;
  category: ParameterCategory;
  standardValue: number; // 我々の宇宙での標準倍率 = 1.0
  minLog: number; // 対数スケール下限 (例: -3 -> 10^-3)
  maxLog: number; // 対数スケール上限 (例: 3 -> 10^3)
  step: number;
  unit: string;
  description: string;
  anthropicReason: string; // なぜこの値が微調整されているのか（人間原理的理由）
  extremeHighEffect: string; // 値が極端に大きい場合の影響
  extremeLowEffect: string;  // 値が極端に小さい場合の影響
}

export type ParameterValues = Record<string, number>; // id -> relative multiplier (1.0 = standard)

export type UniverseRank = 'Type S' | 'Type A' | 'Type B' | 'Type C' | 'Type D' | 'Type F';

export type CosmicFate = 
  | 'heat_death'        // 熱的死（ビッグフリーズ）
  | 'big_rip'           // ビッグリップ（引き裂かれる時空）
  | 'big_crunch'        // ビッグクランチ（再収縮・特異点崩壊）
  | 'vacuum_decay'      // 偽の真空崩壊（誕生即消滅）
  | 'all_blackholes'    // 全域ブラックホール化（極限重力）
  | 'eternal_hydrogen'  // 恒星不点火（永遠の冷たい水素雲）
  | 'photon_desert'     // 光子の砂漠（物質不在・純粋放射）
  | 'neutron_void'      // 中性子海（陽子消失・原子不在）
  | 'geometric_collapse'// 幾何学的不安定（高次元または低次元）
  | 'eternal_crystal';  // 超極低温結晶宇宙

export interface PhaseAssessment {
  name: string;
  status: 'passed' | 'critical' | 'failed';
  title: string;
  description: string;
  impactScore: number; // 0 to 100
}

export interface UniverseSimulationResult {
  universeId: string;
  name: string;
  subtitle: string;
  rank: UniverseRank;
  rankTitle: string;
  fate: CosmicFate;
  fateDescription: string;
  lifespanGyr: number; // 宇宙の寿命 (数十億年単位、我々の宇宙は~1000億年後まで星がある)
  
  // 各段階の評価
  phases: {
    vacuumStability: PhaseAssessment;   // 真空の安定性
    spaceGeometry: PhaseAssessment;     // 時空幾何学（次元）
    baryonAsymmetry: PhaseAssessment;   // 物質-反物質非対称性
    nuclearStability: PhaseAssessment;  // 核力・陽子中性子の安定性
    cosmicExpansion: PhaseAssessment;   // 宇宙膨張と構造形成
    stellarNucleo: PhaseAssessment;     // 恒星の点火と元素合成
    chemicalComplexity: PhaseAssessment;// ホイル共鳴・炭素・分子形成
    habitability: PhaseAssessment;      // 生命居住可能性
  };

  // 物理的指標
  metrics: {
    starCountRelative: number;         // 星の総数（我々の宇宙比）
    galaxyCountRelative: number;       // 銀河の総数
    averageStarLifespanMyr: number;    // 平均恒星寿命（百万年単位、太陽は10,000Myr）
    chemicalDiversity: number;         // 元素多様性 (0〜100)
    waterExistence: boolean;           // 液体の水の存在可否
    carbonSynthesis: boolean;          // 炭素合成（ホイル状態）可能か
    habitableScore: number;            // 生命居住指数 (0〜100)
    complexityScore: number;           // 物理構造の複雑性 (0〜100)
    entropyProduction: number;         // エントロピー生成率
    blackHoleDominance: number;        // ブラックホール化比率 (0〜100)
  };

  // 生成された生命や特異な存在（もしあれば）
  lifeFormHypothesis?: {
    type: string;
    description: string;
    rarity: 'Common' | 'Rare' | 'Ultra Rare' | 'Legendary' | 'Impossible';
  };

  tags: string[];
}

export interface UniversePreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: 'standard' | 'extreme' | 'apocalyptic' | 'exotic';
  params: Partial<ParameterValues>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  condition: (res: UniverseSimulationResult, params: ParameterValues) => boolean;
}
