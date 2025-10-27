import type { FC } from 'react'
import { useAppStore } from '@/store/app-store'

export const StatusBar: FC = () => {
  const { activeTool, selectedObjects, viewportMode } = useAppStore()

  return (
    <div className="status-bar flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span>
          Tool: {activeTool || 'None'}
        </span>
        <span>
          Selected: {selectedObjects.length} object{selectedObjects.length !== 1 ? 's' : ''}
        </span>
        <span>
          View: {viewportMode}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <span>Ready</span>
      </div>
    </div>
  )
}