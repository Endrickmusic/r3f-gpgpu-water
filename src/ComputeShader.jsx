import { useRef, useState, useEffect } from 'react'
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

    const { gl, camera, scene, state } = useThree()
    // const set = useThree((state) => state.set)

    let mouseMoved = false
    const mouseCoords = new Vector2()
	const raycaster = new Raycaster()    

    let time = 0
    const waterMeshRef = useRef(new Mesh())
    const meshRayRef = useRef(new Mesh())
    let waterUniforms
    const materialRef = useRef(new ShaderMaterial())

    let heightmapVariable
    let gpuCompute

    // Material attributes from THREE.MeshPhongMaterial
    // Sets the uniforms with the material values
    
    window.addEventListener( 'resize', onWindowResize )
  
    function setMouseCoords( x, y ) {

        mouseCoords.set( ( x / gl.domElement.clientWidth ) * 2 - 1, - ( y / gl.domElement.clientHeight ) * 2 + 1 )
        mouseMoved = true;

    }

    function onPointerMove( event ) {
      
        if ( event.isPrimary === false ) return

        setMouseCoords( event.clientX, event.clientY )
    
    }   

    useEffect(() => {
    
    const materialColor = 0x0040C0

    materialRef.current.uniforms[ 'diffuse' ].value = new Color( materialColor )
    materialRef.current.uniforms[ 'specular' ].value = new Color( 0x111111 )
    materialRef.current.uniforms[ 'shininess' ].value = Math.max( 150, 1e-4 )
    materialRef.current.uniforms[ 'opacity' ].value = materialRef.current.opacity

     // Defines
     materialRef.current.defines.WIDTH = WIDTH.toFixed( 1 )
     materialRef.current.defines.BOUNDS = BOUNDS.toFixed( 1 )
 
     waterUniforms = materialRef.current.uniforms
     
     waterMeshRef.current.updateMatrix()
 
     meshRayRef.current.updateMatrix()
    
    // Creates the gpu computation class and sets it up
    //  console.log('useEffect 2')

     gpuCompute = new GPUComputationRenderer( WIDTH, WIDTH, gl )
 
    //  console.log('useEffect 3')
     const heightmap0 = gpuCompute.createTexture()
 
    fillTexture( heightmap0 )
    //  console.log('useEffect 4')
     heightmapVariable = gpuCompute.addVariable( 'heightmap', heightmapFragmentShader, heightmap0 )
    //  console.log('useEffect 5')
     gpuCompute.setVariableDependencies( heightmapVariable, [ heightmapVariable ] )
    
    heightmapVariable.material.uniforms[ 'mousePos' ] = { value: new Vector2( 10000, 10000 ) }
    heightmapVariable.material.uniforms[ 'mouseSize' ] = { value: 20.0 }
    heightmapVariable.material.uniforms[ 'viscosityConstant' ] = { value: 0.98 }
    heightmapVariable.material.uniforms[ 'heightCompensation' ] = { value: 0 }
    heightmapVariable.material.uniforms[ 'uTime' ] = { value: 0 }
    heightmapVariable.material.uniforms[ 'mouseSize' ].value = 80.0
	heightmapVariable.material.uniforms[ 'viscosityConstant' ].value = 0.995 

    heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed( 1 )
    
    // console.log('useEffect 6')
    const error = gpuCompute.init()
    if ( error !== null ) {

        console.error( error )
    }
    console.log('useEffect 7')

    }, [onWindowResize])

    useFrame((state) =>{
        // console.log("useFrame 1")
       const uniforms = heightmapVariable.material.uniforms

        if ( mouseMoved ) {

            raycaster.setFromCamera( mouseCoords, camera );

            const intersects = raycaster.intersectObject( meshRayRef.current );

            if ( intersects.length > 0 ) {

                const point = intersects[ 0 ].point;
                uniforms[ 'mousePos' ].value.set( point.x, point.z );

            } else {

                uniforms[ 'mousePos' ].value.set( 10000, 10000 );

            }

            mouseMoved = false;

        } else {

            uniforms[ 'mousePos' ].value.set( 10000, 10000 );

        }
        // console.log("useFrame 2")
        gpuCompute.compute()
        // console.log("useFrame 3")
        waterUniforms[ 'heightmap' ].value = gpuCompute.getCurrentRenderTarget( heightmapVariable ).texture
        // console.log("useFrame 4")
        state.gl.render( state.scene, state.camera )
        console.log("useFrame 5")
    })

    // mouse logic
    

    

    function onWindowResize() {

        console.log('Window got resized')
        // camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        // gl.setSize( window.innerWidth, window.innerHeight );

    }

    return(
    <>

        {/*  Mesh just for mouse raycasting */}
       
        <mesh      
        ref={meshRayRef}
        rotation = {[- Math.PI / 2, 0,0] }
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
        rotation = {[- Math.PI / 2, 0,0] }
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

function GPUCompute (){

    
}