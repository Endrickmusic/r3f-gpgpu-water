import { useRef, useMemo, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { UniformsUtils, ShaderChunk, ShaderMaterial, ShaderLib, Color, Vector2, HalfFloatType } from "three"
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js'

import { heightmapFragmentShader } from './shaders/heightmapFragmentShader.js'
import { waterVertexShader } from './shaders/waterVertexShader.js'

 // Texture width for simulation
 const WIDTH = 128

 // Water size in system units
 const BOUNDS = 512
 const BOUNDS_HALF = BOUNDS * 0.5

 const simplex = new SimplexNoise();



export default function initWater() {

    const materialColor = 0x0040C0

    const { gl } = useThree()

    const materialRef = useRef(new ShaderMaterial())

    const waterMeshRef = useRef()

    // const uniforms = useMemo(
    //     () => ({
    //         'diffuse': {
    //         type: "c",
    //         value: new Color( materialColor ),
    //           },
    //         'specular': {
    //         type: "c",
    //         value: new Color( 0x111111 ),
    //         },
    //         'shininess': {
    //         type: "f",
    //         value: Math.max( 50, 1e-4 )
    //       },
    //         'opacity': {
    //         type: "f",
    //         value: materialRef.current.opacity
    //       }
    //      }),[]
         
    //   )   

    // Material attributes from THREE.MeshPhongMaterial
    // Sets the uniforms with the material values
    
    useEffect(() => {
    materialRef.current.uniforms[ 'diffuse' ].value = new Color( materialColor );
    materialRef.current.uniforms[ 'specular' ].value = new Color( 0x111111 );
    materialRef.current.uniforms[ 'shininess' ].value = Math.max( 50, 1e-4 );
    materialRef.current.uniforms[ 'opacity' ].value = materialRef.current.opacity;
    }, [])

    // Defines
    materialRef.current.defines.WIDTH = WIDTH.toFixed( 1 );
    materialRef.current.defines.BOUNDS = BOUNDS.toFixed( 1 );

    // waterUniforms = materialRef.current.uniforms;
    // waterMeshRef.current.updateMatrix()

    // // THREE.Mesh just for mouse raycasting
    // const geometryRay = new THREE.PlaneGeometry( BOUNDS, BOUNDS, 1, 1 );
    // meshRay = new THREE.Mesh( geometryRay, new THREE.MeshBasicMaterial( { color: 0xFFFFFF, visible: false } ) );
    // meshRay.rotation.x = - Math.PI / 2;
    // meshRay.matrixAutoUpdate = false;
    // meshRay.updateMatrix();
    // scene.add( meshRay );


    // Creates the gpu computation class and sets it up

    const gpuCompute = new GPUComputationRenderer( WIDTH, WIDTH, gl );

    if ( gl.capabilities.isWebGL2 === false ) {

        gpuCompute.setDataType( HalfFloatType );

    }

    const heightmap0 = gpuCompute.createTexture()

    fillTexture( heightmap0 )

    const heightmapVariable = gpuCompute.addVariable( 'heightmap', heightmapFragmentShader, heightmap0 );

    gpuCompute.setVariableDependencies( heightmapVariable, [ heightmapVariable ] );

    heightmapVariable.material.uniforms[ 'mousePos' ] = { value: new Vector2( 10000, 10000 ) };
    heightmapVariable.material.uniforms[ 'mouseSize' ] = { value: 20.0 };
    heightmapVariable.material.uniforms[ 'viscosityConstant' ] = { value: 0.98 };
    heightmapVariable.material.uniforms[ 'heightCompensation' ] = { value: 0 };
    heightmapVariable.material.uniforms[ 'uTime' ] = { value: 0 };
    heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed( 1 );

    const error = gpuCompute.init();
    if ( error !== null ) {

        console.error( error );

    }

    return(
    <>
        <mesh
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