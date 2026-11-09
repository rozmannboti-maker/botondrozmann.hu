// The project sheet's shader. One material works in two modes:
//  uMode = 0: a segment of the continuous ribbon; the vertices are laid out along a 3D
//             curve (stored in a float texture, parameterised by arc length).
//  uMode = 1: a single grid sheet; a rigid modelMatrix transform.
//
// Both modes add three displacements along the normal:
//  1. Continuous wind: smooth simplex noise running across the surface (uWind, px)
//  2. Cursor interaction + 3. spring recovery: the aDisp offset from the CPU spring-grid
//     simulation (ClothSim), with its own gradient aGrad for the lighting.

const noiseGLSL = /* glsl */ `
  // 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

export const cardVertex = /* glsl */ `
  uniform float uMode;
  uniform sampler2D uCurve;
  uniform float uCurveN;
  uniform float uCurveLen;
  uniform float uS0;
  uniform float uSLen;
  uniform float uRH;
  uniform float uFlex;
  uniform vec2 uSize;

  uniform float uWind;      // wind amplitude, px (0 → the sheet is perfectly flat)
  uniform float uTime;      // the sheet's own time (noise evolution)
  uniform float uSeed;      // the sheet's phase, so the sheets don't ripple in sync
  uniform vec2 uWindOff1;   // accumulated drift of the waves (flow direction)
  uniform vec2 uWindOff2;
  uniform vec4 uTouch;      // u, v, touch strength 0..1, radius (share of the height)
  uniform float uEdgeFree;
  uniform float uGust;
  uniform float uShadeGain;

  attribute float aDisp;
  attribute vec2 aGrad;

  varying vec2 vUv;
  varying float vShade;

  ${noiseGLSL}

  float windField(vec2 uv) {
    float ar = uSize.x / uSize.y;
    vec2 p = uv * vec2(ar, 1.0);            // isotropic sheet coordinates
    // a large wave running with the flow
    float n1 = snoise(vec3(p * 1.05 - uWindOff1, uTime * 0.09 + uSeed));
    // a second one at an angle, smaller and faster: phase, direction and speed differ
    float n2 = snoise(vec3(p * 1.9 - uWindOff2 + 11.7, uTime * 0.14 + uSeed * 1.37));
    float n = n1 * 0.74 + n2 * 0.26;
    // the edges respond a little more freely than the centre
    vec2 c = abs(uv * 2.0 - 1.0);
    float edge = max(c.x, c.y);
    edge *= edge;
    float env = 1.0 + uEdgeFree * edge;
    // local gust around the cursor
    vec2 dc = (uv - uTouch.xy) * vec2(ar, 1.0);
    float gust = 1.0 + uGust * uTouch.z * exp(-dot(dc, dc) / max(uTouch.w * uTouch.w, 1e-4));
    return n * env * gust * uWind;
  }

  void sampleCurve(float s, out vec3 P, out vec3 U, out vec3 T) {
    float f = clamp(s / uCurveLen, 0.0, 1.0) * (uCurveN - 1.0);
    float i0 = floor(f);
    float t = f - i0;
    int a = int(i0);
    int b = int(min(i0 + 1.0, uCurveN - 1.0));
    P = mix(texelFetch(uCurve, ivec2(a, 0), 0).xyz, texelFetch(uCurve, ivec2(b, 0), 0).xyz, t);
    U = normalize(mix(texelFetch(uCurve, ivec2(a, 1), 0).xyz, texelFetch(uCurve, ivec2(b, 1), 0).xyz, t));
    T = normalize(mix(texelFetch(uCurve, ivec2(a, 2), 0).xyz, texelFetch(uCurve, ivec2(b, 2), 0).xyz, t));
    if (s < 0.0) P += T * s;
    else if (s > uCurveLen) P += T * (s - uCurveLen);
  }

  // Light from the surface normal: exactly 1.0 on a flat sheet, the folds read as light and
  // shade (head-on, the geometry itself is almost invisible)
  float lit(vec2 g) {
    vec3 n = normalize(vec3(-g * uShadeGain, 1.0));
    vec3 L = normalize(vec3(-0.42, 0.58, 0.70));
    float d = dot(n, L) / L.z;
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(n, H), 0.0), 60.0) - pow(H.z, 60.0);
    return clamp(d + spec * 0.35, 0.8, 1.15);
  }

  void main() {
    vUv = uv;

    // wind + its gradient (finite differences), only when there is wind
    float w = 0.0;
    vec2 gw = vec2(0.0);
    if (uWind > 0.0005) {
      w = windField(uv);
      const float e = 0.015;
      gw = vec2((windField(uv + vec2(e, 0.0)) - w) / (e * uSize.x),
                (windField(uv + vec2(0.0, e)) - w) / (e * uSize.y));
    }
    float disp = aDisp + w;
    vec2 grad = aGrad + gw;

    vec3 p;
    if (uMode < 0.5) {
      float s = uS0 + uv.x * uSLen;
      vec3 P, U, T;
      sampleCurve(s, P, U, T);
      vec3 N = normalize(cross(T, U));
      float yy = uv.y - 0.5;
      float billow = uFlex * (1.0 - 4.0 * yy * yy);
      p = P + U * (yy * uRH) + N * billow;
      // the cursor always presses the sheet away from the viewer, whichever side faces them
      float facing = dot(N, cameraPosition - p) >= 0.0 ? 1.0 : -1.0;
      p += N * facing * disp;
      vShade = (0.92 + 0.08 * abs(N.z)) * lit(grad * facing);
    } else {
      vec3 local = vec3(position.x * uSize.x, position.y * uSize.y, disp);
      p = (modelMatrix * vec4(local, 1.0)).xyz;
      vShade = lit(grad);
    }
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

// uVideo is the template's preview loop. three uploads video textures without the sRGB
// format, so the shader decodes it (sRGBTransferEOTF); uMix crossfades poster → video.
export const cardFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uVideo;
  uniform float uMix;
  varying vec2 vUv;
  varying float vShade;

  void main() {
    // the back of a sheet reads like the front (no mirrored text)
    vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec3 c = texture2D(uMap, uv).rgb;
    if (uMix > 0.0) c = mix(c, sRGBTransferEOTF(texture2D(uVideo, uv)).rgb, uMix);
    gl_FragColor = vec4(c * vShade, 1.0);
    #include <colorspace_fragment>
  }
`;

// GPU picking: a 1 × 1 render target gets the sheet's id and the uv under the cursor.
// Same vertex shader → perspective, rotation, the ribbon's bend and the cloth all count.
export const pickFragment = /* glsl */ `
  uniform float uPickId;
  uniform float uPickScale;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(uPickId * uPickScale, vUv.x, vUv.y, 1.0);
  }
`;

export const textVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const textFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float a = texture2D(uMap, vUv).a * uOpacity;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;
