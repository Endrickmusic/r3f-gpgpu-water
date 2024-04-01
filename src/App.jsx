import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import './index.css'
import ComputeShader from './ComputeShader.jsx'
import Pool from './Pool.jsx'

function App() {
  
  function Rig() {
    const { camera } = useThree()

  
    return useEffect(() => {
      camera.lookAt(0, 0, 0)
    }), []
  }

  return (
  <>
    <Canvas
      dpr={window.devicePixelRatio}
      frameloop="always"
      camera={{ 
      position: [0, -3620, 1400],
      fov: 40,
      near: 60,
      far: 8000
      }
    }  
    >

    <color attach="background" args={[0xffabdd]} />
    
    {/* <OrbitControls /> */}

    <Rig />

    <directionalLight 
    position={[300, 400, 175]}
    intensity={5}
    />

    <directionalLight 
    position={[ -100, 350, - 200]}
    intensity={1}
    />

      <ComputeShader />
      <Pool />

    </Canvas>
  </>
  )
}

export default App
