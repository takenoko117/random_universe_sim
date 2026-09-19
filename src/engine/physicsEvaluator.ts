// 宇宙の30大ハイパーパラメータ物理評価エンジン
import type { 
  ParameterValues, 
  UniverseSimulationResult, 
  UniverseRank, 
  CosmicFate,
  PhaseAssessment 
} from '../types/physics';

/**
 * 30パラメータから宇宙の物理的進化と生命可能性を評価する
 */
export function evaluateUniverse(params: ParameterValues, customSeed?: string): UniverseSimulationResult {
  // パラメータ取得（フォールバック付き）
  const getP = (key: string, def = 1.0) => (params[key] !== undefined ? params[key] : def);

  const G = getP('G');
  const c = getP('c');
  const hbar = getP('hbar');
  const lambda_cosmo = getP('lambda_cosmo');
  const omega_cdm = getP('omega_cdm');
  const omega_b = getP('omega_b');
  const H_0 = getP('H_0');
  const Q = getP('Q_primordial');
  const n_s = getP('n_s');
  const D = Math.round(getP('D_dim', 3.0));

  const alpha_em = getP('alpha_em');
  const m_e = getP('m_e');
  const k_B = getP('k_B');
  const eps_0 = getP('eps_0');
  const a_rad = getP('a_rad');

  const alpha_s = getP('alpha_s');
  const G_F = getP('G_F');
  const m_u = getP('m_u');
  const m_d = getP('m_d');
  const m_s = getP('m_s');
  const v_higgs = getP('v_higgs');
  const lambda_higgs = getP('lambda_higgs');
  const m_nu = getP('m_neutrino');
  const theta_qcd = getP('theta_qcd');

  const eta = getP('eta_baryon');
  const m_mu = getP('m_mu');
  const m_tau = getP('m_tau');
  const m_cb = getP('m_cb');
  const m_t = getP('m_t');
  const delta_cp = getP('delta_cp');

  const universeId = customSeed || Math.floor(Math.random() * 900000 + 100000).toString();

  // 1. 幾何学・空間次元フェーズ (D)
  let phaseSpaceGeometry: PhaseAssessment;
  if (D !== 3) {
    phaseSpaceGeometry = {
      name: '時空幾何学',
      status: 'failed',
      title: `${D}次元の幾何学的破綻`,
      description: D > 3 
        ? `空間が${D}次元のため逆自乗則が成立せず(1/r^${D-1})、惑星や電子の周回軌道に安定解がありません。すべての天体は中心に墜落するか無限遠へ四散します。` 
        : `空間が${D}次元のため、神経回路網や血管など複雑な3次元的立体配線が交差できず、巨視的生命の進化が幾何学的に不可能です。`,
      impactScore: 0
    };
  } else {
    phaseSpaceGeometry = {
      name: '時空幾何学',
      status: 'passed',
      title: '安定した3次元平坦時空',
      description: '逆二乗則が美しく機能し、ケプラー軌道や電子軌道が何十億年も安定して存続可能です。',
      impactScore: 100
    };
  }

  // 2. 真空安定性フェーズ (lambda_higgs, m_t, v_higgs)
  let phaseVacuum: PhaseAssessment;
  const vacuumStabilityFactor = lambda_higgs - 0.25 * (m_t - 1.0) - 0.1 * (v_higgs - 1.0);
  if (vacuumStabilityFactor < 0.4) {
    phaseVacuum = {
      name: '真空の安定性',
      status: 'failed',
      title: '真の真空崩壊 (Vacuum Decay)',
      description: '電弱ポテンシャル障壁が極度に低く、量子トンネル効果によって真の真空泡が発生。光速で宇宙全土へ膨張し、全物理法則を書き換えて宇宙を即死させました。',
      impactScore: 0
    };
  } else if (vacuumStabilityFactor < 0.75) {
    phaseVacuum = {
      name: '真空の安定性',
      status: 'critical',
      title: 'メタスタブル真空 (脆弱な均衡)',
      description: '真空はかろうじて準安定状態を維持していますが、高エネルギー現象（超大質量ブラックホール蒸発など）で真空崩壊を引き起こす危険を孕んでいます。',
      impactScore: 60
    };
  } else {
    phaseVacuum = {
      name: '真空の安定性',
      status: 'passed',
      title: '強固な極小真空',
      description: 'ヒッグス自己結合が十分に強く、時空は真の基底状態として数十兆年以上の極めて高い安定性を誇ります。',
      impactScore: 100
    };
  }

  // 3. バリオン非対称性と物質生成 (eta, delta_cp, m_tau, m_cb)
  let phaseBaryon: PhaseAssessment;
  const generationFactor = Math.sqrt(m_tau * m_cb);
  const effectiveBaryonSurvive = eta * Math.sqrt(Math.max(0.001, delta_cp)) * generationFactor;
  if (effectiveBaryonSurvive < 0.05) {
    phaseBaryon = {
      name: 'バリオン数生成',
      status: 'failed',
      title: '完全対消滅・光子の砂漠',
      description: 'CP対称性の破れまたはサハロフ条件が不十分だったため、初期宇宙で物質と反物質がほぼ100%対消滅。星の材料となる原子は残らず、純粋な放射の海となりました。',
      impactScore: 5
    };
  } else if (effectiveBaryonSurvive > 30.0) {
    phaseBaryon = {
      name: 'バリオン数生成',
      status: 'critical',
      title: '超高密度物質カタストロフ',
      description: '物質が過剰に残存したため、初期の物質密度が異常に高く、星を形成する間もなく宇宙全体が早期に直接崩壊型ブラックホールへ転落しました。',
      impactScore: 25
    };
  } else {
    phaseBaryon = {
      name: 'バリオン数生成',
      status: 'passed',
      title: '絶妙な物質非対称性',
      description: '10億個の光子に対して数個のバリオンが奇跡的に生き残り、星や惑星、生命を構築するのに過不足ない物質量が確保されました。',
      impactScore: 95
    };
  }

  // 4. クォーク・核力・素粒子の安定性 (alpha_s, m_u, m_d, G_F, m_s, theta_qcd)
  let phaseNuclear: PhaseAssessment;
  const quarkDiff = m_d - m_u; // 標準では正 (m_d > m_u)
  const isDiprotonBound = alpha_s > 1.025; // 強い力が2.5%強いと二陽子が結合
  const isDeuteronUnbound = alpha_s < 0.93; // 強い力が7%弱いと重水素が非結合
  const isStrangeletDisaster = m_s < 0.25; // ストレンジ物質が基底状態になり通常核が接触崩壊
  const isThetaUnstable = theta_qcd > 8.0; // 強CP角が大きく中性子双極子モーメント異常

  if (quarkDiff < -0.05) {
    phaseNuclear = {
      name: '核力と素粒子',
      status: 'failed',
      title: '陽子崩壊・中性子の海',
      description: 'アップクォークがダウンクォークより重いため、陽子が中性子に自発崩壊。電子を従えた原子核が存在できず、宇宙は電荷を持たない中性子の冷たい海となりました。',
      impactScore: 0
    };
  } else if (isStrangeletDisaster) {
    phaseNuclear = {
      name: '核力と素粒子',
      status: 'failed',
      title: 'ストレンジレット転換災害',
      description: 'ストレンジクォークが軽すぎるため、ストレンジ物質が通常の核物質より安定化。すべての原子核が接触感染的に超高密度ストレンジ物質へ転換消滅しました。',
      impactScore: 0
    };
  } else if (isThetaUnstable) {
    phaseNuclear = {
      name: '核力と素粒子',
      status: 'critical',
      title: '強CP偏極・原子核歪曲',
      description: '強CP角θが巨大なため、中性子が大きな電気双極子モーメントを持ち、重原子核が内部電場によって自発分裂します。',
      impactScore: 40
    };
  } else if (G_F > 8.0) {
    phaseNuclear = {
      name: '核力と素粒子',
      status: 'failed',
      title: '超速ベータ崩壊・中性子枯渇',
      description: '弱い力が強大すぎて、初期宇宙で全ての中性子が陽子へ高速崩壊。重元素合成のための足場が消滅しました。',
      impactScore: 15
    };
  } else if (isDiprotonBound) {
    phaseNuclear = {
      name: '核力と素粒子',
      status: 'critical',
      title: '二陽子結合（ジプロトン災厄）',
      description: '強い力がわずかに強いため、二陽子(²He)がクーロン反発をねじ伏せて安定結合。ビッグバン時にすべての水素が一瞬でヘリウムへ核融合し、宇宙から水素と水が消失しました。',
      impactScore: 30
    };
  } else if (isDeuteronUnbound) {
    phaseNuclear = {
      name: '核力と素粒子',
      status: 'failed',
      title: '重水素非結合（未点火の宇宙）',
      description: '強い力が弱すぎるため、陽子と中性子が結びついて重水素(²H)になれません。ビッグバン元素合成はおろか恒星の核融合チェーンが第1ステップで完全に途絶えました。',
      impactScore: 10
    };
  } else {
    phaseNuclear = {
      name: '核力と素粒子',
      status: 'passed',
      title: '安定した陽子と豊かな原子核',
      description: '陽子は10³⁴年以上安定し、重水素は適度に結合。ジプロトンは結合せず、水素が豊富に残る完璧な核力チューニングです。',
      impactScore: 100
    };
  }

  // 5. 宇宙膨張と構造形成 (lambda_cosmo, G, H_0, Q, omega_cdm, omega_b, n_s, m_nu)
  let phaseExpansion: PhaseAssessment;
  const ripRisk = lambda_cosmo / (G * 0.8 + 0.2);
  const crunchRisk = (G * 2.0) / (Math.max(0.01, lambda_cosmo) * H_0);
  const freeStreamingDamping = m_nu > 12.0;
  const scaleInvarianceBroken = n_s > 1.4 || n_s < 0.6;

  if (ripRisk > 25.0) {
    phaseExpansion = {
      name: '宇宙膨張と大規模構造',
      status: 'failed',
      title: 'ビッグリップ (引き裂かれる時空)',
      description: '暗黒エネルギーの異常な反発力により、銀河団はおろか銀河、恒星系、そして最後には原子そのものが時空の加速度的膨張によって引き裂かれました。',
      impactScore: 10
    };
  } else if (crunchRisk > 15.0 && lambda_cosmo < 0.3) {
    phaseExpansion = {
      name: '宇宙膨張と大規模構造',
      status: 'failed',
      title: '早期ビッグクランチ (再収縮崩壊)',
      description: '重力定数が強大で暗黒エネルギーが弱すぎたため、宇宙は誕生からわずか数十億年以内で膨張を停止し、全物質が灼熱の特異点へ押し潰されました。',
      impactScore: 15
    };
  } else if (freeStreamingDamping) {
    phaseExpansion = {
      name: '宇宙膨張と大規模構造',
      status: 'critical',
      title: 'ホットダークマター自由運動減衰',
      description: 'ニュートリノの質量和が過大で光速近くで飛び交うため、小規模な重力ゆらぎが洗い流され、銀河や星団が形成されません。',
      impactScore: 30
    };
  } else if (scaleInvarianceBroken) {
    phaseExpansion = {
      name: '宇宙膨張と大規模構造',
      status: 'critical',
      title: 'スペクトル指数異常・偏った構造',
      description: `スペクトル指数(n_s = ${n_s.toFixed(2)})の乖離により、スケール不変性が崩壊。天体サイズが極端な二極化を起こしています。`,
      impactScore: 40
    };
  } else if (Q < 0.1 || omega_cdm < 0.05) {
    phaseExpansion = {
      name: '宇宙膨張と大規模構造',
      status: 'critical',
      title: '構造なき平坦ガス雲',
      description: '初期密度ゆらぎQや暗黒物質の足場が希薄すぎたため、重力凝縮が起きず、銀河もコズミックウェブも形成されない均一なガス雲が虚しく拡散しています。',
      impactScore: 25
    };
  } else if (Q > 20.0) {
    phaseExpansion = {
      name: '宇宙膨張と大規模構造',
      status: 'critical',
      title: '初期特異点氾濫 (ブラックホール宇宙)',
      description: 'ゆらぎ振幅が大きすぎたため、宇宙誕生後まもなく密度の山が直接崩壊し、無数の超大質量ブラックホールで埋め尽くされました。',
      impactScore: 35
    };
  } else {
    phaseExpansion = {
      name: '宇宙膨張と大規模構造',
      status: 'passed',
      title: '美しいコズミックウェブの形成',
      description: '暗黒物質のハローにバリオンが引き寄せられ、数千億の銀河と星団が網の目状に美しく結晶化しました。',
      impactScore: 98
    };
  }

  // 6. 恒星の点火と炉 (G, c, hbar, a_rad)
  let phaseStellar: PhaseAssessment;
  const starLifespanMultiplier = Math.pow(G, -2.2) * Math.pow(c, 1.5) * Math.pow(hbar, 0.5) / Math.pow(a_rad, 0.4);
  const avgStarLifespanMyr = Math.min(500000, Math.max(0.1, 10000 * starLifespanMultiplier));

  if (G > 15.0) {
    phaseStellar = {
      name: '恒星と炉',
      status: 'critical',
      title: '超重力・極小短命星の嵐',
      description: `重力が強大すぎるため、星の質量が極端に圧縮され核融合が超猛烈に加速。恒星の平均寿命はわずか ${avgStarLifespanMyr.toFixed(1)} 百万年で超新星・BH化し、生命が進化する時間を許しません。`,
      impactScore: 30
    };
  } else if (G < 0.05) {
    phaseStellar = {
      name: '恒星と炉',
      status: 'failed',
      title: '重力不足・点火不能',
      description: '重力が弱すぎて星間ガスが自重で収縮できず、中心温度が核融合の点火温度（1000万度）に届きません。宇宙は永遠に暗闇のままです。',
      impactScore: 5
    };
  } else {
    phaseStellar = {
      name: '恒星と炉',
      status: 'passed',
      title: '安定した主系列星の輝き',
      description: `恒星は核融合と放射圧・縮退圧のバランスを保ち、数十億〜数百億年にわたって穏やかに光と熱を宇宙へ供給し続けます（平均寿命: 約 ${(avgStarLifespanMyr / 1000).toFixed(1)} 0億年）。`,
      impactScore: 95
    };
  }

  // 7. ホイル共鳴・原子構造と化学的多様性 (alpha_em, alpha_s, m_e, eps_0, k_B, m_mu)
  let phaseChemistry: PhaseAssessment;
  const alpha_em_deviation = Math.abs(alpha_em - 1.0);
  const alpha_s_deviation = Math.abs(alpha_s - 1.0);
  const hoyleResonanceBroken = alpha_em_deviation > 0.04 || alpha_s_deviation > 0.035;
  const bohrScale = (Math.pow(hbar, 2) * eps_0) / (m_e * alpha_em);
  const isBohrDegenerate = bohrScale < 0.2 || bohrScale > 5.0;
  const isMuonRunaway = m_mu < 0.25; // ミューオン触媒爆縮
  const isThermalDisrupt = k_B > 5.0; // 熱運動で分子結合が解離

  const carbonPossible = !hoyleResonanceBroken && phaseNuclear.status !== 'failed' && phaseStellar.status !== 'failed';

  if (isMuonRunaway) {
    phaseChemistry = {
      name: '炭素合成と化学進化',
      status: 'failed',
      title: 'ミューオン冷核融合爆縮',
      description: 'ミューオンが電子の軌道を奪い、原子が超微小化。常温で核融合が自然連鎖爆発し、化学分子が存在できません。',
      impactScore: 5
    };
  } else if (isBohrDegenerate) {
    phaseChemistry = {
      name: '炭素合成と化学進化',
      status: 'critical',
      title: 'ボーア半径歪曲・原子不安定',
      description: '電子質量や電磁結合の狂いにより、ボーア半径が極端に縮退または膨張。安定した結晶や生体高分子を維持できません。',
      impactScore: 30
    };
  } else if (isThermalDisrupt) {
    phaseChemistry = {
      name: '炭素合成と化学進化',
      status: 'critical',
      title: '熱解離・極限エントロピー',
      description: 'ボルツマン定数k_Bが過大で熱運動が激しすぎるため、液体の安定温度幅が消失し、複雑な有機高分子が熱分解します。',
      impactScore: 35
    };
  } else if (hoyleResonanceBroken) {
    phaseChemistry = {
      name: '炭素合成と化学進化',
      status: 'critical',
      title: 'ホイル共鳴破綻・炭素欠乏',
      description: 'ヘリウム3個から炭素12を生み出す「7.65 MeVホイル状態」の微細な共鳴エネルギーがずれ、星の内部で炭素・酸素が作られません。炭素骨格に基づく有機化学は存在し得ません。',
      impactScore: 35
    };
  } else if (!carbonPossible) {
    phaseChemistry = {
      name: '炭素合成と化学進化',
      status: 'failed',
      title: '化学反応の不在',
      description: '核子や恒星が存在しないため、周期表の元素が作られず、化学結合そのものが成立しません。',
      impactScore: 0
    };
  } else {
    phaseChemistry = {
      name: '炭素合成と化学進化',
      status: 'passed',
      title: 'ホイル共鳴成立・豊かな有機化学',
      description: '奇跡的な核エネルギー準位の一致により、赤色巨星内で炭素と酸素が大量合成され、アミノ酸や水、シリコン鉱物など多彩な分子が銀河を満たします。',
      impactScore: 100
    };
  }

  // 終焉シナリオ (Cosmic Fate) と宇宙寿命の事前判定
  let fate: CosmicFate = 'heat_death';
  let fateDescription = '恒星が燃料を燃え尽くし、冷たいブラックホールと白色矮星が永遠の暗黒の中に散逸する熱的死。';
  let lifespanGyr = 100.0 * Math.max(0.01, starLifespanMultiplier);

  if (phaseSpaceGeometry.status === 'failed') {
    fate = 'geometric_collapse';
    fateDescription = `${D}次元空間の軌道崩壊により、すべての天体が即座に衝突・消滅。`;
    lifespanGyr = 0.01;
  } else if (phaseVacuum.status === 'failed') {
    fate = 'vacuum_decay';
    fateDescription = '偽の真空崩壊球が光速で全宇宙を消滅させた。';
    lifespanGyr = 0.001;
  } else if (phaseBaryon.status === 'failed') {
    fate = 'photon_desert';
    fateDescription = '物質が残らず、光子とニュートリノの冷たい波が永遠に広がる。';
    lifespanGyr = 9999;
  } else if (quarkDiff < -0.05) {
    fate = 'neutron_void';
    fateDescription = '陽子が消え去り、化学変化なき冷たい中性子の残骸だけが漂う。';
    lifespanGyr = 5000;
  } else if (ripRisk > 25.0) {
    fate = 'big_rip';
    fateDescription = '暗黒エネルギーの暴走により、あらゆる素粒子が時空から引き裂かれた。';
    lifespanGyr = Math.max(1.0, 30.0 / Math.sqrt(lambda_cosmo));
  } else if (crunchRisk > 15.0 && lambda_cosmo < 0.3) {
    fate = 'big_crunch';
    fateDescription = '重力崩壊により、全宇宙が1つの超高密度・超高温の特異点へ再収縮。';
    lifespanGyr = Math.max(0.5, 15.0 / Math.sqrt(G));
  } else if (isDeuteronUnbound) {
    fate = 'eternal_hydrogen';
    fateDescription = '核融合の火が灯ることなく、絶対零度の水素ガス雲が凍りつく。';
    lifespanGyr = 9999;
  } else if (G > 30.0 || Q > 25.0) {
    fate = 'all_blackholes';
    fateDescription = '天体のほぼ100%がブラックホールへ転落し、ホーキング放射を待つだけの虚無に。';
    lifespanGyr = 50.0;
  }

  // 8. 生命居住可能性 (Habitability)
  let phaseHabitability: PhaseAssessment;
  const waterPossible = carbonPossible && !isDiprotonBound && phaseNuclear.status === 'passed' && G < 8.0 && D === 3 && !isThermalDisrupt;
  const timeForEvolution = avgStarLifespanMyr > 2000 && lifespanGyr > 3.0; // 最低数十億年の宇宙寿命

  let habitabilityScore = 0;
  if (
    phaseSpaceGeometry.status === 'passed' && 
    phaseVacuum.status === 'passed' && 
    phaseBaryon.status === 'passed' && 
    phaseNuclear.status === 'passed' &&
    phaseExpansion.status === 'passed' &&
    timeForEvolution
  ) {
    let base = 50;
    if (carbonPossible) base += 25;
    if (waterPossible) base += 15;
    if (timeForEvolution) base += 10;
    
    const totalLogDeviation = Object.keys(params).reduce((sum, key) => {
      if (key === 'D_dim') return sum;
      return sum + Math.abs(Math.log10(Math.max(0.0001, params[key])));
    }, 0);

    habitabilityScore = Math.max(0, Math.min(100, Math.round(base - totalLogDeviation * 6)));
  }

  if (habitabilityScore >= 75) {
    phaseHabitability = {
      name: '生命居住可能性',
      status: 'passed',
      title: '意識と文明のゆりかご',
      description: '液体の水、有機分子、温暖な惑星、数十億年の時間的猶予が揃い、自己複製する高分子から意識ある知的生命体への進化が約束されています。',
      impactScore: habitabilityScore
    };
  } else if (habitabilityScore >= 35) {
    phaseHabitability = {
      name: '生命居住可能性',
      status: 'critical',
      title: '過酷・異形の生命可能性',
      description: '地球型炭素生命には過酷ですが、極限環境下でケイ素生命、高重力下プラズマ生命、あるいは中性子星表面の核子生命など、エキゾチックな形態が発生する余地があります。',
      impactScore: habitabilityScore
    };
  } else {
    phaseHabitability = {
      name: '生命居住可能性',
      status: 'failed',
      title: '完全なる不毛・生命不在',
      description: '生命に必要な前提条件（水・炭素・安定した天体・十分な時間・安定した原子）のいずれかが決定的に欠落しており、生命の灯火は宿りません。',
      impactScore: habitabilityScore
    };
  }

  // 宇宙ランク
  let rank: UniverseRank = 'Type B';
  let rankTitle = '不毛な恒星宇宙';

  if (phaseVacuum.status === 'failed' || phaseSpaceGeometry.status === 'failed') {
    rank = 'Type F';
    rankTitle = '泡沫の崩壊宇宙 (Aborted Universe)';
  } else if (phaseBaryon.status === 'failed' || phaseNuclear.status === 'failed') {
    rank = 'Type D';
    rankTitle = '物質なき特異点・死の宇宙 (Barren Void)';
  } else if (phaseExpansion.status === 'failed' || phaseStellar.status === 'failed') {
    rank = 'Type C';
    rankTitle = '星なき冷淡ガス宇宙 (Starless Universe)';
  } else if (habitabilityScore >= 75) {
    rank = 'Type S';
    rankTitle = '知的生命と文明の奇跡宇宙 (Golden Anthropic)';
  } else if (habitabilityScore >= 35 || carbonPossible) {
    rank = 'Type A';
    rankTitle = '天体と化学の多様宇宙 (Chemical Multiverse)';
  } else {
    rank = 'Type B';
    rankTitle = '生命不在の恒星宇宙 (Sterile Stellar)';
  }

  // 詩的な宇宙名とサブタイトル
  const { name, subtitle, lifeForm } = generateUniverseIdentity(
    universeId, 
    rank, 
    fate, 
    isDiprotonBound, 
    carbonPossible, 
    habitabilityScore,
    G,
    lambda_cosmo
  );

  const starCountRelative = phaseStellar.status === 'failed' ? 0 : Math.max(0.001, (omega_b * 0.7 + omega_cdm * 0.3) / (G * 0.5 + 0.5));
  const galaxyCountRelative = phaseExpansion.status === 'failed' ? 0 : Math.max(0.001, omega_cdm * (Q > 0.2 ? 1 : 0.05));
  const chemicalDiversity = Math.round(carbonPossible ? Math.min(100, 70 + (waterPossible ? 30 : 0)) : (isDeuteronUnbound ? 2 : 18));
  const blackHoleDominance = Math.min(100, Math.round(Math.pow(G, 1.3) * 5 + (Q > 5 ? 30 : 0)));

  return {
    universeId,
    name,
    subtitle,
    rank,
    rankTitle,
    fate,
    fateDescription,
    lifespanGyr: Math.round(lifespanGyr * 10) / 10,
    phases: {
      vacuumStability: phaseVacuum,
      spaceGeometry: phaseSpaceGeometry,
      baryonAsymmetry: phaseBaryon,
      nuclearStability: phaseNuclear,
      cosmicExpansion: phaseExpansion,
      stellarNucleo: phaseStellar,
      chemicalComplexity: phaseChemistry,
      habitability: phaseHabitability
    },
    metrics: {
      starCountRelative: Math.round(starCountRelative * 100) / 100,
      galaxyCountRelative: Math.round(galaxyCountRelative * 100) / 100,
      averageStarLifespanMyr: Math.round(avgStarLifespanMyr),
      chemicalDiversity,
      waterExistence: waterPossible,
      carbonSynthesis: carbonPossible,
      habitableScore: habitabilityScore,
      complexityScore: Math.round((chemicalDiversity * 0.4) + (habitabilityScore * 0.4) + (phaseExpansion.impactScore * 0.2)),
      entropyProduction: Math.round(G * c * 10) / 10,
      blackHoleDominance
    },
    lifeFormHypothesis: lifeForm,
    tags: [
      `空間${D}次元`,
      fate === 'big_rip' ? 'ビッグリップ' : fate === 'big_crunch' ? 'ビッグクランチ' : fate === 'vacuum_decay' ? '真空崩壊' : '熱的死',
      waterPossible ? '水存在可能' : '水不在',
      carbonPossible ? '炭素骨格あり' : '炭素不全',
      rank
    ]
  };
}

