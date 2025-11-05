uniform sampler2D videoTexture;
uniform float time;
varying vec2 vUv;
void main() {
    vec4 videoColor = texture2D(videoTexture, vUv);
    float intensity = (videoColor.r + videoColor.g + videoColor.b) / 3.0;
    vec3 enhancedColor = videoColor.rgb * 0.5;
    enhancedColor = clamp(enhancedColor, 0.0, 0.5);
    float alpha = smoothstep(0.15 - 0.05, 0.15 + 0.05, intensity);
    gl_FragColor = vec4(enhancedColor, alpha * videoColor.a);
}
