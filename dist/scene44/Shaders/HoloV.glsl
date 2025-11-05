uniform float u_time;

varying vec3 vNorm;
varying vec3 vPos;

float random2d(vec2 coord) {
    return fract(sin(dot(coord.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    float glitchTime = u_time - modelPosition.y;
    float glitchStrength = sin(glitchTime) + sin(glitchTime * 3.45) + sin(glitchTime * 8.76);
    glitchStrength /= 3.0;
    glitchStrength = smoothstep(0.8, 1.0, glitchStrength);
    glitchStrength *= 0.1;
    modelPosition.x += (random2d(modelPosition.xz + u_time) - .5) * glitchStrength;
    modelPosition.z += (random2d(modelPosition.zx + u_time) - .5) * glitchStrength;

    gl_Position = projectionMatrix * viewMatrix * modelPosition;

    vec4 modelNorm = modelMatrix * vec4(normal, 0.0);

    vNorm = modelNorm.xyz;
    vPos = modelPosition.xyz;
}