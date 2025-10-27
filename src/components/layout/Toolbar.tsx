import type { FC } from 'react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { 
  Square, 
  Circle, 
  Minus, 
  Move3D, 
  RotateCcw, 
  ZoomIn, 
  Sun, 
  Moon,
  Save,
  FolderOpen,
  Undo,
  Redo
} from 'lucide-react'

export const Toolbar: FC = () => {
  const { theme, setTheme, activeTool, setActiveTool } = useAppStore()

  const tools = [
    { id: 'select', icon: Move3D, label: 'Select' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
  ]

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <div className="toolbar">
      {/* File operations */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button variant="ghost" size="icon" title="New Project">
          <FolderOpen className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Save Project">
          <Save className="h-4 w-4" />
        </Button>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button variant="ghost" size="icon" title="Undo">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Redo">
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Drawing tools */}
      <div className="flex items-center gap-1 border-r pr-2">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {/* View controls */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button variant="ghost" size="icon" title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Reset View">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Theme toggle */}
      <div className="flex items-center gap-1 ml-auto">
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}