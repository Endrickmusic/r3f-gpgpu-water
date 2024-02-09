const vertexShader = `
attribute vec4 vertexPosition;

uniform float uTime;

varying vec2 vUv;
varying vec3 vColor;

float PI = 3.141592;


void main() {

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;
    vUv = uv;
}

`

export default vertexShader