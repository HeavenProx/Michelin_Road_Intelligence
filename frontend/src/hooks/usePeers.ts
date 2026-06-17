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

async function fetchPeers(): Promise<Peer[]> {
  const r = await fetch("/api/peers", { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function usePeers() {
  return useQuery<Peer[]>(fetchPeers);
}
