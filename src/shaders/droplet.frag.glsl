// Additively blended metaball kernel. Touching drops sum into one smooth liquid surface.
// R = coverage field (thresholded in the card shader), G = height field (scaled by radius).
uniform float uHeightScale;

varying vec2 vLocal;
varying float vRadius;

void main() {
  float q2 = dot(vLocal, vLocal);
  if (q2 >= 1.0) discard;
  float f = 1.0 - q2;
  f *= f;
  gl_FragColor = vec4(f, f * vRadius * uHeightScale, 0.0, 0.0);
}
