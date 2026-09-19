// 超銀河団・メガスケールGPU星空シェーダー (GLSL)
// 80,000個以上の星・銀河をGPUで並列アニメーション計算（CPU負荷ゼロ）

export const cosmicStarVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aClusterType; // 0.0: 主銀河, 1.0: 伴銀河, 2.0: 超銀河団・遠方銀河
  attribute float aOrbitSpeed;
  attribute float aOriginalRadius;
  attribute float aOriginalAngle;
  attribute float aHeight;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uG;
  uniform float uC;
  uniform float uLambda;
  uniform float uD;
  uniform float uCameraDistance;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;

    float r = aOriginalRadius;
    float angle = aOriginalAngle;
    float y = aHeight;

    // 1. タイプ別の公転・運動ロジック
    if (aClusterType < 0.5) {
      // 主銀河（ケプラー差動回転）
      float orbitalSpeed = (0.28 / (sqrt(r) + 0.3)) * sqrt(max(0.1, uG)) * uSpeed;
      angle += orbitalSpeed * (uTime * 0.03);

      // ビッグリップ（外側への急激な引き裂かれ）
      if (uLambda > 8.0) {
        float ripExpand = log(max(1.0, uLambda)) * 0.45 * (uTime * 0.2);
        r += ripExpand;
        r = mod(r, 450.0);
      }
      // ビッグクランチ（中心への落下）
      if (uG > 2.5 && uLambda < 0.2) {
        float crunchPull = log(max(1.0, uG)) * 0.35 * (uTime * 0.2);
        r -= crunchPull;
        if (r < 8.0) r = 140.0;
      }
    } else if (aClusterType < 1.5) {
      // 伴銀河・球状星団（衛星軌道）
      angle += aOrbitSpeed * (uTime * 0.015) * uSpeed;
      r += sin(uTime * 0.05 + aOriginalRadius) * 2.0;
    } else {
      // 超銀河団・コズミックウェブ（ハッブル膨張）
      float hubbleFlow = (uLambda * 0.005 + 0.001) * r * (uTime * 0.01);
      r += hubbleFlow;
      r = mod(r, 900.0) + 120.0;
      angle += aOrbitSpeed * 0.002 * (uTime * 0.02) * uSpeed;
    }

    // 4次元空間次元の幾何学振動
    if (abs(uD - 3.0) > 0.1) {
      y += sin(uTime * 2.0 + aOriginalAngle * 3.0) * (r * 0.35);
    }

    vec3 pos;
    pos.x = cos(angle) * r;
    pos.z = sin(angle) * r;
    pos.y = y;

    // カメラ距離に応じたLODとサイズ調整
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // サイズアッテネーション
    float dist = length(mvPosition.xyz);
    float pointSize = aSize * (350.0 / dist);
    
    // 超銀河団は遠景で美しく光る
    if (aClusterType > 1.5) {
      pointSize = max(1.5, pointSize * 1.6);
      vAlpha = clamp(0.2 + (dist / 800.0) * 0.6, 0.2, 0.95);
    } else {
      vAlpha = clamp(1.2 - (dist / 900.0), 0.3, 1.0);
    }

    gl_PointSize = clamp(pointSize, 1.2, 45.0);
  }
`;

export const cosmicStarFragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 tex = texture2D(uTexture, gl_PointCoord);
    if (tex.a < 0.02) discard;

    vec3 finalColor = vColor * tex.rgb;
    gl_FragColor = vec4(finalColor, tex.a * vAlpha);
  }
`;
