import { useCallback, useEffect, useState } from "react";
import { Star, MapPin, TrendingUp, Bike, Filter, MessageSquare } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { CritBar } from "@/components/CritBar";
import { useApp } from "@/context/AppContext";
import type { Review } from "@/types";

export function AvisPage() {
  const { liveData } = useApp();
  const recommendedTire = liveData?.reco?.recommended.name ?? "";
  const isDemo = liveData?.isDemo ?? false;

  const [filter, setFilter] = useState("Tous");
  const [showFilter, setShowFilter] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mountedTyreNames, setMountedTyreNames] = useState<string[]>([]);

  const loadReviews = useCallback(() => {
    fetch("/api/reviews", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP error"))))
      .then((data: Review[]) => { if (Array.isArray(data)) setReviews(data); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  useEffect(() => {
    const url = isDemo ? "/api/garage/demo" : "/api/garage";
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!data.success) return;
        const names: string[] = data.bikes.flatMap(
          (b: { tyres: { model: { name: string } }[] }) =>
            b.tyres.map((t) => t.model.name),
        );
        setMountedTyreNames([...new Set(names)]);
      })
      .catch(() => {});
  }, [isDemo]);

  const tireStats = Array.from(new Set(reviews.map((r) => r.tire))).map(
    (tire) => {
      const subset = reviews.filter((r) => r.tire === tire);
      const avg = subset.reduce((s, r) => s + r.rating, 0) / subset.length;
      return { tire, count: subset.length, avg: Math.round(avg * 10) / 10 };
    },
  );

  const filtered =
    filter === "Tous" ? reviews : reviews.filter((r) => r.tire === filter);

  return (
    <div className="px-4 py-5 space-y-5">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avis de la communauté</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {filtered.length} avis{filter !== "Tous" && ` · ${filter}`}
          </p>
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            showFilter
              ? "bg-[#00205B] text-white border-[#00205B]"
              : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <Filter size={12} />
          Filtrer
        </button>
      </div>

      {/* Chips de filtres rapides */}
      <div className="flex flex-wrap gap-2 -mt-2">
        <button
          onClick={() => setFilter("Tous")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            filter === "Tous"
              ? "bg-[#00205B] text-white border-[#00205B]"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          }`}
        >
          Tous ({reviews.length})
        </button>
        {recommendedTire && (
          <button
            onClick={() => setFilter(recommendedTire)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === recommendedTire
                ? "bg-[#FCE500] text-[#00205B] border-[#FCE500]"
                : "bg-[#FCE500]/10 text-[#00205B] border-[#FCE500]/40 hover:border-[#FCE500]"
            }`}
          >
            ★ {recommendedTire} (
            {reviews.filter((r) => r.tire === recommendedTire).length})
          </button>
        )}
        {mountedTyreNames.filter((t) => t !== recommendedTire).length > 0 && (
          <div className="w-full flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 whitespace-nowrap">
              Vos pneus
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
        )}
        {mountedTyreNames
          .filter((tire) => tire !== recommendedTire)
          .map((tire) => (
            <button
              key={tire}
              onClick={() => setFilter(tire)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === tire
                  ? "bg-[#00205B] text-white border-[#00205B]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              {tire} ({reviews.filter((r) => r.tire === tire).length})
            </button>
          ))}
      </div>

      {/* Panneau filtre */}
      {showFilter && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-gray-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                placeholder="Rechercher un modèle..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>
          </div>
          {[
            { tire: "Tous", count: reviews.length, avg: null as number | null },
            ...tireStats,
          ]
            .filter(
              ({ tire }) =>
                tire === "Tous" ||
                tire.toLowerCase().includes(filterQuery.toLowerCase()),
            )
            .map(({ tire, count, avg }) => (
              <button
                key={tire}
                onClick={() => {
                  setFilter(tire);
                  setShowFilter(false);
                  setFilterQuery("");
                }}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                  filter === tire ? "bg-[#27509B]/5" : ""
                }`}
              >
                <div className="text-left">
                  <p
                    className={`font-semibold text-sm ${filter === tire ? "text-[#00205B]" : "text-gray-900"}`}
                  >
                    {tire}
                  </p>
                  <p className="text-xs text-gray-400">{count} avis</p>
                </div>
                {avg !== null && (
                  <div className="flex items-center gap-1">
                    <Star size={13} className="fill-[#FCE500] text-[#FCE500]" />
                    <span className="text-sm font-bold text-gray-700">
                      {avg.toFixed(1)}
                    </span>
                  </div>
                )}
              </button>
            ))}
        </div>
      )}

      {/* État vide — aucun avis en base */}
      {reviews.length === 0 && (
        <div className="flex flex-col items-center text-center py-10 px-4 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <MessageSquare size={28} className="text-gray-300" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base mb-1">Aucun avis pour le moment</p>
            <p className="text-sm text-gray-400 leading-relaxed max-w-[20rem] mx-auto">
              Les avis des cyclistes apparaîtront ici. Pour partager votre expérience sur un pneu, rendez-vous dans <span className="font-semibold text-gray-600">Mes pneus</span>.
            </p>
          </div>
        </div>
      )}

      {/* Message filtre vide */}
      {filtered.length === 0 && filter !== "Tous" && reviews.length > 0 && (
        <div className="flex flex-col items-center text-center py-8 px-4 gap-3 bg-white border border-gray-100 rounded-2xl">
          <p className="font-semibold text-gray-700 text-sm">
            Aucun avis pour <span className="text-[#00205B]">{filter}</span>
          </p>
          <p className="text-xs text-gray-400 leading-relaxed max-w-[18rem]">
            Soyez le premier à partager votre expérience sur ce pneu depuis <span className="font-semibold text-gray-600">Mes pneus</span>.
          </p>
        </div>
      )}

      {/* Cartes avis */}
      <div className="space-y-4">
        {filtered.map((r) => {
          const initials = r.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <div
              key={r.id}
              className="bg-white border border-gray-200 rounded-2xl p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-gray-900 text-base leading-tight">
                      {r.name}
                    </p>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <StarRating rating={r.rating} />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {r.date}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} />
                    {r.location}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 bg-[#00205B] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  <TrendingUp size={10} />
                  Avis après {r.km.toLocaleString("fr-FR")} km
                </span>
                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                  <Bike size={10} />
                  {r.totalKm.toLocaleString("fr-FR")} km au total
                </span>
              </div>

              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#27509B] mb-2">
                {r.tire}
              </p>

              <p className="text-sm text-gray-700 italic leading-relaxed mb-3">
                &ldquo;{r.text}&rdquo;
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
                <CritBar label="Grip" score={r.criteria.grip} />
                <CritBar label="Durabilité" score={r.criteria.durabilite} />
                <CritBar label="Confort" score={r.criteria.confort} />
                <CritBar label="Anti-crevaison" score={r.criteria.anticrv} />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
