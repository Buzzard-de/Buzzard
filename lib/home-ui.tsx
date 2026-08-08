"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface HomeUIContextValue {
  sidebarOpen: boolean;
  megaMenuOpen: boolean;
  mobileSearchOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openMegaMenu: () => void;
  closeMegaMenu: () => void;
  toggleMegaMenu: () => void;
  toggleMobileSearch: () => void;
  closeMobileSearch: () => void;
}

const HomeUIContext = createContext<HomeUIContextValue | null>(null);

export function HomeUIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const openMegaMenu = useCallback(() => setMegaMenuOpen(true), []);
  const closeMegaMenu = useCallback(() => setMegaMenuOpen(false), []);
  const toggleMegaMenu = useCallback(() => setMegaMenuOpen((v) => !v), []);
  const toggleMobileSearch = useCallback(() => setMobileSearchOpen((v) => !v), []);
  const closeMobileSearch = useCallback(() => setMobileSearchOpen(false), []);

  useEffect(() => {
    if (!megaMenuOpen && !sidebarOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMegaMenuOpen(false);
        setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [megaMenuOpen, sidebarOpen]);

  useEffect(() => {
    document.body.style.overflow = megaMenuOpen || sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [megaMenuOpen, sidebarOpen]);

  const value = useMemo(
    () => ({
      sidebarOpen,
      megaMenuOpen,
      mobileSearchOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      openMegaMenu,
      closeMegaMenu,
      toggleMegaMenu,
      toggleMobileSearch,
      closeMobileSearch,
    }),
    [
      sidebarOpen,
      megaMenuOpen,
      mobileSearchOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      openMegaMenu,
      closeMegaMenu,
      toggleMegaMenu,
      toggleMobileSearch,
      closeMobileSearch,
    ]
  );

  return <HomeUIContext.Provider value={value}>{children}</HomeUIContext.Provider>;
}

export function useHomeUI() {
  return useContext(HomeUIContext);
}
