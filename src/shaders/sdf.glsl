// Signed distance to a rounded rectangle with half-size b and corner radius r.
float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Outward unit gradient of sdRoundRect. Exact within r of the edge, which covers the bevel.
vec2 sdRoundRectGrad(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  vec2 g;
  if (q.x > 0.0 || q.y > 0.0) {
    vec2 m = max(q, 0.0);
    g = m / max(length(m), 1e-5);
  } else {
    g = q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  }
  return g * sign(p + 1e-6);
}
