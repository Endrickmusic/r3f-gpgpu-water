import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { UniformsUtils, ShaderChunk, ShaderMaterial, ShaderLib, Color, Vector2, HalfFloatType, Mesh, Raycaster } from "three"
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js'

import { heightmapFragmentShader } from './shaders/heightmapFragmentShader.js'
import { waterVertexShader } from './shaders/waterVertexShader.js'

 // Texture width for simulation
 const WIDTH = 128

 // Water size in system units
 const BOUNDS = 512
 
 const simplex = new SimplexNoise();

export default function initWater() {

    const { gl, camera } = useThree()

    let mouseMoved = false
    const mouseCoords = new Vector2()
	const raycaster = new Raycaster()    

    const waterMeshRef = useRef()
    const meshRayRef = useRef()
    const materialRef = useRef()

    const gpuCompute = useRef()
    const heightmapVariable = useRef()
    
    function setMouseCoords( x, y ) {

        mouseCoords.set( ( x / gl.domElement.clientWidth ) * 2 - 1, - ( y / gl.domElement.clientHeight ) * 2 + 1 )
        mouseMoved = true;

    }

    function onPointerMove( event ) {
      
        if ( event.isPrimary === false ) return

        setMouseCoords( event.clientX, event.clientY )
    
    }   

    useEffect(() => {
    
    // Defines
    materialRef.current.defines.WIDTH = WIDTH.toFixed( 1 )
    materialRef.current.defines.BOUNDS = BOUNDS.toFixed( 1 )
    
    waterMeshRef.current.rotation.x = - Math.PI / 2

    waterMeshRef.current.updateMatrix()

    meshRayRef.current.rotation.x = - Math.PI / 2

	meshRayRef.current.updateMatrix()

    // Creates the gpu computation class and sets it up

    gpuCompute.current = new GPUComputationRenderer( WIDTH, WIDTH, gl )
    
    const heightmap0 = gpuCompute.current.createTexture()

    fillTexture( heightmap0 )

    heightmapVariable.current = gpuCompute.current.addVariable( 'heightmap', heightmapFragmentShader, heightmap0 )

    gpuCompute.current.setVariableDependencies( heightmapVariable.current, [ heightmapVariable.current ] )
    
    heightmapVariable.current.material.uniforms.mousePos = { value: new Vector2( 10000, 10000 ) }
    heightmapVariable.current.material.uniforms.mouseSize = { value: 20.0 }
    heightmapVariable.current.material.uniforms.viscosityConstant = { value: 0.98 }
    heightmapVariable.current.material.uniforms.heightCompensation = { value: 0 }
    heightmapVariable.current.material.uniforms.uTime = { value: 0 }
    heightmapVariable.current.material.uniforms.mouseSize.value = 80.0
	heightmapVariable.current.material.uniforms.viscosityConstant.value = 0.995 

    heightmapVariable.current.material.defines.BOUNDS = BOUNDS.toFixed( 1 )

    gpuCompute.current.init()

    }, [])

    useFrame(() =>{
   
    const materialColor = 0x0040C0

    materialRef.current.uniforms.diffuse.value = new Color( materialColor )
    materialRef.current.uniforms.specular.value = new Color( 0x111111 )
    materialRef.current.uniforms.shininess.value = Math.max( 150, 1e-4 )
    materialRef.current.uniforms.opacity.value = materialRef.current.opacity

    const uniforms = heightmapVariable.current.material.uniforms

        if ( mouseMoved ) {

            raycaster.setFromCamera( mouseCoords, camera );

            const intersects = raycaster.intersectObject( meshRayRef.current );

            if ( intersects.length > 0 ) {

                const point = intersects[ 0 ].point;
                uniforms.mousePos.value.set( point.x, point.z );

            } else {

                uniforms.mousePos.value.set( 10000, 10000 );

            }

            mouseMoved = false;

        } else {

            uniforms.mousePos.value.set( 10000, 10000 );

        }
      
        gpuCompute.current.compute()
        
        materialRef.current.uniforms.heightmap.value = gpuCompute.current.getCurrentRenderTarget( heightmapVariable.current ).texture
       
    })


    return(
    <>

        {/*  Mesh just for mouse raycasting */}
       
        <mesh      
        ref={meshRayRef}
        matrixAutoUpdate = {false}
        >
            <planeGeometry 
            args={[BOUNDS, BOUNDS, 1, 1]}
            />
            <meshBasicMaterial 
            color = {0xFFFFFF} 
            visible = {false}
            />

        </mesh>

        <mesh
        onPointerMove={onPointerMove}       
        ref = {waterMeshRef}
        matrixAutoUpdate = {false}
        >
            <planeGeometry
            args={[BOUNDS, BOUNDS, WIDTH - 1, WIDTH - 1]}
            />
            <shaderMaterial
            ref = {materialRef}
            uniforms = {UniformsUtils.merge( [
                ShaderLib[ 'phong' ].uniforms,
                {
                    'heightmap': { value: null }
                }
            ] ) }
            vertexShader = {waterVertexShader}
            fragmentShader = {ShaderChunk [ 'meshphong_frag' ]}
            lights = {true}
            color = {0x0040C0}
            />
        </mesh>
    </>
    )
}

function fillTexture( texture ) {

    const waterMaxHeight = 15;

    function noise( x, y ) {

        let multR = waterMaxHeight;
        let mult = 0.025;
        let r = 0;
        for ( let i = 0; i < 15; i ++ ) {

            r += multR * simplex.noise( x * mult, y * mult);
            multR *= 0.53 + 0.025 * i;
            mult *= 1.25;

        }

        return r;

    }


// Create data texture

    const pixels = texture.image.data;

    let p = 0;
    for ( let j = 0; j < WIDTH; j ++ ) {

        for ( let i = 0; i < WIDTH; i ++ ) {

            const x = i * 128 / WIDTH;
            const y = j * 128 / WIDTH;

            pixels[ p + 0 ] = noise( x, y );
            pixels[ p + 1 ] = pixels[ p + 0 ];
            pixels[ p + 2 ] = 0;
            pixels[ p + 3 ] = 1;

            p += 4;

        }

    }
}
