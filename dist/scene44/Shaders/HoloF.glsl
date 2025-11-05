uniform float u_time;
uniform vec3 u_col;

varying vec3 vPos;
varying vec3 vNorm;

void main() {

    vec3 normal = normalize(vNorm);
    if (!gl_FrontFacing) {
        normal = -normal;
    }

    float stripes = mod((vPos.y - u_time * 0.02) * 5.0, 1.0);
    stripes = pow(stripes, 3.0);

    vec3 viewDir = normalize(vPos - cameraPosition);
    float fresnel = dot(viewDir, normal) + 1.0;
    fresnel = pow(fresnel, 2.0);

    float fallOff = 1.0 - smoothstep(0.8, 0.0, fresnel);

    float holo = stripes * fresnel;
    holo += fresnel * 1.25;
    holo *= fallOff;
    
    gl_FragColor = vec4(u_col, holo);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}