import type { FC } from 'react'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useAppStore } from '@/store/app-store'
import { useThreeScene } from '@/hooks/useThreeScene'

export const Viewport: FC = () => {
  const { viewportMode, setViewportMode } = useAppStore()
  const { containerRef, sceneManager, isInitialized } = useThreeScene()

  const viewModes = [
    { id: 'wireframe', label: 'Wireframe' },
    { id: 'shaded', label: 'Shaded' },
    { id: 'realistic', label: 'Realistic' },
  ] as const

  // Add some demo objects to the scene
  useEffect(() => {
    if (!sceneManager || !isInitialized) return

    // Add a demo cube
    const geometry = new THREE.BoxGeometry(2, 2, 2)
    const material = new THREE.MeshLambertMaterial({ color: 0x4f46e5 })
    const cube = new THREE.Mesh(geometry, material)
    cube.position.set(0, 1, 0)
    cube.castShadow = true
    cube.receiveShadow = true
    sceneManager.addObject(cube)

    // Add a demo sphere
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32)
    const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0x10b981 })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    sphere.position.set(4, 1, 0)
    sphere.castShadow = true
    sphere.receiveShadow = true
    sceneManager.addObject(sphere)

    // Add a demo cylinder
    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 3, 32)
    const cylinderMaterial = new THREE.MeshLambertMaterial({ color: 0xf59e0b })
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
    cylinder.position.set(-4, 1.5, 0)
    cylinder.castShadow = true
    cylinder.receiveShadow = true
    sceneManager.addObject(cylinder)

    // Add a ground plane
    const planeGeometry = new THREE.PlaneGeometry(20, 20)
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.rotation.x = -Math.PI / 2
    plane.receiveShadow = true
    sceneManager.addObject(plane)

  }, [sceneManager, isInitialized])

  return (
    <div className="viewport-container flex-1 bg-gray-50 dark:bg-gray-800 relative">
      {/* Viewport controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        {viewModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setViewportMode(mode.id)}
            className={`px-3 py-1 text-xs rounded border ${
              viewportMode === mode.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Three.js container */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {/* Loading indicator */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm">Initializing 3D Viewport...</p>
          </div>
        </div>
      )}
    </div>
  )
}