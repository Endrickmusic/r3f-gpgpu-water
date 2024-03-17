import { useMemo, useLayoutEffect } from "react"
import { useFrame } from '@react-three/fiber'

export default function ModifiedShader( { meshRef, options, heightmapTexture } ) {

    const customUniforms = useMemo(
        () => ({
          uTime: {
            type: "f",
            value: 1.0,
              },
          uBigWaveElevation: {
              type: "f",
              value: options.BigElevation,
              },
               
          uBigWaveFrequency: {
              type: "f",
              value: options.BigFrequency,
              },            
          uBigWaveSpeed: {
              type: "f",
              value: options.BigSpeed,
              },
          uNoiseRangeDown: {
              type: "f",
              value: options.NoiseRangeDown,
              },
          uNoiseRangeUp: {
              type: "f",
              value: options.NoiseRangeUp,
              },
          heightmap: {
            value: heightmapTexture,
          }     
         }),[options, heightmapTexture]
      )   

    useFrame((state, delta) => {
        if (meshRef.current.material.userData.shader){
        meshRef.current.material.userData.shader.uniforms.uTime.value += delta
        meshRef.current.material.userData.shader.uniforms.heightmap.value = heightmapTexture
        // console.log(meshRef.current.material.userData.shader.uniforms)
      }   
      })

    useLayoutEffect(() => {

    meshRef.current.material.onBeforeCompile = (shader) => {

    shader.uniforms = {...customUniforms, ...shader.uniforms }  

    shader.vertexShader = shader.vertexShader.replace(

        '#include <uv_vertex>',
        `
            vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );
            #include <uv_vertex>
        ` 
        )

    shader.vertexShader = shader.vertexShader.replace(

        '#include <common>',
        `
            #include <common>
            uniform sampler2D heightmap;
        ` 
        )

    shader.vertexShader = shader.vertexShader.replace(
            '#include <beginnormal_vertex>',
           
            `
            #include <beginnormal_vertex>

            // Compute normal from heightmap
				    
            objectNormal = vec3(
				   	( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
				  	( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,
				  	1.0 );
            `
        )

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>    
        float heightValue = texture2D( heightmap, uv ).x;
				transformed = vec3( position.x, position.y, heightValue ); 
        `)

        shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        `
     )
        shader.fragmentShader = shader.fragmentShader.replace(

          '#include <color_fragment>',
          `
          #include <color_fragment>
          `
     )

     meshRef.current.material.userData.shader = shader
    }
  console.log(meshRef.current.material.userData)

}, [])


}

