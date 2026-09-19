// 超銀河団・メガスケールGPU星空シェーダー (GLSL)
// 120,000個以上の星・数十個の多様な銀河（渦巻、楕円、棒渦巻、リング、アンテナ銀河）をGPUで完全並列計算

export const cosmicStarVertexShader = /* glsl */ `
  attribute vec3 aLocalPos;        // 銀河中心からの局所相対座標
  attribute vec3 aGalaxyCenter;    // 銀河の中心座標 (cx, cy, cz)
  attribute vec3 aColor;           // 星の色 (RGB)
  attribute float aSize;           // 星の基本サイズ
  attribute float aSpinSpeed;      // 自銀河の自転角速度
  attribute float aOrbitSpeed;     // 超銀河団内での公転・ドリフト速度
  attribute float aClusterType;    // 0: 主銀河, 1: 近傍・伴銀河群, 2: 遠方超銀河団

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

    // 1. 各銀河独自の自転運動 (Local Galactic Rotation)
    vec3 localPos = aLocalPos;
    float spinAngle = aSpinSpeed * (uTime * 0.035) * uSpeed;
    float cosSpin = cos(spinAngle);
    float sinSpin = sin(spinAngle);
    float rx = localPos.x * cosSpin - localPos.z * sinSpin;
    float rz = localPos.x * sinSpin + localPos.z * cosSpin;
    localPos.x = rx;
    localPos.z = rz;

    vec3 centerPos = aGalaxyCenter;

    if (aClusterType < 0.5) {
      // [A] 主銀河 (中央巨大銀河・差動回転 & 終末時空変動)
      float rLocal = length(localPos.xz);
      float diffSpeed = (0.35 / (sqrt(max(1.0, rLocal)) + 0.4)) * sqrt(max(0.1, uG)) * uSpeed;
      float diffAngle = diffSpeed * (uTime * 0.025);
      float cDiff = cos(diffAngle);
      float sDiff = sin(diffAngle);
      float dx = localPos.x * cDiff - localPos.z * sDiff;
      float dz = localPos.x * sDiff + localPos.z * cDiff;
      localPos.x = dx;
      localPos.z = dz;

      // ビッグリップ（外側への急激な引き裂かれ）
      if (uLambda > 8.0) {
        float ripExpand = 1.0 + log(uLambda * 0.12) * mod(uTime * 0.08, 2.5);
        localPos *= ripExpand;
      }
      // ビッグクランチ（中心ブラックホールへの崩壊収縮）
      if (uG > 2.5 && uLambda < 0.2) {
        float crunchFactor = max(0.15, 1.0 - log(uG) * 0.14 * mod(uTime * 0.08, 2.0));
        localPos *= crunchFactor;
      }
    } else {
      // [B & C] 周囲の多様な銀河群 & 遠方超銀河団 (Supercluster Orbit & Hubble Expansion)
      float rCenter = length(aGalaxyCenter.xz);
      float angleCenter = atan(aGalaxyCenter.z, aGalaxyCenter.x);

      // 銀河団公転
      float clusterOrbit = aOrbitSpeed * (uTime * 0.007) * uSpeed * sqrt(max(0.1, uG));
      float currentAngle = angleCenter + clusterOrbit;

      // ハッブル膨張流
      float hubbleExpansion = 1.0 + (uLambda - 1.0) * 0.06;
      float currentDist = rCenter * max(0.5, hubbleExpansion);

      // ビッグリップ時はすべての銀河が散開・引き裂かれる
      if (uLambda > 8.0) {
        currentDist += (uLambda - 8.0) * 1.8 * mod(uTime * 0.12, 10.0);
        localPos *= (1.0 + (uLambda - 8.0) * 0.05 * mod(uTime * 0.1, 3.0));
      }
      // ビッグクランチ時はすべての銀河が中央ブラックホールに吸い込まれる
      if (uG > 2.5 && uLambda < 0.2) {
        currentDist = max(20.0, currentDist - (uG - 2.0) * 15.0 * mod(uTime * 0.12, 6.0));
      }

      centerPos.x = cos(currentAngle) * currentDist;
      centerPos.z = sin(currentAngle) * currentDist;
    }

    // 4次元空間次元の幾何学振動
    if (abs(uD - 3.0) > 0.1) {
      localPos.y += sin(uTime * 2.5 + localPos.x * 0.06) * 16.0;
      centerPos.y += sin(uTime * 1.8 + centerPos.x * 0.02) * 25.0;
    }

    vec3 pos = centerPos + localPos;

    // カメラ投影座標系
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // サイズアッテネーション (視認性と美しさの最適化)
    float dist = length(mvPosition.xyz);
    float pointSize = aSize * (360.0 / dist);

    if (aClusterType > 1.5) {
      // 遠方超銀河団は遠景で美しくきらめく
      pointSize = max(1.8, pointSize * 1.8);
      vAlpha = clamp(0.3 + (dist / 850.0) * 0.65, 0.25, 0.95);
    } else if (aClusterType > 0.5) {
      // 周囲の銀河
      pointSize = max(1.5, pointSize * 1.4);
      vAlpha = clamp(1.1 - (dist / 1100.0), 0.35, 1.0);
    } else {
      // 主銀河
      vAlpha = clamp(1.2 - (dist / 950.0), 0.4, 1.0);
    }

    gl_PointSize = clamp(pointSize, 1.2, 50.0);
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
