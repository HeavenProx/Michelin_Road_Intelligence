import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import type { LiveData, WearAlert } from "@/types";

interface AppContextValue {
  liveData: LiveData | undefined;
  loading: boolean;
  loadLiveData: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  logout: () => Promise<void>;
  connectStrava: () => void;
  wearAlerts: WearAlert[];
  alertCount: number;
  triggerWearAlert: (tire: string, wear: number) => void;
  dismissWearAlert: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function todayLabel(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [liveData, setLiveData]     = useState<LiveData | undefined>(undefined);
  const [loading, setLoading]       = useState(false);
  const [wearAlerts, setWearAlerts] = useState<WearAlert[]>([]);

  // Ref pour éviter les doubles envois d'email (React strict-mode / re-renders)
  const emailedTires = useRef<Set<string>>(new Set());

  const alertCount = wearAlerts.filter((a) => !a.dismissed).length;

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
    setWearAlerts([]);
    emailedTires.current.clear();
  }

  function connectStrava() {
    window.location.href = "/auth/strava";
  }

  function triggerWearAlert(tire: string, wear: number) {
    setWearAlerts((prev) => {
      if (prev.some((a) => a.tire === tire && !a.dismissed)) return prev;
      return [
        ...prev,
        { id: `${tire}-${Date.now()}`, tire, wear, date: todayLabel(), dismissed: false },
      ];
    });

    if (!emailedTires.current.has(tire)) {
      emailedTires.current.add(tire);
      fetch("/api/notify-wear", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tire, wear }),
      }).catch(() => {});
    }
  }

  function dismissWearAlert(id: string) {
    setWearAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    );
  }

  return (
    <AppContext.Provider
      value={{
        liveData, loading, loadLiveData, loadDemoData, logout, connectStrava,
        wearAlerts, alertCount, triggerWearAlert, dismissWearAlert,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
