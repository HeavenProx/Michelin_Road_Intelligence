import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { ArrowRight, CheckCircle, ChevronRight, AlertTriangle, Star } from "lucide-react";
import { GaugeWear } from "@/components/GaugeWear";
import { StoreSection } from "@/components/StoreSection";
import { ReviewModal } from "@/components/ReviewModal";
import { useTyres } from "@/hooks/useTyres";

export function GaragePage() {
  const { triggerWearAlert } = useApp();
  const { data: tireModels, isLoading } = useTyres();
  const [selectedIdx, setSelectedIdx]         = useState(0);
  const [dateInput, setDateInput]             = useState("2025-08-15");
  const [open, setOpen]                       = useState(false);
  const [query, setQuery]                     = useState("");
  const [showStores, setShowStores]           = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Calculé avant l'early return pour pouvoir être utilisé dans useEffect
  const model    = tireModels?.[selectedIdx];
  const kmUsed   = 3177;
  const kmMax    = model?.km_max ?? 0;
  const wear     = kmMax > 0 ? Math.min(100, Math.round((kmUsed / kmMax) * 100)) : 0;
  const critical = wear >= 80;

  useEffect(() => {
    if (model && critical) triggerWearAlert(model.name, wear);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [critical, model?.name]);

  if (isLoading || !tireModels || !model) {
    return (
      <div className="px-4 py-5 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon pneu</h1>
          <p className="text-sm text-gray-400 mt-0.5">Chargement du catalogue…</p>
        </div>
      </div>
    );
  }

  const kmLeft      = Math.max(0, kmMax - kmUsed);
  const cardBg      = critical ? "bg-red-50"    : wear >= 55 ? "bg-amber-50"    : "bg-green-50";
  const statusText  = critical ? "À remplacer"  : wear >= 55 ? "À surveiller"   : "Bon état";
  const statusColor = critical ? "text-red-600" : wear >= 55 ? "text-amber-600" : "text-green-700";

  const filtered = tireModels.filter((m) =>
    (m.name + m.category).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon pneu</h1>
        <p className="text-sm text-gray-400 mt-0.5">Suivez l&apos;usure en temps réel</p>
      </div>

      {/* Sélecteur modèle */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">Modèle</p>
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className={`w-full bg-white border rounded-2xl px-4 py-3.5 flex items-center justify-between text-left transition-colors ${open ? "border-[#27509B]" : "border-gray-200"}`}
          >
            <div>
              <p className="font-bold text-gray-900 text-sm">{model.name}</p>
              <p className="text-xs text-gray-400">{model.category}</p>
            </div>
            <ChevronRight size={18} className={`text-gray-400 transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
          </button>

          {open && (
            <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-2xl mt-1 shadow-xl overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    autoFocus
                    className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                    placeholder="Rechercher un modèle..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                {filtered.map((m) => {
                  const idx = tireModels.indexOf(m);
                  return (
                    <button
                      key={m.name}
                      onClick={() => { setSelectedIdx(idx); setOpen(false); setQuery(""); }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.category}</p>
                      </div>
                      {idx === selectedIdx && <CheckCircle size={18} className="text-[#27509B] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date de pose */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">Date de pose</p>
        <input
          type="date"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-sm outline-none focus:border-[#27509B] transition-colors"
        />
      </div>

      {/* Tyre Score */}
      <div className={`${cardBg} rounded-2xl p-5`}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 text-center mb-3">Tyre Score</p>
        <GaugeWear percent={wear} />
        <p className={`text-center font-bold text-sm mt-1 ${statusColor}`}>{statusText}</p>
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-black/8 text-center">
          {[
            { val: kmUsed.toLocaleString("fr-FR"), label: "km utilisés",  accent: false },
            { val: kmLeft.toLocaleString("fr-FR"), label: "km restants",  accent: critical },
            { val: kmMax.toLocaleString("fr-FR"),  label: "km max*",      accent: false },
          ].map(({ val, label, accent }) => (
            <div key={label}>
              <p className={`font-bold font-mono text-xl ${accent ? "text-red-600" : "text-gray-900"}`}>{val}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-2">* Ajusté selon votre terrain de prédilection</p>
      </div>

      {/* Alerte critique */}
      {critical && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm mb-1">Remplacement recommandé</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Votre pneu est à {wear}% d&apos;usure. Pensez à le remplacer pour maintenir vos performances et votre sécurité.
            </p>
          </div>
        </div>
      )}

      {/* CTA magasins */}
      <button
        onClick={() => setShowStores((v) => !v)}
        className="w-full bg-[#FCE500] hover:bg-[#FDED44] text-black font-bold py-4 rounded-full text-sm flex items-center justify-center gap-2 transition-colors"
      >
        {showStores ? "Masquer les points de vente" : "Trouver un remplacement"}
        <ArrowRight size={16} className={`transition-transform ${showStores ? "rotate-90" : ""}`} />
      </button>

      {/* Section magasins */}
      {showStores && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <StoreSection />
        </div>
      )}

      {/* Partage avis */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Star size={15} className="text-[#27509B]" />
          <p className="font-bold text-sm text-[#00205B]">Partagez votre expérience</p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          {kmUsed.toLocaleString("fr-FR")} km parcourus avec ce pneu — votre avis aide la communauté.
        </p>
        <button onClick={() => setShowReviewModal(true)} className="text-[#27509B] font-semibold text-sm flex items-center gap-1">
          Laisser un avis <ChevronRight size={14} />
        </button>
      </div>

      <ReviewModal open={showReviewModal} onClose={() => setShowReviewModal(false)} tireName={model.name} />
    </div>
  );
}
