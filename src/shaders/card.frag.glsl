// Frosted glass card. Samples the background render target in screen space.
// Requires sdf.glsl and noise.glsl to be prepended.
uniform sampler2D uBackground;
uniform vec2 uResolution;   // drawing buffer size in device pixels
uniform vec2 uHalfSize;     // card half extents (local units)
uniform vec2 uPlaneHalf;    // plane half extents incl. shadow padding
uniform float uRadius;
uniform float uBevel;       // width of the refracting edge band
uniform float uRefractPx;   // max edge refraction offset in device pixels
uniform float uBlurLod;     // frosting strength as a mip level
uniform vec2 uTilt;         // (x, y) rotation in radians
uniform vec3 uLightPos;     // view space
uniform float uPxPerUnit;   // device pixels per card-local unit
uniform float uTime;

uniform sampler2D uDrops;   // R = coverage, G = height (see droplet.frag.glsl)
uniform float uDropThreshold;
uniform float uDropHeightScale;
uniform float uDropLens;    // card units of background displacement at 45° slope

uniform sampler2D uNoise;   // static card-space noise (see cardNoise.frag.glsl)
uniform sampler2D uWipe;    // 1 = wiped clear of fog (see fogMask.frag.glsl)
uniform float uFog;
uniform float uFrost;
uniform float uFrostReach;
uniform float uHeat;
uniform float uShimmer;     // card units of shimmer displacement at heat = 1
uniform vec2 uWind;

varying vec2 vUv;
varying vec3 vViewPos;
varying vec3 vViewNormal;
varying vec3 vViewTangent;
varying vec3 vViewBitangent;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 ICE = vec3(0.84, 0.91, 1.0);

// Five-tap blur on top of the mip chain smooths out box-filter blockiness.
vec3 blurSample(vec2 uv, float lod) {
  vec2 texel = exp2(lod) / vec2(textureSize(uBackground, 0));
  vec3 c = textureLod(uBackground, uv, lod).rgb * 0.4;
  c += textureLod(uBackground, uv + texel * vec2( 0.7,  0.4), lod).rgb * 0.15;
  c += textureLod(uBackground, uv + texel * vec2(-0.4,  0.7), lod).rgb * 0.15;
  c += textureLod(uBackground, uv + texel * vec2(-0.7, -0.4), lod).rgb * 0.15;
  c += textureLod(uBackground, uv + texel * vec2( 0.4, -0.7), lod).rgb * 0.15;
  return c;
}

