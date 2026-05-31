import { create } from 'zustand'

interface Widget {
  id: string
  x: number
  y: number
  w: number
  h: number
  visible: boolean
}

interface DashboardState {
  isCopilotOpen: boolean
  setCopilotOpen: (open: boolean) => void
  isSidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  activeNoteId: string | null
  setActiveNoteId: (noteId: string | null) => void
  widgets: Widget[]
  updateWidgets: (widgets: Widget[]) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  isCopilotOpen: false,
  setCopilotOpen: (open) => set({ isCopilotOpen: open }),
  isSidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  activeNoteId: null,
  setActiveNoteId: (noteId) => set({ activeNoteId: noteId }),
  widgets: [
    { id: 'calendar', x: 0, y: 0, w: 6, h: 4, visible: true },
    { id: 'tasks', x: 6, y: 0, w: 6, h: 4, visible: true },
    { id: 'budget', x: 0, y: 4, w: 4, h: 4, visible: true },
    { id: 'gpa', x: 4, y: 4, w: 4, h: 4, visible: true },
    { id: 'quick-notes', x: 8, y: 4, w: 4, h: 4, visible: true },
  ],
  updateWidgets: (widgets) => set({ widgets }),
}))
