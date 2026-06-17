import { useQuery } from "./useQuery";

export interface WearAlert {
  tire: string;
  wear: number;
  date: string;
}

export interface ReviewReminder {
  tire: string;
  threshold: number;
  date: string;
  done: boolean;
}

export interface AlertsData {
  alerts: WearAlert[];
  reminders: ReviewReminder[];
}

async function fetchAlerts(): Promise<AlertsData> {
  const r = await fetch("/api/alerts", { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function useAlerts() {
  return useQuery<AlertsData>(fetchAlerts);
}
