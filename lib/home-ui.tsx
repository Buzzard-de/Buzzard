"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface HomeUIContextValue {
  sidebarOpen: boolean;
  mobileSearchOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  toggleMobileSearch: () => void;
  closeMobileSearch: () => void;
}

const HomeUIContext = createContext<HomeUIContextValue | null>(null);

export function HomeUIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const toggleMobileSearch = useCallback(() => setMobileSearchOpen((v) => !v), []);
  const closeMobileSearch = useCallback(() => setMobileSearchOpen(false), []);

  const value = useMemo(
    () => ({
      sidebarOpen,
      mobileSearchOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      toggleMobileSearch,
      closeMobileSearch,
    }),
    [
      sidebarOpen,
      mobileSearchOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      toggleMobileSearch,
      closeMobileSearch,
    ]
  );

  return <HomeUIContext.Provider value={value}>{children}</HomeUIContext.Provider>;
}

export function useHomeUI() {
  return useContext(HomeUIContext);
}
