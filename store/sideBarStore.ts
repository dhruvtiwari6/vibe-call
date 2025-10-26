import {create} from 'zustand'


//defining the store interface

interface SidebarState {
    //state
    isSidebarOpen: boolean,
    sidebarWidth: number


    //actions
    toggleSidebar: () => void
    openSidebar: () => void
    closeSidebar: () => void
    setSidebarWidth : (width : number) => void
}


export const useSidebarStore = create<SidebarState>((set) => ({
    // initial state
  isSidebarOpen: false,
  sidebarWidth: 320,

  //actions
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  setSidebarWidth: (width: number) => set({ sidebarWidth: width }),
}))
