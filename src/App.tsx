import { useEffect } from 'react'
import { useAppStore } from '@/store/app-store'
import { Toolbar } from '@/components/layout/Toolbar'
import { PropertyPanel } from '@/components/layout/PropertyPanel'
import { StatusBar } from '@/components/layout/StatusBar'
import { Viewport } from '@/components/viewport/Viewport'

function App() {
  const { theme } = useAppStore()

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
      {/* Toolbar */}
      <Toolbar />
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Viewport */}
        <Viewport />
        
        {/* Property Panel */}
        <PropertyPanel />
      </div>
      
      {/* Status Bar */}
      <StatusBar />
    </div>
  )
}

export default App
