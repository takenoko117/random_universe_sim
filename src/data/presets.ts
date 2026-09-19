// 代表的な宇宙プリセットの定義
import type { UniversePreset } from '../types/physics';

export const UNIVERSE_PRESETS: UniversePreset[] = [
  {
    id: 'our_standard',
    name: '我々の宇宙 (The Anthropic Standard)',
    nameEn: 'Our Standard Universe',
    description: '30個のパラメータが奇跡的なバランスで調律された唯一無二の宇宙。星々が灯り、炭素が生まれ、生命と意識が誕生した。',
    category: 'standard',
    params: {} // All 1.0
  },
  {
    id: 'diproton_catastrophe',
    name: 'ジプロトン災厄 (Helium Primacy)',
    nameEn: 'The Diproton Catastrophe',
    description: '強い力がわずか3%強いだけで、二陽子(²He)が安定結合。ビッグバン時にすべての水素が一瞬でヘリウムに変換され、水も太陽のような長期寿命星も存在しない。',
    category: 'extreme',
    params: {
      alpha_s: 1.035
    }
  },
  {
    id: 'big_rip',
    name: 'ビッグリップ (The Big Rip)',
    nameEn: 'Accelerated Disruption',
    description: '暗黒エネルギー(宇宙項)が数十倍に膨れ上がった宇宙。銀河や太陽系はおろか、最後は分子や原子核すら時空の激しい膨張によって引き裂かれる。',
    category: 'apocalyptic',
    params: {
      lambda_cosmo: 50.0,
      H_0: 3.5
    }
  },
  {
    id: 'big_crunch',
    name: 'ビッグクランチ (Singularity Recollapse)',
    nameEn: 'The Great Collapse',
    description: '重力定数が強く、暗黒エネルギーが負または希薄な宇宙。膨張の勢いが早期に失われ、誕生からわずか数十億年ですべてが灼熱の特異点へと逆収縮する。',
    category: 'apocalyptic',
    params: {
      G: 3.5,
      lambda_cosmo: 0.05,
      H_0: 0.5
    }
  },
  {
    id: 'neutron_sea',
    name: '中性子海 (The Protonless Void)',
    nameEn: 'The Neutron Sea',
    description: 'アップクォークがダウンクォークより重くなった宇宙。陽子が中性子より重くなり、すべての陽子が中性子へと崩壊。電子を従えた原子が存在せず、中性子の海が広がる。',
    category: 'extreme',
    params: {
      m_u: 2.2,
      m_d: 0.7
    }
  },
  {
    id: 'cold_hydrogen_cemetery',
    name: '冷たい水素墓場 (Unignited Gas)',
    nameEn: 'Cold Hydrogen Cemetery',
    description: '強い力が約8%弱いため、重水素(²H)が結合できずビッグバン元素合成が完全停止。星が核融合の第一歩を踏み出せず、冷たい水素ガスが永遠に漂う。',
    category: 'extreme',
    params: {
      alpha_s: 0.91
    }
  },
  {
    id: 'photon_desert',
    name: '光子の砂漠 (Photon Desert)',
    nameEn: 'The Photon Desert',
    description: 'バリオン数非対称性の破れが不十分で、宇宙初期に物質と反物質が100%対消滅。星もチリも残らず、純粋な光子とニュートリノの放射だけが無限に薄まる。',
    category: 'apocalyptic',
    params: {
      eta_baryon: 0.0001,
      delta_cp: 0.01
    }
  },
  {
    id: 'four_dimensional',
    name: '4次元の幾何学崩壊 (4D Orbital Collapse)',
    nameEn: '4D Dimensional Ruin',
    description: '空間が4次元の宇宙。重力と電磁気力が距離の3乗に反比例(1/r³)するため、安定した惑星軌道や電子のボーア軌道が存在できず、全てが瞬時に中心へ墜落する。',
    category: 'apocalyptic',
    params: {
      D_dim: 4.0
    }
  },
  {
    id: 'hypergravity_stars',
    name: '超重力・極小恒星群 (Hypergravity Mini-Stars)',
    nameEn: 'Hypergravity Mini-Stars',
    description: '重力定数Gが20倍の宇宙。星の質量は極小化しつつも内部圧力は超巨大。星々は数万年〜数百万年という瞬きのような寿命で核燃料を燃え尽くし、無数のブラックホールが残る。',
    category: 'extreme',
    params: {
      G: 20.0
    }
  },
  {
    id: 'hoyle_failure',
    name: '炭素なきホイル不全 (Carbonless Universe)',
    nameEn: 'Hoyle Resonance Failure',
    description: '微細構造定数がわずか4%変動したことで、ヘリウム3個から炭素12を作る「ホイル状態(7.65 MeV)」の奇跡的共鳴が消失。炭素と酸素が宇宙に生まれず有機化学が存在しない。',
    category: 'exotic',
    params: {
      alpha_em: 1.04,
      alpha_s: 0.98
    }
  },
  {
    id: 'vacuum_decay',
    name: '偽の真空崩壊 (False Vacuum Decay)',
    nameEn: 'Metastable Vacuum Catastrophe',
    description: 'ヒッグス自己結合が弱くトップクォークが重いため、電弱真空のポテンシャル障壁が極度に薄い。誕生直後に真の真空泡が核生成し、光速で膨張して宇宙を蒸発させた。',
    category: 'apocalyptic',
    params: {
      lambda_higgs: 0.25,
      m_t: 1.4
    }
  },
  {
    id: 'hyperluminal',
    name: '超光速の極炎 (Hyperluminal Realm)',
    nameEn: 'Hyperluminal Realm',
    description: '光速度が5倍の宇宙。E=mc²のエネルギー生成効率が25倍に跳ね上がり、星々は超高輝度で爆轟。因果律の地平線は巨大化するが星の寿命は劇的に縮む。',
    category: 'exotic',
    params: {
      c: 5.0
    }
  }
];
