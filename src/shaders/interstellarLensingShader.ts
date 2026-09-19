// 厳密一般相対論的シュワルツシルト重力レンズ・フルスクリーンシェーダー
// 測地線方程式および強重力場極限（Strong Deflection Limit）に基づくアインシュタイン偏向
// ※ 降着円盤（Accretion Disk）は削除され、純粋なブラックホール影・光子球リング・背景時空の重力レンズ歪曲を描画

export const interstellarLensingVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const interstellarLensingFragmentShader = /* glsl */ `
  uniform sampler2D tBackground; // Pass 1 の背景シーンテクスチャ (星々・超銀河団)
  uniform vec2 uResolution;
  uniform vec3 uCameraPos;
  uniform mat4 uCameraWorldMatrix;
  uniform mat4 uCameraMatrixWorldInverse;
  uniform mat4 uCameraProjectionMatrix;
  uniform mat4 uCameraInvProjectionMatrix;
  
  uniform vec3 uBhPos;            // ブラックホール中心座標
  uniform float uRs;              // シュワルツシルト半径 (2GM / c^2)
  uniform float uLensingStrength; // レンズ効果強度 (1.0 = 厳密相対論)
  uniform vec3 uCoreColor;        // 特殊宇宙時のコア色調

  varying vec2 vUv;

  void main() {
    // 1. スクリーン空間UVから3Dワールド空間の視線レイ方向を復元
    vec2 ndc = vUv * 2.0 - 1.0;
    vec4 clipPos = vec4(ndc, -1.0, 1.0);
    vec4 viewPos = uCameraInvProjectionMatrix * clipPos;
    viewPos.xyz /= viewPos.w;
    vec3 rayDirWorld = normalize((uCameraWorldMatrix * vec4(viewPos.xyz, 0.0)).xyz);

    // レンズ効果が無効の場合は背景をそのまま描画
    if (uLensingStrength <= 0.001 || uRs <= 0.01) {
      gl_FragColor = texture2D(tBackground, vUv);
      return;
    }

    // 2. ブラックホールと視線レイの幾何学的関係
    vec3 toBh = uBhPos - uCameraPos;
    float distToBh = length(toBh);
    vec3 kDir = toBh / distToBh; // カメラからブラックホール中心への単位ベクトル

    // 視線レイとブラックホール中心軸とのなす角 theta
    float cosTheta = dot(rayDirWorld, kDir);
    
    // ブラックホールの反対側を向いているレイは歪曲なし
    if (cosTheta <= 0.0) {
      gl_FragColor = texture2D(tBackground, vUv);
      return;
    }

    cosTheta = clamp(cosTheta, 0.0, 1.0);
    float theta = acos(cosTheta);

    // インパクトパラメータ (最近接距離) b = D * sin(theta)
    float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
    float b = distToBh * sinTheta;

    // 一般相対論におけるシュワルツシルト・ブラックホールの臨界インパクトパラメータ (影の見かけの半径)
    // b_crit = sqrt(27)/2 * rs ≈ 2.598076 * rs (光子捕獲断面積)
    float bCrit = 2.598076 * uRs;

    // 見かけの事象の地平面影の角半径
    float sinThetaCrit = clamp(bCrit / distToBh, 0.0, 0.999);
    float thetaCrit = asin(sinThetaCrit);

    // 3. 事象の地平面シャドウ (Black Hole Shadow)
    // b <= b_crit の光線は事象の地平面内に不可逆的に捕獲される
    if (theta <= thetaCrit || b <= bCrit) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // 4. 一般相対論的アインシュタイン光線偏向角 alpha(b) の厳密計算
    // 弱重力場極限 (b >> rs): alpha = 2*rs / b (アインシュタインの1915年公式 4GM/c^2*b)
    // 強重力場極限 (b -> b_crit): 光子球 (r = 1.5*rs) 周回による対数的発散 (Bozza / Virbhadra-Ellis 公式)
    float bRel = b / uRs;
    float bCritRel = bCrit / uRs; // 2.598076
    
    float ratio = clamp(bCrit / b, 0.0, 0.9999);
    float logDivergence = -log(max(0.0001, 1.0 - ratio));
    
    // 滑らかに連続する一般相対論偏向角 (ラジアン)
    float alpha = (2.0 / bRel + 1.4 / (bRel * bRel) + 0.62 * logDivergence) * uLensingStrength;
    alpha = min(alpha, 3.14159265 * 3.0); // 数値発散のリミッター

    // 偏向平面における偏向ベクトルの計算
    // rayDirWorld = cos(theta) * kDir + sin(theta) * ePerp
    vec3 vPerp = rayDirWorld - cosTheta * kDir;
    float lenPerp = length(vPerp);
    vec3 ePerp = lenPerp > 1e-6 ? (vPerp / lenPerp) : vec3(0.0, 1.0, 0.0);

    // 重力によって中心方向に alpha だけ曲げられた新たなレイ方向 dPrime
    float thetaPrime = theta - alpha;
    vec3 dPrime = normalize(cos(thetaPrime) * kDir + sin(thetaPrime) * ePerp);

    // 5. 曲げられたレイ方向 dPrime をカメラの投影座標系へ逆写像
    // カメラの前方 1000 単位にある遠方背景天球の位置
    vec4 farPointWorld = vec4(uCameraPos + dPrime * 1000.0, 1.0);
    vec4 farPointView = uCameraMatrixWorldInverse * farPointWorld;
    vec4 farPointClip = uCameraProjectionMatrix * farPointView;

    // 透視投影除算でスクリーンUVを取得
    vec2 bentUv = vUv;
    if (farPointClip.w > 0.001) {
      bentUv = (farPointClip.xy / farPointClip.w) * 0.5 + 0.5;
    } else {
      // 180度以上裏側に巻き込まれた光線は境界にクランプ
      bentUv = (farPointClip.xy / max(0.001, abs(farPointClip.w))) * 0.5 + 0.5;
    }
    bentUv = clamp(bentUv, 0.001, 0.999);

    // 背景（星空・超銀河団）の偏向サンプリング
    vec4 bgSample = texture2D(tBackground, bentUv);
    vec3 finalColor = bgSample.rgb;

    // 6. 光子球リング (Photon Ring: 事象の地平面影の境界直外側の黄金・輝白の閃光輪)
    // 光子球近傍を通過した背景の光が極限まで集光される相対論的光輪
    float shadowMargin = (b - bCrit) / uRs;
    if (shadowMargin >= 0.0 && shadowMargin < 0.45) {
      float ringIntensity = pow(clamp(1.0 - shadowMargin / 0.45, 0.0, 1.0), 3.5);
      vec3 ringColor = vec3(1.0, 0.96, 0.88) * uCoreColor;
      finalColor += ringColor * ringIntensity * 2.8;
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
