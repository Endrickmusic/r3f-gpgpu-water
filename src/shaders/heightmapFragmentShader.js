// This is the 'compute shader' for the water heightmap:
export const heightmapFragmentShader = `

			#include <common>

			uniform vec2 mousePos;
			uniform float mouseSize;
			uniform float viscosityConstant;
			uniform float heightCompensation;
			uniform float uTime;
			uniform float noiseStrength;

			vec3 mod289(vec3 x) {
				return x - floor(x * (1.0 / 289.0)) * 289.0;
			}

			vec2 mod289(vec2 x) {
				return x - floor(x * (1.0 / 289.0)) * 289.0;
			}

			vec3 permute(vec3 x) {
				return mod289(((x*34.0)+1.0)*x);
			}

			float snoise(vec2 v) {
				const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
									0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
									-0.577350269189626,  // -1.0 + 2.0 * C.x
									0.024390243902439); // 1.0 / 41.0
				vec2 i  = floor(v + dot(v, C.yy) );
				vec2 x0 = v -   i + dot(i, C.xx);
				vec2 i1;
				i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
				vec4 x12 = x0.xyxy + C.xxzz;
				x12.xy -= i1;
				i = mod289(i);
				vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
					+ i.x + vec3(0.0, i1.x, 1.0 ));
				vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
				m = m*m ;
				m = m*m ;
				vec3 x = 2.0 * fract(p * C.www) - 1.0;
				vec3 h = abs(x) - 0.5;
				vec3 ox = floor(x + 0.5);
				vec3 a0 = x - ox;
				m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
				vec3 g;
				g.x  = a0.x  * x0.x  + h.x  * x0.y;
				g.yz = a0.yz * x12.xz + h.yz * x12.yw;
				return 130.0 * dot(m, g);
			}

			void main()	{

				vec2 cellSize = 1.0 / resolution.xy;

				vec2 uv = gl_FragCoord.xy * cellSize;

				// heightmapValue.x == height from previous frame
				// heightmapValue.y == height from penultimate frame
				// heightmapValue.z, heightmapValue.w not used
				vec4 heightmapValue = texture2D( heightmap, uv );

				// Get neighbours
				vec4 north = texture2D( heightmap, uv + vec2( 0.0, cellSize.y ) );
				vec4 south = texture2D( heightmap, uv + vec2( 0.0, - cellSize.y ) );
				vec4 east = texture2D( heightmap, uv + vec2( cellSize.x, 0.0 ) );
				vec4 west = texture2D( heightmap, uv + vec2( - cellSize.x, 0.0 ) );

				// https://web.archive.org/web/20080618181901/http://freespace.virgin.net/hugo.elias/graphics/x_water.htm

				float newHeight = ( ( north.x + south.x + east.x + west.x ) * .5 - heightmapValue.y ) * viscosityConstant;
				
				// Mouse influence
				float mousePhase = clamp( length( ( uv - vec2( 0.5 ) ) * BOUNDS - vec2( mousePos.x, - mousePos.y ) ) * PI / mouseSize, 0.0, PI );
				newHeight += ( cos( mousePhase ) + 1.0) * 0.28;

				// Add animated noise
				vec2 noiseCoord = uv * 10.0 + uTime * 0.05;
				float noise = snoise(noiseCoord) * noiseStrength;

				// Add noise to your height calculation
				float height = newHeight + noise;

				heightmapValue.y = heightmapValue.x;
				heightmapValue.x = height;

				gl_FragColor = heightmapValue;

			}

`
