varying vec2 vUv;
varying float vDistortion;

void main() {
    vUv = uv;
    float angle = atan(position.y, position.x);
    float radius = length(position.xy);
    float distortion = sin(angle * 8.0 + uv.y * 5.0 + uv.x * 10.0) * 0.05;
    vec3 displacedPosition = position + normal * distortion;
    vDistortion = distortion;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}