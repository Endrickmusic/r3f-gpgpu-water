import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import './index.css'
import ComputeShader from './ComputeShader.jsx'

function App() {
  
  function Rig() {
    const { camera } = useThree()
    // const vec = new Vector3()
  
    return useEffect(() => {
      camera.lookAt(0, -50, 0)
    }), []
  }

  return (
  <>
    <Canvas
    dpr={window.devicePixelRatio}
    camera={{ 
      position: [0, 500, 550],
      fov: 40,
      near: 10,
      far: 3000
      }
    }  
    >

    <color attach="background" args={[0xbbddff]} />
    
    {/* <OrbitControls /> */}

    <Rig />

    <directionalLight 
    position={[300, 400, 175]}
    />

    <directionalLight 
    position={[ -100, 350, - 200]}
    />

      <ComputeShader />

      <mesh
      position={[-2, 0, -1]}
      rotation={[Math.PI / 2, 0, 0 ]}
      scale={15}
      >
        <boxGeometry />
        <meshStandardMaterial 
        color={0x0000ff}
        />
      </mesh>

    </Canvas>
  </>
  )
}

export default App
