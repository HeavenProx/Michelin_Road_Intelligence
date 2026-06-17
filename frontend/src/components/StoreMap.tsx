import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import { STORES } from "@/data/demo";
import { haversineKm, formatDistance } from "@/utils/geo";

// ── Icônes ────────────────────────────────────────────────────────────────

function makePin(fill: string, dot: string, w: number, h: number): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<svg width="${w}" height="${h}" viewBox="0 0 26 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.82 0 0 5.82 0 13C0 22.75 13 36 13 36C13 36 26 22.75 26 13C26 5.82 20.18 0 13 0Z"
        fill="${fill}" stroke="white" stroke-width="1.5"/>
      <circle cx="13" cy="12.5" r="5" fill="${dot}"/>
    </svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -(h + 4)],
  });
}

const storeIcon         = makePin("#00205B", "#FCE500", 26, 36);
const storeIconSelected = makePin("#FC4C02", "#FCE500", 32, 44);

const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;
    background:#2563EB;border-radius:50%;
    border:3px solid white;
    box-shadow:0 0 0 5px rgba(37,99,235,0.18),0 2px 8px rgba(0,0,0,0.25);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// ── Constantes ────────────────────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [45.5, 5.2];
const DEFAULT_ZOOM = 8;

export const physicalStores = STORES.filter((s) => s.type === "physical") as Array<
  Extract<(typeof STORES)[number], { type: "physical" }>
>;

// ── MapController ─────────────────────────────────────────────────────────

function MapController({
  selectedStore,
  markerRefs,
  onLocated,
}: {
  selectedStore: string | null;
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
  onLocated: (pos: [number, number]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos: [number, number] = [coords.latitude, coords.longitude];
        onLocated(pos);
        map.flyTo(pos, 13, { duration: 1.5 });
      },
      () => {},
      { timeout: 8000, maximumAge: 60_000 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    const store = physicalStores.find((s) => s.name === selectedStore);
    if (!store) return;
    map.flyTo([store.coords.lat, store.coords.lng], 15, { duration: 1 });
    const timer = setTimeout(() => {
      markerRefs.current[selectedStore]?.openPopup();
    }, 1100);
    return () => clearTimeout(timer);
  }, [selectedStore, map, markerRefs]);

  return null;
}

// ── Composant principal ───────────────────────────────────────────────────

interface StoreMapProps {
  selectedStore: string | null;
  userPos: [number, number] | null;
  onLocated: (pos: [number, number]) => void;
}

export function StoreMap({ selectedStore, userPos, onLocated }: StoreMapProps) {
  const [locating, setLocating] = useState(true);
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const mapRef     = useRef<L.Map | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLocating(false), 9000);
    return () => clearTimeout(t);
  }, []);

  function handleLocated(pos: [number, number]) {
    setLocating(false);
    onLocated(pos);
  }

  function recenterOnUser() {
    if (!userPos || !mapRef.current) return;
    mapRef.current.flyTo(userPos, 14, { duration: 1 });
  }

  return (
    <div className="relative">
      {locating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 pointer-events-none">
          <span className="text-[11px] text-gray-400 animate-pulse tracking-wide">Localisation en cours…</span>
        </div>
      )}

      {userPos && (
        <button
          onClick={recenterOnUser}
          title="Recentrer sur ma position"
          style={{ zIndex: 1000 }}
          className="absolute bottom-[10px] left-[10px] w-8 h-8 bg-white rounded-[10px] shadow-md flex items-center justify-center text-[#00205B] hover:bg-gray-50 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      )}

      <MapContainer
        ref={mapRef}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ height: "260px", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        <ZoomControl position="bottomright" />
        <MapController selectedStore={selectedStore} markerRefs={markerRefs} onLocated={handleLocated} />

        {physicalStores.map((s) => {
          const dist = userPos
            ? formatDistance(haversineKm(userPos[0], userPos[1], s.coords.lat, s.coords.lng))
            : null;
          return (
            <Marker
              key={s.name}
              position={[s.coords.lat, s.coords.lng]}
              icon={selectedStore === s.name ? storeIconSelected : storeIcon}
              ref={(ref) => { markerRefs.current[s.name] = ref; }}
            >
              <Popup>
                <p style={{ fontWeight: 700, fontSize: 13, color: "#111827", marginBottom: 2 }}>{s.name}</p>
                <p style={{ fontSize: 11, color: "#6b7280" }}>{s.address}</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#00205B", marginTop: 4 }}>
                  {dist ?? s.distance}
                </p>
              </Popup>
            </Marker>
          );
        })}

        {userPos && (
          <Marker position={userPos} icon={userIcon}>
            <Popup>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>Vous êtes ici</p>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
