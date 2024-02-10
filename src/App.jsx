import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import './index.css'
import ComputeShader from './ComputeShader.jsx'

function App() {
  
  return (
  <>

    <Canvas
    camera={{ 
      position: [0, 0, 750],
      fov: 40 }}  
    >
      <color attach="background" args={[0xbbddff]} />
    
    <OrbitControls />

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
