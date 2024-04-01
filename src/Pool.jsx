import React, { useRef } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { RepeatWrapping } from 'three'

export default function Model(props) {

  const { nodes } = useGLTF('./models/pool_01.glb')
  const [diffuse, roughness, normal] = useTexture([
    './textures/TilesSquarePoolMixed001_COL_2K.jpg', 
    './textures/TilesSquarePoolMixed001_ROUGH_2K.jpg',
    './textures/TilesSquarePoolMixed001_NRM_2K.jpg']) 

    const setTextureRepeatProperties = (texture) => {
        texture.wrapS = RepeatWrapping; // repeat in the U direction
        texture.wrapT = RepeatWrapping; // repeat in the V direction
        texture.repeat.set(0.5, 0.5); // adjust the values as needed
      };
    
      // Set repeat properties for all textures
      [diffuse, roughness, normal].forEach(setTextureRepeatProperties)
  
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Pool.geometry}
        scale={180.}
        position={[0, 0, -350]}
        rotation={[Math.PI/2, 0, 0]}
      >
      <meshStandardMaterial 
      map={diffuse}
      normalMap={normal}
      roughnessMap={roughness}
      />
      </mesh>
    </group>
  )
}

useGLTF.preload('./models/pool_01.glb')