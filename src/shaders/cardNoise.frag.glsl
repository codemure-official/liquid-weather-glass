// Baked once at startup: static noise fields in card space, so the card shader pays one fetch.
// R = warped ridged noise (frost branches along the growth front)
// G = feathery crystal streaks running along x (for frost growing in from the left/right edges)
// B = low-frequency fbm (fog density, wipe edges)
// A = feathery crystal streaks running along y (for frost growing in from the top/bottom edges)
// Requires noise.glsl to be prepended.
uniform vec2 uHalfSize;

varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * 2.0 * uHalfSize;

  vec2 warp = vec2(fbm(p * 1.8 + 3.1), fbm(p * 1.8 - 7.4)) - 0.5;
  float branches = ridged(p * 2.4 + warp * 2.2);
  float featherX = ridged(vec2(p.x * 3.0, p.y * 13.0) + warp * 3.0);
  float featherY = ridged(vec2(p.x * 13.0, p.y * 3.0) + warp * 3.0 + 19.0);
  float low = fbm(p * 1.3 + 11.0);

  gl_FragColor = clamp(vec4(branches, featherX, low, featherY), 0.0, 1.0);
}
