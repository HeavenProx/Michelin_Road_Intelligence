import { useQuery } from "./useQuery";

export interface Peer {
  name: string;
  location: string;
  km: number;
  totalKm: number;
  rating: number;
  review: string;
  similarity: number;
  tire: string;
  rides: number;
  terrain: string;
  date: string;
}

async function fetchPeers(isDemo: boolean): Promise<Peer[]> {
  const url = isDemo ? "/api/peers/demo" : "/api/peers";
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function usePeers(isDemo: boolean) {
  return useQuery<Peer[]>(() => fetchPeers(isDemo));
}
