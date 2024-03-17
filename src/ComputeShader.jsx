import { useRef, useEffect, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { UniformsUtils, ShaderChunk, ShaderMaterial, ShaderLib, Color, Vector2, HalfFloatType, Mesh, Raycaster, DoubleSide } from "three"
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'
import { useEnvironment, useTexture, OrbitControls } from '@react-three/drei'
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js'
import { useControls, Leva } from "leva"

import { heightmapFragmentShader } from './shaders/heightmapFragmentShader.js'
import { waterVertexShader } from './shaders/waterVertexShader.js'

import ModifiedShader from './ModifiedShader.jsx'

 // Texture width for simulation
 const WIDTH = 256

 // Water size in system units
 const BOUNDS = 512
 
 const simplex = new SimplexNoise();

export default function initWater() {

    const { gl, camera } = useThree()
    const [heightmapTexture, setHeightmapTexture] = useState()
    let mouseMoved = false
    const mouseCoords = new Vector2()
	const raycaster = new Raycaster()    

    const waterMeshRef = useRef()
    const meshRayRef = useRef()
    const materialRef = useRef()

    const gpuCompute = useRef()
    const heightmapVariable = useRef()
    
    const envMap = useEnvironment({files:'./environments/aerodynamics_workshop_2k.hdr'})
    // const envMap = useEnvironment({files:'./environments/envmap.hdr'})

    const [normalMap, roughnessMap] = useTexture(['./textures/waternormals.jpeg', './textures/SurfaceImperfections003_1K_var1.jpg'])

    const options = useControls("Controls",{
        Viscosity: { value: 0.85, min: 0.95, max: 0.999, step: 0.001 },
        MouseSize: { value: 75., min: 1.0, max: 100., step: 1.0 },
        Metalness: { value: .8, min: 0.0, max: 1.0, step: 0.001 },
        Roughness: { value: 0.2, min: 0.0, max: 1.0, step: 0.001 },
        NormalMapScale: { value: 0.03, min: 0.0, max: 5.0, step: 0.01 },
        Wireframe: false
        })

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
    
    setHeightmapTexture(gpuCompute.current.getCurrentRenderTarget(heightmapVariable.current).texture)
    }, [])

    useFrame(() =>{

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
        
        setHeightmapTexture(gpuCompute.current.getCurrentRenderTarget(heightmapVariable.current).texture)

        uniforms.mouseSize.value = options.MouseSize
        uniforms.viscosityConstant.value = options.Viscosity
    })


    return(
    <>
        <OrbitControls />
        

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
            side = {DoubleSide}
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
            <meshStandardMaterial
            ref = {materialRef}
            side={DoubleSide}
            wireframe={options.Wireframe}
            roughness={options.Roughness}
            // roughnessMap={roughnessMap}
            metalness={options.Metalness}
            envMap={envMap}
            normalMap={normalMap}
            normalScale={options.NormalMapScale}
            lights = {true}
            color = {0xccccff}
            />
        </mesh>

        <ModifiedShader 
        meshRef={waterMeshRef} 
        options={options} 
        heightmapTexture={heightmapTexture} />
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
