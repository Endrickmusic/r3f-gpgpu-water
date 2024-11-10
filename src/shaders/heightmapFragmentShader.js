// This is the 'compute shader' for the water heightmap:
export const heightmapFragmentShader = `
#include <common>

uniform vec2 mousePos;
uniform float mouseSize;
uniform float viscosityConstant;
uniform float heightCompensation;
uniform float uTime;
uniform float noiseStrength;

// Add the new uniforms from the first shader
uniform float uParameter1;
uniform float uParameter2;
uniform float uBigWaveElevation;
uniform float uBigWaveFrequency;
uniform float uBigWaveSpeed;
uniform float uNoiseRangeUp;
uniform float uNoiseRangeDown;
uniform float uSmallWaveSpeed;
uniform float uSmallWaveIteration;

// Classic Perlin 3D Noise by Stefan Gustavson
vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

vec3 permute(vec3 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Combined noise function that includes both 2D and 3D noise
float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}

float distortedPos(vec3 p) {
    float n = cnoise(p * uBigWaveFrequency * .1 + uTime * uBigWaveSpeed) * uBigWaveElevation;
    float noiseArea = sin(smoothstep(uNoiseRangeDown, uNoiseRangeUp, p.y) * PI);
    return n * noiseArea;
}

void main() {
    vec2 cellSize = 1.0 / resolution.xy;
    vec2 uv = gl_FragCoord.xy * cellSize;
    
    // Get heightmap values from previous frames
    vec4 heightmapValue = texture2D(heightmap, uv);
    
    // Get neighbours
    vec4 north = texture2D(heightmap, uv + vec2(0.0, cellSize.y));
    vec4 south = texture2D(heightmap, uv + vec2(0.0, -cellSize.y));
    vec4 east = texture2D(heightmap, uv + vec2(cellSize.x, 0.0));
    vec4 west = texture2D(heightmap, uv + vec2(-cellSize.x, 0.0));

    // Calculate wave propagation
    float newHeight = ((north.x + south.x + east.x + west.x) * 0.5 - heightmapValue.y) * viscosityConstant;

    // Add mouse interaction
    float mousePhase = clamp(length((uv - vec2(0.5)) * BOUNDS - vec2(mousePos.x, -mousePos.y)) * PI / mouseSize, 0.0, PI);
    newHeight += (cos(mousePhase) + 1.0) * 0.28;

    // Create animated UV coordinates for noise
    vec2 animatedUV = uv * BOUNDS;
    animatedUV += uTime * uSmallWaveSpeed; // Add time-based movement

    // Add animated noise using both coordinates and time
    vec3 noiseCoord = vec3(
        animatedUV.x * uBigWaveFrequency, 
        animatedUV.y * uBigWaveFrequency,
        uTime * uBigWaveSpeed
    );
    
    // Generate primary wave movement
    // float primaryWave = sin(animatedUV.x * uBigWaveFrequency + uTime * uBigWaveSpeed) * 
    //                    sin(animatedUV.y * uBigWaveFrequency + uTime * uBigWaveSpeed) *
    //                    uBigWaveElevation;
    float primaryWave = sin(animatedUV.x * 1. + uTime * uBigWaveSpeed) * 
                       sin(animatedUV.y * uBigWaveFrequency + uTime * uBigWaveSpeed) *
                       .001;

    // Add detailed noise movement
    float detailedNoise = 0.1;
    float amplitude = 0.2;
    float frequency = 0.5;
    
    for(float i = 0.0; i < 4.0; i++) {
        detailedNoise += cnoise(vec3(
            animatedUV * frequency * uBigWaveFrequency * 0.05,
            uTime * uSmallWaveSpeed * frequency * 0.5
        )) * amplitude;
        
        amplitude *= 0.1;
        frequency *= 2.0;
    }

    // Combine all movements
    float finalHeight = newHeight + 
                       primaryWave * noiseStrength + 
                       detailedNoise * noiseStrength;

    // Update heightmap values
    heightmapValue.y = heightmapValue.x;
    heightmapValue.x = finalHeight;
    
    gl_FragColor = heightmapValue;
}
			

`
