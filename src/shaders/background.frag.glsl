// Slow-moving gradient blobs. Output is linear color into a half-float target.
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uBase;
uniform vec3 uColors[4];

varying vec2 vUv;

vec2 blobCenter(float i, float t, float aspect) {
  float a = t * (0.7 + 0.13 * i) + i * 1.7;
  float b = t * (0.5 + 0.11 * i) + i * 2.9;
  return vec2(sin(a) * 0.42 * aspect, cos(b) * 0.38);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vUv - 0.5;
  p.x *= aspect;

  float t = uTime * 0.06;

  // Gentle domain warp keeps the blobs organic instead of perfect circles.
  p += 0.07 * vec2(sin(p.y * 2.6 + t * 2.1), cos(p.x * 2.3 - t * 1.7));

  // Soft vertical falloff so the top reads lighter than the bottom.
  vec3 col = uBase * (0.75 + 0.5 * vUv.y);

  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 c = blobCenter(fi, t, aspect);
    float r = 0.36 + 0.08 * sin(t * 1.3 + fi * 2.2);
    float d = length(p - c);
    float w = exp(-(d * d) / (r * r));
    col = mix(col, uColors[i], w * 0.85);
  }

  gl_FragColor = vec4(col, 1.0);
}
