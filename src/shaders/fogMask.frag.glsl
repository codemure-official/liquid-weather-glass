// Card-space wipe mask, ping-ponged every frame. 1 = wiped clear, 0 = fogged.
// The mask decays linearly, so soft brush edges fog back first and the path closes in from its sides.
// Requires noise.glsl to be prepended.
uniform sampler2D uPrev;
uniform sampler2D uDrops;
uniform sampler2D uNoise;
uniform vec2 uHalfSize;
uniform float uDecay;          // mask units lost this frame
uniform vec2 uBrushA;          // stroke segment in card units
uniform vec2 uBrushB;
uniform float uBrushRadius;
uniform float uBrushStrength;  // 0 when not wiping
uniform float uDropThreshold;

varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * 2.0 * uHalfSize;
  float m = max(texture(uPrev, vUv).r - uDecay, 0.0);

  if (uBrushStrength > 0.0) {
    vec2 pa = p - uBrushA;
    vec2 ba = uBrushB - uBrushA;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
    float dist = length(pa - ba * h);
    // Ragged edge like a fingertip dragged through condensation.
    vec4 n = texture(uNoise, vUv);
    dist += (n.b - 0.5) * uBrushRadius * 0.5 + (n.g - 0.5) * uBrushRadius * 0.25;
    float brush = 1.0 - smoothstep(uBrushRadius * 0.45, uBrushRadius, dist);
    // Streaks running along the stroke, like skin ridges smearing the film.
    vec2 dir = dot(ba, ba) > 1e-8 ? normalize(ba) : vec2(1.0, 0.0);
    float across = dot(pa, vec2(-dir.y, dir.x));
    float along = dot(pa, dir);
    brush *= 0.72 + 0.28 * snoise(vec2(across * 55.0, along * 2.5));
    m = max(m, brush * uBrushStrength);
  }

  // Water drops sit in clear patches, and running drops leave clear tracks behind them.
  float drop = smoothstep(uDropThreshold * 0.6, uDropThreshold + 0.1, texture(uDrops, vUv).r);
  m = max(m, drop * 0.85);

  gl_FragColor = vec4(m, 0.0, 0.0, 1.0);
}
