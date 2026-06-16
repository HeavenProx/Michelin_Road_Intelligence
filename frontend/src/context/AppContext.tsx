import { createContext, useContext, useState, type ReactNode } from "react";
import type { LiveData } from "@/types";

interface AppContextValue {
  liveData: LiveData | undefined;
  loading: boolean;
  loadLiveData: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  logout: () => Promise<void>;
  connectStrava: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [liveData, setLiveData] = useState<LiveData | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  async function fetchFromApi(path: string, isDemo: boolean) {
    setLoading(true);
    try {
      const r = await fetch(path, { credentials: "include" });
      const data = await r.json();
      if (data.success) {
        setLiveData({
          athlete: data.athlete,
          profile: data.profile,
          reco: {
            explanation: data.explanation,
            recommended: data.recommended,
            alternatives: data.alternatives,
          },
          isDemo,
        });
      }
    } catch {
      // silently fall back to demo data
    } finally {
      setLoading(false);
    }
  }

  async function loadLiveData() {
    await fetchFromApi("/api/recommend", false);
  }

  async function loadDemoData() {
    await fetchFromApi("/api/demo", true);
  }

  async function logout() {
    try {
      await fetch("/auth/logout", { credentials: "include" });
    } catch {}
    setLiveData(undefined);
  }

  function connectStrava() {
    window.location.href = "/auth/strava";
  }

  return (
    <AppContext.Provider value={{ liveData, loading, loadLiveData, loadDemoData, logout, connectStrava }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
