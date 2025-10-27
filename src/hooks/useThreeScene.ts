import { useEffect, useRef, useState } from 'react'
import { SceneManager } from '@/lib/three/SceneManager'
import { useAppStore } from '@/store/app-store'

export const useThreeScene = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const { theme, viewportMode } = useAppStore()

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current || sceneManagerRef.current) return

    try {
      sceneManagerRef.current = new SceneManager(containerRef.current)
      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to initialize Three.js scene:', error)
    }

    return () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose()
        sceneManagerRef.current = null
        setIsInitialized(false)
      }
    }
  }, [])

  // Handle theme changes
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setTheme(theme === 'dark')
    }
  }, [theme])

  // Handle view mode changes
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setViewMode(viewportMode)
    }
  }, [viewportMode])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.handleResize()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    containerRef,
    sceneManager: sceneManagerRef.current,
    isInitialized
  }
}