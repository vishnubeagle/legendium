uniform sampler2D uBaseTexture;
uniform sampler2D uAlphaTexture;
uniform sampler2D uEmissionTexture;
uniform float uTime;
uniform float uOpacity;

varying vec2 vUv;

// Simple noise function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec4 baseColor = texture2D(uBaseTexture, vUv);
  float alpha = texture2D(uAlphaTexture, vUv).r;

  // Emission map controls where emission shows
  vec3 emissionMask = texture2D(uEmissionTexture, vUv).rgb;

  // Animated noise pulse for a breathing effect
  float noise = random(vUv + uTime * 0.1);
  float pulse = 0.4 + 0.6 * sin(uTime * 2.0 + noise * 6.28); // Between 0.4 and 1.0

  // Final emission color (only where emissionMask > 0)
  vec3 emissionColor = emissionMask * pulse;

  // Combine base color and emission
  vec3 finalColor = baseColor.rgb + emissionColor;

  gl_FragColor = vec4(finalColor, alpha*0);
}
