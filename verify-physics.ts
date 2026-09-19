// 物理評価エンジンの自動検証スクリプト
import { evaluateUniverse } from './src/engine/physicsEvaluator.js';
import { DEFAULT_PARAMETERS } from './src/data/parameters.js';
import { UNIVERSE_PRESETS } from './src/data/presets.js';

console.log('--- マルチバース物理エンジン 検証開始 ---');

// 1. 我々の標準宇宙
const standardResult = evaluateUniverse(DEFAULT_PARAMETERS, 'standard_test');
console.log(`[TEST 1] 我々の宇宙: Rank = ${standardResult.rank}, Score = ${standardResult.metrics.habitableScore}, Fate = ${standardResult.fate}`);
if (standardResult.rank !== 'Type S') {
  console.error('FAIL: Standard universe should be Type S');
  process.exit(1);
}
if (!standardResult.metrics.waterExistence || !standardResult.metrics.carbonSynthesis) {
  console.error('FAIL: Standard universe must have water and carbon');
  process.exit(1);
}

// 2. ジプロトン災厄 (alpha_s +3.5%)
const diprotonParams = { ...DEFAULT_PARAMETERS, alpha_s: 1.035 };
const diprotonResult = evaluateUniverse(diprotonParams, 'diproton_test');
console.log(`[TEST 2] ジプロトン災厄: Rank = ${diprotonResult.rank}, Water = ${diprotonResult.metrics.waterExistence}, NuclearStatus = ${diprotonResult.phases.nuclearStability.status}`);
if (diprotonResult.metrics.waterExistence) {
  console.error('FAIL: Water should be impossible in diproton universe (all hydrogen converted to helium)');
  process.exit(1);
}

// 3. 4次元空間 (D = 4)
const fourDParams = { ...DEFAULT_PARAMETERS, D_dim: 4 };
const fourDResult = evaluateUniverse(fourDParams, '4d_test');
console.log(`[TEST 3] 4次元宇宙: Rank = ${fourDResult.rank}, Fate = ${fourDResult.fate}`);
if (fourDResult.rank !== 'Type F' || fourDResult.fate !== 'geometric_collapse') {
  console.error('FAIL: 4D universe should collapse geometrically');
  process.exit(1);
}

// 4. ビッグリップ (lambda_cosmo = 50.0)
const ripParams = { ...DEFAULT_PARAMETERS, lambda_cosmo: 50.0 };
const ripResult = evaluateUniverse(ripParams, 'rip_test');
console.log(`[TEST 4] ビッグリップ: Fate = ${ripResult.fate}`);
if (ripResult.fate !== 'big_rip') {
  console.error('FAIL: High lambda should trigger big rip');
  process.exit(1);
}

// 5. 中性子海 (m_u = 2.2, m_d = 0.7)
const neutronParams = { ...DEFAULT_PARAMETERS, m_u: 2.2, m_d: 0.7 };
const neutronResult = evaluateUniverse(neutronParams, 'neutron_test');
console.log(`[TEST 5] 中性子海: Fate = ${neutronResult.fate}`);
if (neutronResult.fate !== 'neutron_void') {
  console.error('FAIL: Heavy up quark should cause neutron void');
  process.exit(1);
}

// 6. 全プリセットの実行確認
console.log('--- 全プリセットのシミュレーション検証 ---');
for (const preset of UNIVERSE_PRESETS) {
  const params = { ...DEFAULT_PARAMETERS, ...preset.params };
  const res = evaluateUniverse(params, preset.id);
  console.log(`  Preset [${preset.nameEn}]: Rank = ${res.rank}, Fate = ${res.fate}, HabScore = ${res.metrics.habitableScore}`);
}

console.log('SUCCESS: すべての物理エンジン検証テストに合格しました！');
