// 映画『インターステラー』風 厳密重力レンズ・ブラックホール（ガルガンチュア）シェーダー
// キップ・ソーン教授らの相対論的降着円盤モデルに基づく一般相対論的レイトレーシング

export const blackHoleVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  void main() {
    vNormal = normal;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const blackHoleFragmentShader = /* glsl */ `
  uniform vec3 uCameraPos;
  uniform float uTime;
  uniform float uRs;          // シュワルツシルト半径 (2GM / c^2)
  uniform float uDiskInner;   // ISCO (最内縁安定円軌道: 3.0 * rs)
  uniform float uDiskOuter;   // 降着円盤外縁 (約 9.0 * rs)
  uniform float uDoppler;     // 相対論的ドップラー強度
  uniform float uTemperature; // 色温度・輝度
  uniform vec3 uBhColor;      // 特殊宇宙時のコアカラー

  varying vec3 vWorldPosition;

  #define MAX_STEPS 64
  #define STEP_SIZE 0.45

  // プロシージャル降着円盤テクスチャ & 放射強度
  vec4 getDiskEmission(vec3 p, float rs, float rIn, float rOut, float time) {
    float r = length(p.xz);
    if (r < rIn || r > rOut) return vec4(0.0);

    // 円盤上の角度
    float phi = atan(p.z, p.x);

    // ケプラー回転角速度: omega ~ sqrt(M / r^3)
    float omega = 3.5 * sqrt(rs / (r * r * r));
    float rotAngle = phi - omega * time * 1.5;

    // 渦巻ストライエーション・乱流ノイズパターン
    float noise1 = sin(rotAngle * 6.0 + r * 1.2) * 0.5 + 0.5;
    float noise2 = cos(rotAngle * 14.0 - r * 2.5) * 0.5 + 0.5;
    float striations = mix(noise1, noise2, 0.5);

    // 放射温度プロファイル (標準薄型ディスク: T ~ r^(-3/4) * (1 - sqrt(rIn/r))^(1/4))
    float rRel = (r - rIn) / (rOut - rIn);
    float tempProfile = pow(clamp(1.0 - rRel, 0.0, 1.0), 0.75) * pow(clamp(rRel * 4.0, 0.0, 1.0), 0.35);

    // 相対論的ドップラービーミング (観測者へ近づく側 = x < 0 が青方偏移で激しく増光)
    // 速度ベクトル v = (-sin(phi), 0, cos(phi)) * v_rot
    float vRot = sqrt(rs / (2.0 * r)); // ケプラー速度
    float dopplerFactor = 1.0 - vRot * sin(phi) * uDoppler;
    float beaming = pow(clamp(1.0 / max(0.1, dopplerFactor), 0.2, 3.5), 3.0);

    // 重力赤方偏移: g = sqrt(1 - rs / r)
    float gravRedshift = sqrt(clamp(1.0 - rs / r, 0.05, 1.0));

    // カラーパレット (高温白金〜オレンジ〜深紅〜暗赤色)
    vec3 colHot = vec3(1.0, 0.95, 0.85); // 輝白
    vec3 colMid = vec3(1.0, 0.55, 0.15); // オレンジ
    vec3 colCool = vec3(0.8, 0.15, 0.05);// 深紅

    vec3 baseCol = mix(colCool, colMid, clamp(tempProfile * 1.5, 0.0, 1.0));
    baseCol = mix(baseCol, colHot, clamp(tempProfile * beaming * 0.8 - 0.5, 0.0, 1.0));

    // ドップラーによる色シフト
    if (dopplerFactor < 0.8) {
      baseCol = mix(baseCol, vec3(0.7, 0.85, 1.0), (0.8 - dopplerFactor) * 1.2); // 青方偏移
    }

    float intensity = (tempProfile * 1.8 + striations * 0.4) * beaming * gravRedshift;
    float alpha = clamp(intensity * 1.5, 0.0, 0.95);

    return vec4(baseCol * intensity * uTemperature, alpha);
  }

  void main() {
    vec3 rayOrigin = uCameraPos;
    vec3 rayDir = normalize(vWorldPosition - uCameraPos);

    vec3 p = rayOrigin;
    vec3 dir = rayDir;

    // ブラックホール中心は原点 (0, 0, 0)
    float rs = uRs;
    float rIn = uDiskInner;
    float rOut = uDiskOuter;

    vec4 accumulatedColor = vec4(0.0);
    bool hitHorizon = false;

    // 光線追跡ループ（測地線レイマーチング）
    for (int step = 0; step < MAX_STEPS; step++) {
      float r = length(p);

      // 1. 事象の地平面進入判定 (ブラックホールシャドウ)
      if (r <= rs * 1.02) {
        hitHorizon = true;
        break;
      }

      // 2. 一般相対論的曲率偏向 (アインシュタイン測地線方程式の積分)
      // d(dir)/ds = - 1.5 * rs * p_perp / r^3
      vec3 toCenter = -normalize(p);
      float bendFactor = (1.5 * rs) / max(1.0, r * r);
      dir = normalize(dir + toCenter * bendFactor * STEP_SIZE);

      vec3 pNext = p + dir * STEP_SIZE;

      // 3. 降着円盤平面 (y = 0) との交差判定
      // 符号が反転した場合 (p.y と pNext.y の積が負)
      if (p.y * pNext.y <= 0.0) {
        // 線形補間により y = 0 との厳密な交点座標を計算
        float tDisk = p.y / (p.y - pNext.y);
        vec3 pDisk = mix(p, pNext, tDisk);

        vec4 diskEmission = getDiskEmission(pDisk, rs, rIn, rOut, uTime);
        if (diskEmission.a > 0.0) {
          // アルファ合成 (Front-to-back accumulation)
          accumulatedColor.rgb += diskEmission.rgb * (1.0 - accumulatedColor.a) * diskEmission.a;
          accumulatedColor.a += diskEmission.a * (1.0 - accumulatedColor.a);

          if (accumulatedColor.a > 0.95) break;
        }
      }

      p = pNext;

      // 4. 無限遠脱出判定
      if (r > rOut * 1.8 && dot(dir, p) > 0.0) {
        break;
      }
    }

    // 光子球リング (Photon Ring: r ~ 1.5 * rs) の極薄強烈な発光
    float minApproachedR = length(cross(rayDir, -rayOrigin));
    if (!hitHorizon && minApproachedR > rs && minApproachedR < rs * 1.6) {
      float photonGlow = pow(1.0 - abs(minApproachedR - rs * 1.5) / (rs * 0.5), 12.0);
      accumulatedColor.rgb += vec3(1.0, 0.95, 0.8) * photonGlow * 2.5 * (1.0 - accumulatedColor.a);
      accumulatedColor.a = max(accumulatedColor.a, photonGlow * 0.85);
    }

    // 事象の地平面内側は完全な暗黒（漆黒の影）
    if (hitHorizon) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // 背景（何もない部分は透過、ディスクやフォトンリングを描画）
    if (accumulatedColor.a <= 0.005) {
      discard;
    }

    gl_FragColor = vec4(accumulatedColor.rgb, accumulatedColor.a);
  }
`;
