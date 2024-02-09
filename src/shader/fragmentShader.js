const fragmentShader = `

uniform float uTime;
uniform float progress;
uniform sampler2D texture1;
uniform vec4 uResolution;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vColor;
float PI = 3.1415926;


void main() {

    // Time varying pixel color
    vec3 col = 0.5 + 0.5*cos(uTime+vUv.xyx + vec3(0,2,4));

    // Output to screen
    gl_FragColor = vec4(col,1.0);
	
}

`

export default fragmentShader