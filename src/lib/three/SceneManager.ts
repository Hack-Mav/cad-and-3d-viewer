import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'

export class SceneManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private container: HTMLElement
  private animationId: number | null = null
  private grid: THREE.GridHelper
  private axesHelper: THREE.AxesHelper

  constructor(container: HTMLElement) {
    this.container = container
    
    // Initialize scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf5f5f5)
    
    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(10, 10, 10)
    this.camera.lookAt(0, 0, 0)
    
    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    // Add renderer to container
    container.appendChild(this.renderer.domElement)
    
    // Initialize controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.screenSpacePanning = false
    this.controls.minDistance = 1
    this.controls.maxDistance = 100
    this.controls.maxPolarAngle = Math.PI
    
    // Add grid
    this.grid = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc)
    this.scene.add(this.grid)
    
    // Add axes helper
    this.axesHelper = new THREE.AxesHelper(5)
    this.scene.add(this.axesHelper)
    
    // Setup lighting
    this.setupLighting()
    
    // Start render loop
    this.animate()
    
    // Handle resize
    window.addEventListener('resize', this.handleResize.bind(this))
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    this.scene.add(directionalLight)
    
    // Point light for fill
    const pointLight = new THREE.PointLight(0xffffff, 0.3)
    pointLight.position.set(-10, 10, -10)
    this.scene.add(pointLight)
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this))
    
    // Update controls
    this.controls.update()
    
    // Render scene
    this.renderer.render(this.scene, this.camera)
  }

  public handleResize(): void {
    if (!this.container) return
    
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    
    this.renderer.setSize(width, height)
  }

  public setViewMode(mode: 'wireframe' | 'shaded' | 'realistic'): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const material = object.material as THREE.Material
        switch (mode) {
          case 'wireframe':
            if ('wireframe' in material) {
              material.wireframe = true
            }
            break
          case 'shaded':
            if ('wireframe' in material) {
              material.wireframe = false
            }
            break
          case 'realistic':
            if ('wireframe' in material) {
              material.wireframe = false
            }
            // Additional realistic rendering settings could go here
            break
        }
      }
    })
  }

  public setTheme(isDark: boolean): void {
    if (isDark) {
      this.scene.background = new THREE.Color(0x1a1a1a)
      this.grid.material.color.setHex(0x444444)
    } else {
      this.scene.background = new THREE.Color(0xf5f5f5)
      this.grid.material.color.setHex(0x888888)
    }
  }

  public addObject(object: THREE.Object3D): void {
    this.scene.add(object)
  }

  public removeObject(object: THREE.Object3D): void {
    this.scene.remove(object)
  }

  public getScene(): THREE.Scene {
    return this.scene
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer
  }

  public getControls(): OrbitControls {
    return this.controls
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    
    this.controls.dispose()
    this.renderer.dispose()
    
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement)
    }
    
    window.removeEventListener('resize', this.handleResize.bind(this))
  }
}