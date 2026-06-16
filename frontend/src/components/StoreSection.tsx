import { MapPin, ExternalLink } from "lucide-react";
import { STORES } from "@/data/demo";

export function StoreSection({ filterId }: { filterId: string }) {
  return (
    <>
      <svg viewBox="0 0 100 55" className="w-full block" aria-hidden="true">
        <rect width="100" height="55" fill="#DAEAF5" />
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((x) => (
          <line key={`v${x}`} x1={x} y1={0} x2={x} y2={55} stroke="#C2D9EE" strokeWidth="0.35" />
        ))}
        {[10, 20, 30, 40, 50].map((y) => (
          <line key={`h${y}`} x1={0} y1={y} x2={100} y2={y} stroke="#C2D9EE" strokeWidth="0.35" />
        ))}
        <text x="96" y="53" fontSize="3" fill="#9BB5CA" fontFamily="sans-serif" textAnchor="end">Grenoble, Isère</text>
        <defs>
          <filter id={filterId} x="-20%" y="-30%" width="140%" height="160%">
            <feDropShadow dx="0" dy="0.4" stdDeviation="0.6" floodColor="#00205B" floodOpacity="0.18" />
          </filter>
        </defs>
        {STORES.filter((s) => s.type === "physical").map((s, i) => (
          <g key={i}>
            <circle cx={s.pin!.x} cy={s.pin!.y + 0.6} r="3.2" fill="#00205B" fillOpacity="0.12" />
            <circle cx={s.pin!.x} cy={s.pin!.y} r="3" fill="#27509B" />
            <circle cx={s.pin!.x} cy={s.pin!.y} r="1.2" fill="white" />
            <rect x={s.pin!.x + 4.5} y={s.pin!.y - 3.5} width={s.label!.length * 1.85 + 3} height={7} rx="1.8" fill="white" filter={`url(#${filterId})`} />
            <text x={s.pin!.x + 6} y={s.pin!.y + 0.8} fontSize="3.2" fill="#1a2744" fontFamily="sans-serif" fontWeight="700">{s.label}</text>
          </g>
        ))}
      </svg>
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 mb-3">Où racheter ce pneu</p>
      </div>
      <div className="divide-y divide-gray-100">
        {STORES.map((s) => (
          <a key={s.name} href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.type === "physical" ? "bg-[#27509B]/10" : "bg-[#00205B]/8"}`}>
              {s.type === "physical"
                ? <MapPin size={15} className="text-[#27509B]" />
                : <ExternalLink size={15} className="text-[#00205B]" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{s.name}</p>
              <p className="text-xs text-gray-400 truncate">{s.address}</p>
            </div>
            <span className={`font-bold text-sm flex-shrink-0 ${s.type === "physical" ? "text-[#27509B]" : "text-gray-500"}`}>
              {s.distance}
            </span>
          </a>
        ))}
      </div>
    </>
  );
}
