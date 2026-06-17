import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  ArrowRight, AlertTriangle, Star, ChevronRight,
  Bike, CircleDot, CalendarDays, CheckCircle, RefreshCw, Plus,
} from "lucide-react";
import { GaugeWear } from "@/components/GaugeWear";
import { StoreSection } from "@/components/StoreSection";
import { ReviewModal } from "@/components/ReviewModal";
import { TyrePicker } from "@/components/TyrePicker";
import type { GarageBike, GarageTyre, GarageData } from "@/types";

const BIKE_TYPE_LABEL: Record<string, string> = {
  ROAD:     "Route",
  GRAVEL:   "Gravel",
  MTB:      "VTT",
  "E-BIKE": "E-Bike",
};

const REVIEW_MILESTONES = [500, 1_000, 2_000, 3_500];

function reviewedKey(tireName: string, milestone: number) {
  return `michelin_reviewed_${tireName}_${milestone}`;
}

function hasReviewedMilestone(tireName: string, milestone: number): boolean {
  try { return localStorage.getItem(reviewedKey(tireName, milestone)) === "true"; }
  catch { return false; }
}

function markMilestoneReviewed(tireName: string, milestone: number) {
  try { localStorage.setItem(reviewedKey(tireName, milestone), "true"); } catch {}
}

