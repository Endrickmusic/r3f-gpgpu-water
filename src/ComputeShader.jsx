import { useRef, useState, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { UniformsUtils, ShaderChunk, ShaderMaterial, ShaderLib, Color, Vector2, Mesh, Raycaster, MeshStandardMaterial } from "three"
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js'

import { heightmapFragmentShader } from './shaders/heightmapFragmentShader.js'
import { waterVertexShader } from './shaders/waterVertexShader.js'

import './RenderMaterial.jsx'
import './SimulationMaterial'

     // Texture width for simulation
     const WIDTH = 128

     // Water size in system units
     const BOUNDS = 512

     const simplex = new SimplexNoise();

export default function initWater() {

    const materialColor = 0x0040C0
    const waterMeshRef = useRef(new Mesh())
    let waterUniforms
    const materialRef = useRef()
    const debugRef = useRef()


    const { gl, camera } = useThree()

    // Creates the gpu computation class and sets it up

    const gpuCompute = new GPUComputationRenderer( WIDTH, WIDTH, gl )

    const heightmap0 = gpuCompute.createTexture()

    // Fills initial texture with noise

    fillTexture( heightmap0 )

    // Variables 

    const heightmapVariable = gpuCompute.addVariable( 'heightmap', heightmapFragmentShader, heightmap0 )

    // Dependencies

    gpuCompute.setVariableDependencies( heightmapVariable, [ heightmapVariable ] )

    // Uniforms

    const uniforms = heightmapVariable.material.uniforms

    // Initialisation
    gpuCompute.init()
    

    let mouseMoved = false
    const mouseCoords = new Vector2()
   

    // Material attributes from THREE.MeshPhongMaterial
    // Sets the uniforms with the material values
    
    window.addEventListener( 'resize', onWindowResize )
  
    function setMouseCoords( x, y ) {

        mouseCoords.set( ( x / gl.domElement.clientWidth ) * 2 - 1, - ( y / gl.domElement.clientHeight ) * 2 + 1 )
        mouseMoved = true
        uniforms[ 'mousePos' ].value.set( 0, 0 )
    }

    function handlePointerMove( event ) {
      
        // if ( event.isPrimary === false ) 
        // return

        setMouseCoords( event.clientX, event.clientY )
        console.log('mouse moved')
    
    }   

    useEffect(() => {
    
        // materialRef.current.uniforms[ 'diffuse' ].value = new Color( materialColor )
        // materialRef.current.uniforms[ 'specular' ].value = new Color( 0x111111 )
        // materialRef.current.uniforms[ 'shininess' ].value = Math.max( 150, 1e-4 )
        // materialRef.current.uniforms[ 'opacity' ].value = materialRef.current.opacity

    // Defines
    materialRef.current.defines.WIDTH = WIDTH.toFixed( 1 )
    materialRef.current.defines.BOUNDS = BOUNDS.toFixed( 1 )
 
    waterUniforms = materialRef.current.uniforms
    
    heightmapVariable.material.uniforms[ 'mousePos' ] = { value: new Vector2( 10000, 10000 ) }
    heightmapVariable.material.uniforms[ 'mouseSize' ] = { value: 20.0 }
    heightmapVariable.material.uniforms[ 'viscosityConstant' ] = { value: 0.98 }
    heightmapVariable.material.uniforms[ 'heightCompensation' ] = { value: 0 }
    heightmapVariable.material.uniforms[ 'uTime' ] = { value: 0 }
    heightmapVariable.material.uniforms[ 'mouseSize' ].value = 80.0
	heightmapVariable.material.uniforms[ 'viscosityConstant' ].value = 0.995 

    heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed( 1 )
    

    }, [onWindowResize])

    useFrame((state) =>{       

        gpuCompute.compute()

        materialRef.current.uniforms.heightmap.value = gpuCompute.getCurrentRenderTarget( heightmapVariable ).texture
        debugRef.current.material.map = gpuCompute.getCurrentRenderTarget( heightmapVariable ).texture
        
        const time = state.clock.getElapsedTime()

        heightmapVariable.material.uniforms[ 'uTime' ].value = time

        waterMeshRef.current.updateMatrix()

    })


    function onWindowResize() {

        console.log('Window got resized')
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        gl.setSize( window.innerWidth, window.innerHeight );

    }

    return(
    <>
        <mesh
        onPointerMove={handlePointerMove}       
        ref = {waterMeshRef}
        rotation = {[- Math.PI / 2, 0,0] }
        matrixAutoUpdate = {false}
        >
            <planeGeometry
            args={[BOUNDS, BOUNDS, WIDTH - 1, WIDTH - 1]}
            />
            <renderMaterial
            ref = {materialRef}
            wireframe = {true}
            />
        </mesh>
        
        {/* Debug Plane */}

        <mesh
            ref = {debugRef}
            position = {[350, 100, 0]}
            rotation = {[-Math.PI * 0.3, 0, 0]}
        >
            <planeGeometry 
            args={[150, 150, 1, 1]} />
            <meshStandardMaterial
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

}
