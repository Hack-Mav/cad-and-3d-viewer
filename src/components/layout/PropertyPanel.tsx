import type { FC } from 'react'
import { useAppStore } from '@/store/app-store'

export const PropertyPanel: FC = () => {
  const { selectedObjects, projectName } = useAppStore()

  return (
    <div className="property-panel w-64 min-w-64">
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Project</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{projectName}</p>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Selection</h3>
        {selectedObjects.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">No objects selected</p>
        ) : (
          <div className="space-y-1">
            {selectedObjects.map((objectId) => (
              <div key={objectId} className="text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded">
                Object: {objectId}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Properties</h3>
        {selectedObjects.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Select an object to view properties</p>
        ) : (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Position</label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                <input 
                  type="number" 
                  placeholder="X" 
                  className="text-xs p-1 border rounded bg-white dark:bg-gray-800"
                  defaultValue="0"
                />
                <input 
                  type="number" 
                  placeholder="Y" 
                  className="text-xs p-1 border rounded bg-white dark:bg-gray-800"
                  defaultValue="0"
                />
                <input 
                  type="number" 
                  placeholder="Z" 
                  className="text-xs p-1 border rounded bg-white dark:bg-gray-800"
                  defaultValue="0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Rotation</label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                <input 
                  type="number" 
                  placeholder="X" 
                  className="text-xs p-1 border rounded bg-white dark:bg-gray-800"
                  defaultValue="0"
                />
                <input 
                  type="number" 
                  placeholder="Y" 
                  className="text-xs p-1 border rounded bg-white dark:bg-gray-800"
                  defaultValue="0"
                />
                <input 
                  type="number" 
                  placeholder="Z" 
                  className="text-xs p-1 border rounded bg-white dark:bg-gray-800"
                  defaultValue="0"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}