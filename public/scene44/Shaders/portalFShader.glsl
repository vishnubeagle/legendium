uniform sampler2D uTexture;
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
varying float vDistortion;

vec3 permute(vec3 x) {
    return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    float noise = snoise(vUv * 6.0 + uTime * 0.4) * 0.2;
    vec2 distortedUV = vUv + vec2(noise * 0.2, noise * 0.15);

    vec4 texColor = texture2D(uTexture, distortedUV);

    vec3 energyColor = vec3(0.2 + 0.5 * sin(uTime), 0.8, 1.2);
    vec3 color = texColor.rgb * energyColor + vec3(noise * 0.3);

    float alpha = (texColor.r + texColor.g + texColor.b) / 3.0;
    alpha *= 1.2 + noise * 0.8;
    alpha = pow(alpha, 2.0);
    alpha = max(alpha, 0.35);

    gl_FragColor = vec4(color, alpha * uOpacity);
}