import { useQuery } from "./useQuery";

export interface TireModel {
  name: string;
  category: string;
  km_max: number;
}

async function fetchTyres(): Promise<TireModel[]> {
  const r = await fetch("/api/tyres", { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function useTyres() {
  return useQuery<TireModel[]>(fetchTyres);
}
