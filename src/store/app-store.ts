import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface AppState {
  // Theme management
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  
  // UI state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  
  // Viewport state
  viewportMode: 'wireframe' | 'shaded' | 'realistic'
  setViewportMode: (mode: 'wireframe' | 'shaded' | 'realistic') => void
  
  // Tool state
  activeTool: string | null
  setActiveTool: (tool: string | null) => void
  
  // Project state
  projectName: string
  setProjectName: (name: string) => void
  
  // Selection state
  selectedObjects: string[]
  setSelectedObjects: (objects: string[]) => void
  addSelectedObject: (objectId: string) => void
  removeSelectedObject: (objectId: string) => void
  clearSelection: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      
      // UI
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      
      // Viewport
      viewportMode: 'shaded',
      setViewportMode: (viewportMode) => set({ viewportMode }),
      
      // Tools
      activeTool: null,
      setActiveTool: (activeTool) => set({ activeTool }),
      
      // Project
      projectName: 'Untitled Project',
      setProjectName: (projectName) => set({ projectName }),
      
      // Selection
      selectedObjects: [],
      setSelectedObjects: (selectedObjects) => set({ selectedObjects }),
      addSelectedObject: (objectId) => {
        const { selectedObjects } = get()
        if (!selectedObjects.includes(objectId)) {
          set({ selectedObjects: [...selectedObjects, objectId] })
        }
      },
      removeSelectedObject: (objectId) => {
        const { selectedObjects } = get()
        set({ selectedObjects: selectedObjects.filter(id => id !== objectId) })
      },
      clearSelection: () => set({ selectedObjects: [] }),
    }),
    {
      name: 'cad-app-store',
    }
  )
)