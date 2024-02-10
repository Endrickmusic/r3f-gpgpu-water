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
      frameloop="always"
      camera={{ 
      position: [0, 500, 550],
      fov: 40,
      near: 10,
      far: 3000
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

    </Canvas>
  </>
  )
}

export default App