/**
 * 宇宙の詩的な名前と生命形態仮説を生成
 */
function generateUniverseIdentity(
  id: string,
  rank: UniverseRank,
  fate: CosmicFate,
  isDiproton: boolean,
  carbonPossible: boolean,
  habitableScore: number,
  G: number,
  _lambda: number
) {
  let name = `Multiverse #${id}`;
  let subtitle = '';
  let lifeForm: { type: string; description: string; rarity: 'Common' | 'Rare' | 'Ultra Rare' | 'Legendary' | 'Impossible' } | undefined;

  if (rank === 'Type S') {
    const titles = [
      '「黄金の調律と星々の歌」',
      '「深淵に灯る意識の海」',
      '「約束された生命の園」',
      '「奇跡のホイル共鳴世界」'
    ];
    subtitle = titles[parseInt(id.slice(-1)) % titles.length];
    lifeForm = {
      type: '多細胞炭素生命 & 知性文明体',
      description: '水と炭素の高分子鎖がRNA/DNAを織り成し、惑星表面に都市と観測望遠鏡を築く高等知的生命。',
      rarity: 'Legendary'
    };
  } else if (isDiproton) {
    subtitle = '「ヘリウムの炎と短命星の深淵」';
    lifeForm = {
      type: '超高圧ヘリウムプラズマ生命体（仮説）',
      description: '水が存在せず全宇宙がヘリウムで満ちる中、超高圧星間プラズマの渦流が自己組織化した純エネルギー的存在。',
      rarity: 'Ultra Rare'
    };
  } else if (fate === 'big_rip') {
    subtitle = '「無限に引き裂かれる光陰」';
    lifeForm = undefined;
  } else if (fate === 'big_crunch') {
    subtitle = '「特異点へ帰還する泡沫の炎」';
    lifeForm = undefined;
  } else if (fate === 'vacuum_decay') {
    subtitle = '「存在し得なかった虚無の夢」';
    lifeForm = undefined;
  } else if (fate === 'neutron_void') {
    subtitle = '「電荷なき中性子の静寂」';
    lifeForm = undefined;
  } else if (carbonPossible && habitableScore >= 35) {
    subtitle = '「異境の化学とケイ素の脈動」';
    lifeForm = {
      type: 'ケイ素ポリマー結晶生命',
      description: '極低温の液体メタンの湖で、ケイ素とシランの鎖を代謝エネルギー源とするガラス質の結晶生命。',
      rarity: 'Rare'
    };
  } else if (G > 10.0) {
    subtitle = '「超重力と瞬きの恒星群」';
    lifeForm = {
      type: '中性子星表面の核子ピコ生命',
      description: '強大な重力下で中性子星クラストの核力相互作用によってフェムト秒単位で思考・代謝する核物質生命。',
      rarity: 'Ultra Rare'
    };
  } else {
    subtitle = '「静寂の宇宙風と冷たいチリ」';
    lifeForm = undefined;
  }

  return { name, subtitle, lifeForm };
}