void main() {
  vec2 p = (vUv - 0.5) * 2.0 * uPlaneHalf;
  float d = sdRoundRect(p, uHalfSize, uRadius);

  // Analytic AA: one pixel wide regardless of scale or tilt.
  float aa = max(fwidth(d), 1e-5);
  float mask = clamp(0.5 - d / aa, 0.0, 1.0);

  // Soft drop shadow, offset down; only visible outside the glass.
  float ds = sdRoundRect(p - vec2(0.0, -0.07), uHalfSize, uRadius);
  float shadow = (1.0 - smoothstep(-0.08, 0.22, ds)) * 0.32;

  // Card-local UV shared by the droplet, noise and wipe maps.
  vec2 mapUv = p / (2.0 * uHalfSize) + 0.5;
  // Derivative-based reads stay outside branches.
  float F = texture(uDrops, mapUv).r;
  float fw = max(fwidth(F), 1e-4);

  if (mask <= 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, shadow);
    return;
  }

  vec4 nz = textureLod(uNoise, mapUv, 0.0);

  vec2 n2 = sdRoundRectGrad(p, uHalfSize, uRadius);
  float edge = clamp(1.0 + d / uBevel, 0.0, 1.0); // 0 inside, 1 at rim
  float bend = edge * edge * edge;

  vec2 px = 1.0 / uResolution;
  vec2 screenUv = gl_FragCoord.xy / uResolution;

  // Heat shimmer: rising, wind-blown noise nudges everything seen through the glass.
  // The background behind the card is soft, so the shimmer also shows as faint caustic bands.
  float heatCaustic = 0.0;
  if (uHeat > 0.001) {
    vec2 q = p * vec2(3.0, 2.2) + vec2(-uWind.x * uTime * 0.6, -uTime * 0.8);
    vec2 wobble = vec2(snoise(q), snoise(q + vec2(17.3, -9.1)));
    wobble += 0.5 * vec2(snoise(q * 2.3 + 4.0), snoise(q * 2.3 - 6.0));
    screenUv += wobble * uHeat * uShimmer * uPxPerUnit * px;
    // Wide, horizontally stretched bands rising slowly: heat haze, not pool caustics.
    float band = snoise(p * vec2(0.9, 3.2) + vec2(-uWind.x * uTime * 0.4, -uTime * 0.55));
    heatCaustic = smoothstep(0.35, 0.95, band) * uHeat;
  }

  // Fog: condensation everywhere except where it has been wiped (or a drop sits).
  float wipe = textureLod(uWipe, mapUv, 0.0).r;
  // Noisy threshold so a regrowing patch closes in unevenly rather than as a clean fade.
  float wiped = smoothstep(0.08, 0.55, wipe + (nz.b - 0.5) * 0.25);
  float fog = clamp(uFog * (0.8 + 0.4 * nz.b) * (1.0 - wiped), 0.0, 1.0);

  // Frost: a front advances inward from the edges; branch noise pulls it into dendrites.
  float frost = 0.0;
  float frostFront = 0.0;
  float feather = 0.0;
  if (uFrost > 0.001) {
    vec2 axes = clamp(1.0 - abs(p) / uHalfSize, 0.0, 1.0);
    // Crystals grow perpendicular to the nearest edge: pick the streak field by edge direction.
    feather = mix(nz.g, nz.a, smoothstep(0.3, 0.7, abs(n2.y)));
    // Inward distance (0 at the edge), shortened in the corners where frost gathers first.
    float depth = (-d / uHalfSize.x) * (0.6 + 0.4 * sqrt(axes.x * axes.y));
    float grow = smoothstep(0.0, 0.25, uFrost);
    float reach = uFrost * uFrostReach + ((nz.r - 0.45) * 0.5 + (feather - 0.4) * 0.18) * grow - depth;
    frost = smoothstep(0.0, 0.08, reach) * (0.5 + 0.5 * smoothstep(0.05, 0.45, reach));
    frostFront = smoothstep(0.0, 0.03, reach) * (1.0 - smoothstep(0.03, 0.12, reach));
  }

  vec2 refr = n2 * bend * uRefractPx * px;

  // The rim is thinner glass, so it stays a little sharper than the body.
  float lod = mix(uBlurLod, uBlurLod * 0.45, bend);
  lod = mix(lod, lod * 0.55, wiped * uFog); // a wiped streak is clearer than dry frosted glass
  lod = mix(lod, 5.6, fog);
  lod = mix(lod, 5.2, frost);

  vec3 col;
  if (bend > 0.002) {
    // Faint chromatic split only where the glass actually bends light.
    col.r = blurSample(screenUv + refr * 1.00, lod).r;
    col.g = blurSample(screenUv + refr * 1.10, lod).g;
    col.b = blurSample(screenUv + refr * 1.22, lod).b;
  } else {
    col = blurSample(screenUv, lod);
  }

  // Frosted body: lift, a touch of extra saturation, faint cool-white tint.
  float lum = dot(col, LUMA);
  col = mix(vec3(lum), col, 1.12);
  col = mix(col * 1.05, vec3(0.9, 0.94, 1.0), 0.07);

  // Very soft diagonal sheen across the body, as if lit from the top-left.
  vec2 cardUv = p / uHalfSize;
  col += 0.035 * (1.0 - smoothstep(-0.6, 1.4, cardUv.x * 0.5 - cardUv.y));

  if (fog > 0.0) {
    // Light scatters in the condensation, washing out color and contrast.
    col = mix(col, vec3(dot(col, LUMA)), 0.45 * fog);
    col = mix(col, vec3(0.6, 0.64, 0.68), 0.3 * fog);
    col += 0.03 * fog;
    col += (hash12(floor(p * 300.0)) - 0.5) * 0.03 * fog; // micro-droplet speckle
  }

  if (frost > 0.0) {
    // Smooth icy haze, with thin bright crystal lines on top.
    col = mix(col, ICE * 0.86, frost * 0.6);
    col += ICE * pow(feather, 4.0) * frost * 0.22;
    col += ICE * frostFront * 0.1;
    // Ice glints that flash as the card tilts.
    vec2 cellP = p * 140.0;
    float h = hash12(floor(cellP));
    float twinkle = sin(h * 120.0 + uTilt.x * 55.0 - uTilt.y * 47.0 + uTime * 0.6);
    float dotShape = 1.0 - smoothstep(0.0, 0.38, length(fract(cellP) - 0.5));
    col += 0.55 * step(0.9, h) * smoothstep(0.85, 1.0, twinkle) * dotShape * frost;
  }

  // Warm, slightly hazy tint in heat.
  col = mix(col, col * vec3(1.08, 0.97, 0.84) + vec3(0.035, 0.015, 0.0), uHeat);
  col += vec3(1.0, 0.86, 0.68) * heatCaustic * 0.035;

  vec3 V = normalize(-vViewPos);
  vec3 L = normalize(uLightPos - vViewPos);
  vec3 H = normalize(L + V);
  vec2 l2 = normalize(vec2(-1.0, 1.0) + vec2(-uTilt.y, uTilt.x) * 4.0);

  // Droplets.
  if (F > uDropThreshold - fw) {
    float dropMask = smoothstep(uDropThreshold - fw, uDropThreshold + fw, F);

    // Height gradient in card units; points toward the drop's center.
    vec2 e = 1.0 / vec2(textureSize(uDrops, 0));
    vec2 grad = vec2(
      textureLod(uDrops, mapUv + vec2(e.x, 0.0), 0.0).g - textureLod(uDrops, mapUv - vec2(e.x, 0.0), 0.0).g,
      textureLod(uDrops, mapUv + vec2(0.0, e.y), 0.0).g - textureLod(uDrops, mapUv - vec2(0.0, e.y), 0.0).g
    ) / (uDropHeightScale * 4.0 * e * uHalfSize);

    // A drop is a tiny lens: it shows a sharp, flipped view of what's behind it.
    vec2 lens = grad * uDropLens * uPxPerUnit * px;
    vec3 dc;
    dc.r = textureLod(uBackground, screenUv + lens * 1.00, 0.4).r;
    dc.g = textureLod(uBackground, screenUv + lens * 1.05, 0.4).g;
    dc.b = textureLod(uBackground, screenUv + lens * 1.10, 0.4).b;
    // Water cuts through the frost: clearer, a little brighter and more saturated than the glass.
    float dl = dot(dc, LUMA);
    dc = mix(vec3(dl), dc, 1.2) * 1.18 + 0.03;
    // Drops caught by the frost freeze milky.
    dc = mix(dc, ICE * 0.9, frost * 0.55);

    // Thin darker border from internal reflection at the steep edge.
    float border = 1.0 - smoothstep(uDropThreshold, uDropThreshold + 0.12, F);
    dc *= 1.0 - 0.3 * border;

    // Light focused through the drop lands on the side away from the light.
    float glen = length(grad);
    vec2 gdir = grad / max(glen, 1e-4);
    float inner = 1.0 - smoothstep(uDropThreshold + 0.05, uDropThreshold + 0.4, F);
    dc += 0.16 * inner * (1.0 - border) * pow(max(dot(gdir, l2), 0.0), 2.0);

    vec3 dn = normalize(vViewNormal - (vViewTangent * grad.x + vViewBitangent * grad.y) * 2.0);
    // Drops are tiny and steep, so bias the half vector toward the light to keep the glint off-center.
    vec3 dH = normalize(H + (vViewTangent * l2.x + vViewBitangent * l2.y) * 0.45);
    float dndh = max(dot(dn, dH), 0.0);
    dc += vec3(pow(dndh, 160.0) * 0.85 + pow(dndh, 14.0) * 0.06);

    col = mix(col, dc, dropMask);
  }

  // Lighting. The bevel tilts the normal outward near the rim.
  vec3 N = normalize(vViewNormal + (vViewTangent * n2.x + vViewBitangent * n2.y) * bend * 1.6);
  float ndh = max(dot(N, H), 0.0);

  float broadSpec = pow(ndh, 24.0) * 0.1;
  float sharpSpec = pow(ndh, 320.0) * 0.55 * bend;
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0) * 0.18;

  // Thin rim line, brightest on the side facing the light, faint on the opposite side.
  float facing = dot(n2, l2);
  float rimBand = smoothstep(-2.0 * aa, 0.0, d);
  float rim = rimBand * (0.12 + 0.55 * pow(max(facing, 0.0), 2.0) + 0.22 * pow(max(-facing, 0.0), 2.0));

  col += vec3(broadSpec + sharpSpec + fresnel + rim);

  float a = mask + shadow * (1.0 - mask);
  gl_FragColor = vec4(col * mask / max(a, 1e-4), a);
  #include <colorspace_fragment>
}
