import { useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { STORES } from "@/data/demo";
import { StoreMap, physicalStores } from "@/components/StoreMap";
import { haversineKm, formatDistance } from "@/utils/geo";

const onlineStores = STORES.filter((s) => s.type === "online");

export function StoreSection() {
  const [selected, setSelected]   = useState<string | null>(null);
  const [userPos, setUserPos]     = useState<[number, number] | null>(null);

  // Enrichit chaque magasin physique avec la vraie distance et trie par proximité
  const storesWithDist = physicalStores
    .map((s) => ({
      ...s,
      distKm:   userPos ? haversineKm(userPos[0], userPos[1], s.coords.lat, s.coords.lng) : Infinity,
      distLabel: userPos
        ? formatDistance(haversineKm(userPos[0], userPos[1], s.coords.lat, s.coords.lng))
        : s.distance,
    }))
    .sort((a, b) => a.distKm - b.distKm);

  function handleSelect(name: string) {
    setSelected((prev) => (prev === name ? null : name));
  }

  return (
    <>
      <StoreMap
        selectedStore={selected}
        userPos={userPos}
        onLocated={setUserPos}
      />

      {/* Magasins physiques — triés par distance, scrollable */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400">
          Points de vente ({physicalStores.length})
        </p>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="text-[10px] text-[#27509B] font-semibold hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
        {storesWithDist.map((s) => {
          const isSelected = selected === s.name;
          return (
            <button
              key={s.name}
              onClick={() => handleSelect(s.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-l-2 ${
                isSelected ? "bg-[#00205B]/5 border-[#00205B]" : "hover:bg-gray-50 border-transparent"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                isSelected ? "bg-[#00205B]/15" : "bg-[#27509B]/10"
              }`}>
                <MapPin size={15} className={isSelected ? "text-[#00205B]" : "text-[#27509B]"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${isSelected ? "text-[#00205B]" : "text-gray-900"}`}>
                  {s.name}
                </p>
                <p className="text-xs text-gray-400 truncate">{s.address}</p>
              </div>
              <span className={`font-bold text-sm flex-shrink-0 tabular-nums ${isSelected ? "text-[#00205B]" : "text-[#27509B]"}`}>
                {s.distLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Magasins en ligne — scrollable */}
      <div className="border-t border-gray-100">
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400">
            En ligne ({onlineStores.length})
          </p>
        </div>
        <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {onlineStores.map((s) => {
            const href = "url" in s ? s.url : "#";
            return (
              <a
                key={s.name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#00205B]/8">
                  <ExternalLink size={15} className="text-[#00205B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400 truncate">{s.address}</p>
                </div>
                <ExternalLink size={12} className="text-gray-300 flex-shrink-0" />
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
}
