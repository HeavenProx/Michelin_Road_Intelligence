import { useState } from "react";
import { Navigate } from "react-router";
import {
  Bike,
  MapPin,
  TrendingUp,
  Award,
  CheckCircle,
  ArrowRight,
  Droplets,
  Zap,
  Target,
  Mountain,
  Sun,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { StarRating } from "@/components/StarRating";
import { StoreSection } from "@/components/StoreSection";
import { usePeers } from "@/hooks/usePeers";

export function DashboardPage() {
  const { liveData, loading, loadLiveData } = useApp();
  const { data: peers } = usePeers(liveData?.isDemo ?? false);
  const [showStores, setShowStores] = useState(false);

  if (!liveData) return <Navigate to="/" replace />;

  const name = `${liveData.athlete.firstname} ${liveData.athlete.lastname}`;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const location = liveData.athlete.city
    ? `${liveData.athlete.city}, France`
    : liveData.profile.region;
  const monthlyKm = liveData.profile.monthly_distance;
  const monthlyElevation = liveData.profile.monthly_elevation_m ?? 0;
  const totalRides = liveData.profile.ride_count;
  const recoModel = liveData.reco.recommended.name;
  const recoDesc = liveData.reco.explanation;
  const recoFeatures = liveData.reco.recommended.features ?? [];

  const rainPct = liveData.profile.weather_exposure.rain_percentage;
  // `null` = météo indisponible : on affiche "Données insuffisantes" comme les
  // chips terrain/style, au lieu d'un trompeur 0% humide / 100% sèche.
  const hasWeather = rainPct != null;
  const dryPct = hasWeather ? Math.round(100 - rainPct) : 0;

  const profileTags = [
    { id: "terrain", Icon: Mountain, label: liveData.profile.terrain_label },
    { id: "style", Icon: Zap, label: liveData.profile.style_label },
    {
      id: "wet",
      Icon: Droplets,
      label: hasWeather ? `${rainPct}% humide` : "Données insuffisantes",
    },
    {
      id: "dry",
      Icon: Sun,
      label: hasWeather ? `${dryPct}% sèche` : "Données insuffisantes",
    },
  ];

  return (
    <div className="min-h-full">
      {/* Hero dark */}
      <div className="bg-[#00205B] px-4 pt-5 pb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FCE500] flex items-center justify-center font-bold text-[#00205B] text-lg flex-shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {name}
              </h2>
              <p className="text-white/60 text-xs flex items-center gap-1 mt-0.5">
                <MapPin size={10} />
                {location}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!liveData.isDemo && (
              <button
                type="button"
                onClick={() => loadLiveData(true)}
                disabled={loading}
                aria-label="Rafraîchir les données"
                title="Rafraîchir les données"
                className="text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 fill-[#FC4C02]"
                aria-hidden="true"
              >
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              <span className="text-[#FC4C02] font-semibold text-sm">
                Strava
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              Icon: Calendar,
              value: String(totalRides),
              unit: "sorties au total",
            },
            { Icon: Bike, value: `${liveData.profile.monthly_distance }km`, unit: "Distance ce mois" },
            {
              Icon: TrendingUp,
              value: `${monthlyElevation}m`,
              unit: "Dénivelé positif ce mois",
            },
          ].map(({ Icon, value, unit }) => (
            <div key={unit} className="bg-white/10 rounded-2xl p-3">
              <Icon size={14} className="text-white/50 mb-2" />
              <div className="text-white font-bold text-2xl leading-none font-mono">
                {value}
              </div>
              <div className="text-white/50 text-[11px] mt-1">{unit}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Profil tags */}
        <div>
          <p className="text-gray-400 text-[10px] font-bold tracking-[0.18em] uppercase mb-3">
            Votre profil
          </p>
          <div className="flex flex-wrap gap-2">
            {profileTags.map(({ id, Icon, label }) => (
              <div
                key={id}
                className="flex items-center gap-1.5 border border-gray-200 rounded-full px-3 py-1.5 bg-white"
              >
                <Icon size={12} className="text-[#27509B]" />
                <span className="text-[#27509B] text-sm font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Carte recommandation */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
          <div className="bg-[#00205B] px-4 py-3 flex items-center gap-2">
            <Award size={14} className="text-[#FCE500]" />
            <span className="text-white text-[11px] font-bold tracking-[0.14em] uppercase">
              Recommandé pour votre profil
            </span>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-14 h-14 bg-[#27509B] rounded-xl flex items-center justify-center flex-shrink-0">
                <Target size={26} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-[#FC4C02] uppercase tracking-wider">
                  Gamme Premium
                </p>
                <h3 className="font-bold text-lg leading-tight text-gray-900">
                  {recoModel}
                </h3>
                <p className="text-[#27509B] text-sm leading-snug mt-0.5">
                  {recoDesc}
                </p>
              </div>
            </div>
            <div className="space-y-2.5 mb-5">
              {recoFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle
                    size={16}
                    className="text-[#27509B] flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowStores((v) => !v)}
              className="w-full bg-[#FCE500] hover:bg-[#FDED44] text-black font-bold py-3.5 rounded-full text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {showStores
                ? "Masquer les points de vente"
                : "Trouver ce pneu près de chez moi"}
              <ArrowRight
                size={15}
                className={`transition-transform ${showStores ? "rotate-90" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Section magasins (toggle) */}
        {showStores && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <StoreSection />
          </div>
        )}

        {/* Cyclistes similaires */}
        <div>
          <p className="text-gray-400 text-[10px] font-bold tracking-[0.18em] uppercase mb-3">
            Cyclistes au profil similaire
          </p>
          <div className="space-y-3">
            {(peers ?? []).map((p, i) => {
              const peerInitials = p.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div
                  key={i}
                  className="bg-white border border-gray-200 rounded-2xl p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm flex-shrink-0">
                      {peerInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-gray-900 text-base leading-tight">
                          {p.name}
                        </p>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <StarRating rating={p.rating} />
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {p.date}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} />
                        {p.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 bg-[#00205B] text-white text-xs font-semibold px-3 py-1 rounded-full">
                      <TrendingUp size={10} />
                      Avis après {p.km.toLocaleString("fr-FR")} km
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                      <Bike size={10} />
                      {p.totalKm.toLocaleString("fr-FR")} km au total
                    </span>
                  </div>
                  <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#27509B] mb-2">
                    {p.tire}
                  </p>
                  <p className="text-sm text-gray-700 italic leading-relaxed">
                    &ldquo;{p.review}&rdquo;
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
