precision highp float;
varying vec2 vUv;

uniform float time;
uniform float opacity; 

// ----- Simplex Noise Function (3D) -----
vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
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

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
              i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
              i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0 / 7.0;
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

  vec3 g0 = vec3(a0.xy, h.x);
  vec3 g1 = vec3(a0.zw, h.y);
  vec3 g2 = vec3(a1.xy, h.z);
  vec3 g3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(
    dot(g0, g0), dot(g1, g1),
    dot(g2, g2), dot(g3, g3)
  ));
  g0 *= norm.x;
  g1 *= norm.y;
  g2 *= norm.z;
  g3 *= norm.w;

  vec4 m = max(0.6 - vec4(
    dot(x0, x0), dot(x1, x1),
    dot(x2, x2), dot(x3, x3)
  ), 0.0);
  m = m * m;

  return 42.0 * dot(
    m * m,
    vec4(dot(g0, x0), dot(g1, x1),
         dot(g2, x2), dot(g3, x3))
  );
}


// Rotate point using time (for animation)
vec3 rotate3D(vec3 p, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  mat3 rotX = mat3(
    1.0, 0.0, 0.0,
    0.0, c, -s,
    0.0, s, c
  );
  mat3 rotY = mat3(
    c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c
  );
  mat3 rotZ = mat3(
    c, -s, 0.0,
    s, c, 0.0,
    0.0, 0.0, 1.0
  );
  return rotZ * rotY * rotX * p;
}

// Fractal Brownian Motion
float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;
  float lacunarity = 1.0;
  float roughness = 1.0;
  float distortion = 1.5;

  for (int i = 0; i < 5; i++) {
    vec3 distorted = p + distortion * vec3(sin(p.y), cos(p.z), sin(p.x));
    value += snoise(distorted * frequency) * amplitude;
    frequency *= lacunarity;
    amplitude *= roughness;
  }

  return 0.5 + 0.5 * value; 
}

void main() {
  vec3 p = vec3(vUv * 3.0, time / 900.0);
  p = rotate3D(p, time / 90.0);

  float n = fbm(p);

  // === Color Ramp (Constant Interpolation) ===
  vec3 color;
  if (n < 0.8) {
    color = vec3(0.0, 0.17, 0.25); // #002C3F
  } else if (n < 1.0) {
    color = vec3(0.0, 0.58, 0.79); // #0093C9
  } else {
    color = vec3(0.5216, 0.8706, 1.0); // #85DEFF
  }

  // === Alpha Ramp (Linear Interpolation) ===
  float alpha = smoothstep(0.0, 0.5, n); // black to white

  gl_FragColor = vec4(color, alpha * opacity);
}
