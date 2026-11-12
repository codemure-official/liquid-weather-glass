// One instanced quad per droplet, rendered into the card-space droplet map.
attribute vec4 aDrop; // xy = card-local position, z = visible radius, w = stretch along motion
attribute vec2 aDir;  // unit motion direction

uniform vec2 uHalfSize;
uniform float uKernelScale; // kernel radius / visible radius

varying vec2 vLocal;
varying float vRadius;

void main() {
  vLocal = position.xy;
  vRadius = aDrop.z;

  float rk = aDrop.z * uKernelScale;
  float s = aDrop.w;
  // (perp, aDir) is a rotation, so quad winding is preserved and it isn't back-face culled.
  vec2 perp = vec2(aDir.y, -aDir.x);
  // Stretch along the motion direction while keeping area roughly constant.
  vec2 offset = (aDir * position.y * s + perp * position.x / sqrt(s)) * rk;

  gl_Position = vec4((aDrop.xy + offset) / uHalfSize, 0.0, 1.0);
}