function wearColors(wear: number) {
  if (wear >= 80) return { bg: "bg-red-50",   text: "text-red-600",   border: "border-red-100"   };
  if (wear >= 55) return { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" };
  return              { bg: "bg-green-50",  text: "text-green-700", border: "border-green-100" };
}

interface TyreCardProps {
  tyre: GarageTyre;
  onDateChange: (tyreId: number, date: string) => void;
  onReplace?: () => void;
}

function TyreCard({ tyre, onDateChange, onReplace }: TyreCardProps) {
  const c = wearColors(tyre.wear_percent);
  const posLabel = tyre.position === "FRONT" ? "Avant" : "Arrière";

  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">{posLabel}</span>
          <p className="font-bold text-gray-900 text-sm mt-0.5">{tyre.model.name}</p>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${c.text} ${c.border} bg-white flex-shrink-0`}>
          {tyre.status_label}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={13} className="text-gray-400 flex-shrink-0" />
        <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400">Posé le</span>
        <input
          type="date"
          defaultValue={tyre.mounted_date}
          onBlur={(e) => {
            if (e.target.value && e.target.value !== tyre.mounted_date) {
              onDateChange(tyre.id, e.target.value);
            }
          }}
          className="flex-1 bg-white/70 border border-black/10 rounded-lg px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#27509B]/40 transition-colors"
        />
      </div>

      <GaugeWear percent={tyre.wear_percent} />

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-black/8 text-center">
        {[
          { val: tyre.km_used.toLocaleString("fr-FR"),         label: "km utilisés", accent: false                   },
          { val: tyre.km_left.toLocaleString("fr-FR"),         label: "km restants", accent: tyre.wear_percent >= 80 },
          { val: tyre.km_max_adjusted.toLocaleString("fr-FR"), label: "km max*",     accent: false                   },
        ].map(({ val, label, accent }) => (
          <div key={label}>
            <p className={`font-bold font-mono text-xl ${accent ? "text-red-600" : "text-gray-900"}`}>{val}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-2">* Ajusté selon votre terrain de prédilection</p>

      {tyre.explanation && (
        <p className="text-xs text-gray-500 leading-relaxed mt-3 pt-3 border-t border-black/8">
          {tyre.explanation}
        </p>
      )}

      {onReplace && (
        <button
          onClick={onReplace}
          className="mt-3 pt-3 border-t border-black/8 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#27509B] hover:text-[#00205B] transition-colors"
        >
          <RefreshCw size={11} />
          Changer de pneu
        </button>
      )}
    </div>
  );
}

interface EmptyTyreSlotProps {
  position: "FRONT" | "REAR";
  onAdd?: () => void;
}

function EmptyTyreSlot({ position, onAdd }: EmptyTyreSlotProps) {
  const posLabel = position === "FRONT" ? "Avant" : "Arrière";
  return (
    <button
      onClick={onAdd}
      disabled={!onAdd}
      className={`w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-center transition-all ${
        onAdd
          ? "hover:border-[#00205B]/40 hover:bg-[#00205B]/5 cursor-pointer"
          : "cursor-default"
      }`}
    >
      {onAdd
        ? <Plus size={24} className="text-[#27509B]" />
        : <CircleDot size={28} className="text-gray-300" />
      }
      <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400">{posLabel}</p>
      <p className="text-xs text-gray-400">{onAdd ? "Ajouter un pneu Michelin" : "Aucun pneu enregistré"}</p>
      {onAdd && (
        <span className="text-xs font-bold text-[#27509B] mt-1">Choisir un modèle →</span>
      )}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-4 py-5 space-y-5">
      <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse" />
      <div className="flex gap-2">
        <div className="h-10 w-40 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-10 w-36 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
      <div className="h-16 bg-gray-200 rounded-2xl animate-pulse" />
      <div className="h-72 bg-gray-200 rounded-2xl animate-pulse" />
      <div className="h-72 bg-gray-200 rounded-2xl animate-pulse" />
    </div>
  );
}

interface PickerState {
  open: boolean;
  bikeId: number;
  bikeName: string;
  bikeType: string;
  position: "FRONT" | "REAR";
  existingTyreId?: number;
}

const PICKER_CLOSED: PickerState = {
  open: false, bikeId: 0, bikeName: "", bikeType: "ROAD", position: "FRONT",
};

export function GaragePage() {
  const { liveData, triggerWearAlert } = useApp();

  const [garage, setGarage]               = useState<GarageData | null>(null);
  const [garageLoading, setGarageLoading] = useState(true);
  const [activeBikeIdx, setActiveBikeIdx] = useState(0);
  const [showStores, setShowStores]       = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDone, setReviewDone]       = useState(false);
  const [picker, setPicker]               = useState<PickerState>(PICKER_CLOSED);

  const isDemo = liveData?.isDemo ?? false;

  const loadGarage = useCallback(() => {
    const url = isDemo ? "/api/garage/demo" : "/api/garage";
    setGarageLoading(true);
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (data.success) setGarage(data as GarageData); })
      .catch(() => {})
      .finally(() => setGarageLoading(false));
  }, [isDemo]);

  useEffect(() => { loadGarage(); }, [loadGarage]);

  useEffect(() => {
    if (!garage) return;
    for (const bike of garage.bikes) {
      for (const tyre of bike.tyres) {
        if (tyre.wear_percent >= 80) {
          triggerWearAlert(`${tyre.model.name} (${bike.name})`, tyre.wear_percent);
        }
      }
    }
  }, [garage, triggerWearAlert]);

  useEffect(() => { setReviewDone(false); }, [activeBikeIdx]);

  function handleDateChange(tyreId: number, date: string) {
    setGarage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bikes: prev.bikes.map((bike) => ({
          ...bike,
          tyres: bike.tyres.map((t) =>
            t.id === tyreId ? { ...t, mounted_date: date } : t
          ),
        })),
      };
    });
    if (!isDemo) {
      fetch(`/api/garage/tyres/${tyreId}/date`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mountedDate: date }),
      }).catch(() => {});
    }
  }

  function openPicker(
    bike: GarageBike,
    position: "FRONT" | "REAR",
    existingTyreId?: number,
  ) {
    setPicker({
      open: true,
      bikeId: bike.id,
      bikeName: bike.name,
      bikeType: bike.type,
      position,
      existingTyreId,
    });
  }

  function handlePickerSuccess() {
    loadGarage();
  }

  if (garageLoading) return <LoadingSkeleton />;

  const bikes: GarageBike[] = garage?.bikes ?? [];
  const activeBike = bikes[activeBikeIdx] ?? null;
  const frontTyre  = activeBike?.tyres.find((t) => t.position === "FRONT") ?? null;
  const rearTyre   = activeBike?.tyres.find((t) => t.position === "REAR")  ?? null;

  const hasCritical      = activeBike?.tyres.some((t) => t.wear_percent >= 80) ?? false;
  const needsReplacement = activeBike?.tyres.some((t) => t.wear_percent >= 55) ?? false;

  const tyresWithKm  = [frontTyre, rearTyre].filter((t): t is GarageTyre => t !== null);
  const bestTyre     = tyresWithKm.sort((a, b) => b.km_used - a.km_used)[0] ?? null;
  const kmForReview  = bestTyre?.km_used ?? 0;

  const currentMilestone = [...REVIEW_MILESTONES].reverse().find((m) => m <= kmForReview);
  const nextMilestone    = REVIEW_MILESTONES.find((m) => m > kmForReview);
  const canReview        = currentMilestone !== undefined;
  const alreadyReviewed  = canReview && bestTyre
    ? hasReviewedMilestone(bestTyre.model.name, currentMilestone!)
    : false;

  function handleReviewSubmitted() {
    if (bestTyre && currentMilestone !== undefined) {
      markMilestoneReviewed(bestTyre.model.name, currentMilestone);
    }
    setReviewDone(true);
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes pneus</h1>
        <p className="text-sm text-gray-400 mt-0.5">Suivez l&apos;usure en temps réel</p>
      </div>

      {bikes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Bike size={32} className="text-gray-300" />
          </div>
          <div>
            <p className="font-bold text-gray-900 mb-1">Aucun vélo trouvé</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Synchronisez votre compte Strava pour importer vos vélos et suivre l&apos;usure de vos pneus.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Tabs vélos ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {bikes.map((bike, idx) => (
              <button
                key={bike.id}
                onClick={() => { setActiveBikeIdx(idx); setShowStores(false); }}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all ${
                  idx === activeBikeIdx
                    ? "bg-[#00205B] border-[#00205B] text-white shadow-md"
                    : "bg-white border-gray-200 text-gray-600 hover:border-[#00205B]/40"
                }`}
              >
                <Bike size={14} />
                <span className="max-w-[120px] truncate">{bike.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                  idx === activeBikeIdx ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {BIKE_TYPE_LABEL[bike.type] ?? bike.type}
                </span>
              </button>
            ))}
          </div>

          {/* ── Récap vélo actif ── */}
          {activeBike && (
            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-[#00205B]/8 flex items-center justify-center flex-shrink-0">
                <Bike size={17} className="text-[#00205B]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{activeBike.name}</p>
                <p className="text-xs text-gray-400">
                  {activeBike.strava_distance_km.toLocaleString("fr-FR")} km au compteur Strava
                </p>
              </div>
              <span className="text-xs font-bold text-[#27509B] bg-[#27509B]/10 px-2.5 py-1 rounded-full flex-shrink-0">
                {BIKE_TYPE_LABEL[activeBike.type] ?? activeBike.type}
              </span>
            </div>
          )}

          {/* ── Pneus avant / arrière ── */}
          <div className="space-y-4">
            {frontTyre ? (
              <TyreCard
                tyre={frontTyre}
                onDateChange={handleDateChange}
                onReplace={!isDemo && activeBike ? () => openPicker(activeBike, "FRONT", frontTyre.id) : undefined}
              />
            ) : (
              <EmptyTyreSlot
                position="FRONT"
                onAdd={!isDemo && activeBike ? () => openPicker(activeBike, "FRONT") : undefined}
              />
            )}
            {rearTyre ? (
              <TyreCard
                tyre={rearTyre}
                onDateChange={handleDateChange}
                onReplace={!isDemo && activeBike ? () => openPicker(activeBike, "REAR", rearTyre.id) : undefined}
              />
            ) : (
              <EmptyTyreSlot
                position="REAR"
                onAdd={!isDemo && activeBike ? () => openPicker(activeBike, "REAR") : undefined}
              />
            )}
          </div>

          {/* ── Alerte critique ── */}
          {hasCritical && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 text-sm mb-1">Remplacement recommandé</p>
                <p className="text-amber-700 text-xs leading-relaxed">
                  Un ou plusieurs pneus de ce vélo atteignent leur seuil critique. Planifiez un remplacement pour maintenir vos performances et votre sécurité.
                </p>
              </div>
            </div>
          )}

          {/* ── CTA magasins — visible seulement si usure ≥ 55 % ── */}
          {needsReplacement && (
            <>
              <button
                onClick={() => setShowStores((v) => !v)}
                className="w-full bg-[#FCE500] hover:bg-[#FDED44] text-black font-bold py-4 rounded-full text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {showStores ? "Masquer les points de vente" : "Trouver un remplacement"}
                <ArrowRight size={16} className={`transition-transform ${showStores ? "rotate-90" : ""}`} />
              </button>
              {showStores && (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <StoreSection />
                </div>
              )}
            </>
          )}

          {/* ── Invitation à laisser un avis ── */}
          {bestTyre && (
            canReview ? (
              alreadyReviewed || reviewDone ? (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
                  <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-green-800 text-sm">
                      Avis envoyé — palier {currentMilestone!.toLocaleString("fr-FR")} km
                    </p>
                    {nextMilestone && (
                      <p className="text-xs text-green-700 mt-0.5">
                        Prochain palier dans {(nextMilestone - kmForReview).toLocaleString("fr-FR")} km.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Star size={15} className="text-[#27509B]" />
                    <p className="font-bold text-sm text-[#00205B]">Palier {currentMilestone!.toLocaleString("fr-FR")} km atteint !</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    Vous avez parcouru <span className="font-semibold">{kmForReview.toLocaleString("fr-FR")} km</span> avec le{" "}
                    <span className="font-medium">{bestTyre.model.name}</span>. Votre retour d&apos;expérience aide la communauté à choisir.
                  </p>
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="text-[#27509B] font-semibold text-sm flex items-center gap-1"
                  >
                    Laisser un avis <ChevronRight size={14} />
                  </button>
                </div>
              )
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vers votre premier avis</p>
                  <span className="text-xs font-bold text-gray-400">
                    {kmForReview.toLocaleString("fr-FR")} / {REVIEW_MILESTONES[0].toLocaleString("fr-FR")} km
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-[#27509B] h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (kmForReview / REVIEW_MILESTONES[0]) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  Encore {(REVIEW_MILESTONES[0] - kmForReview).toLocaleString("fr-FR")} km avant de pouvoir laisser un avis.
                </p>
              </div>
            )
          )}
        </>
      )}

      <ReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        tireName={bestTyre?.model.name ?? ""}
        onSubmitted={handleReviewSubmitted}
      />

      <TyrePicker
        open={picker.open}
        onClose={() => setPicker(PICKER_CLOSED)}
        bikeId={picker.bikeId}
        bikeName={picker.bikeName}
        bikeType={picker.bikeType}
        position={picker.position}
        existingTyreId={picker.existingTyreId}
        onSuccess={handlePickerSuccess}
      />
    </div>
  );
}
