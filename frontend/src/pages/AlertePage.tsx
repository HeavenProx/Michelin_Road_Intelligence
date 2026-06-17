import { useState } from "react";
import { AlertTriangle, Bell, CheckCircle, ChevronRight, Star, X } from "lucide-react";
import { StoreSection } from "@/components/StoreSection";
import { ReviewModal } from "@/components/ReviewModal";
import { useApp } from "@/context/AppContext";
import { useAlerts } from "@/hooks/useAlerts";

export function AlertePage() {
  const { wearAlerts, dismissWearAlert } = useApp();
  const { data: alertsData } = useAlerts();

  const [expandedIdx, setExpandedIdx]         = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTire, setReviewTire]           = useState("");

  const activeWearAlerts = wearAlerts.filter((a) => !a.dismissed);
  const alerts           = alertsData?.alerts   ?? [];
  const reminders        = alertsData?.reminders ?? [];

  function openReview(tire: string) {
    setReviewTire(tire);
    setShowReviewModal(true);
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertes</h1>
        <p className="text-sm text-gray-400 mt-0.5">Usure &amp; rappels avis</p>
      </div>

      {/* ── Nouvelles alertes d'usure (live depuis le Tyre Score) ── */}
      {activeWearAlerts.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-3 flex items-center gap-1.5">
            <Bell size={11} className="text-red-500" />
            Nouvelles alertes
          </p>
          <div className="space-y-3">
            {activeWearAlerts.map((alert) => {
              const key      = `live-${alert.id}`;
              const expanded = expandedIdx === key;
              return (
                <div key={alert.id} className="bg-white border border-red-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-4">
                    <button
                      onClick={() => setExpandedIdx(expanded ? null : key)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={16} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-gray-900">{alert.tire}</p>
                          <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full tracking-wide uppercase">
                            Nouveau
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Usure <span className="text-red-500 font-semibold">{alert.wear}%</span>
                          {" · "}{alert.date}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className={`text-gray-400 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
                      />
                    </button>
                    <button
                      onClick={() => dismissWearAlert(alert.id)}
                      title="Marquer comme lu"
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {expanded && (
                    <div className="border-t border-gray-100">
                      <div className="px-4 py-3 bg-red-50">
                        <p className="text-xs text-red-700 leading-relaxed">
                          Votre pneu <strong>{alert.tire}</strong> est à <strong>{alert.wear}%</strong> d&apos;usure.
                          Un email de rappel a été envoyé. Retrouvez un point de vente ci-dessous.
                        </p>
                      </div>
                      <StoreSection />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Historique d'alertes ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-3">
          {activeWearAlerts.length > 0 ? "Historique" : "Alertes d’usure"}
        </p>
        <div className="space-y-3">
          {alerts.map((alert, i) => {
            const key      = `demo-${i}`;
            const expanded = expandedIdx === key;
            return (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedIdx(expanded ? null : key)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">{alert.tire}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Usure <span className="text-red-500 font-semibold">{alert.wear}%</span>
                      {" · "}{alert.date}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-gray-400 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
                  />
                </button>

                {expanded && (
                  <div className="border-t border-gray-100">
                    <StoreSection />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Rappels avis ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-3">Rappels avis</p>
        <div className="space-y-3">
          {reminders.map((r, i) => (
            <div
              key={i}
              className={`rounded-2xl p-4 flex items-start gap-3 border ${r.done ? "bg-white border-gray-200" : "bg-[#FCE500]/10 border-[#FCE500]/60"}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${r.done ? "bg-green-50" : "bg-amber-50"}`}>
                {r.done
                  ? <CheckCircle size={16} className="text-green-500" />
                  : <Star size={16} className="text-amber-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${r.done ? "text-gray-700" : "text-gray-900"}`}>
                  {r.threshold.toLocaleString("fr-FR")} km atteints
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{r.tire} · {r.date}</p>
                {r.done ? (
                  <p className="text-xs text-green-600 font-semibold mt-2">Avis déposé ✓</p>
                ) : (
                  <button
                    onClick={() => openReview(r.tire)}
                    className="mt-2 text-[#27509B] font-semibold text-xs flex items-center gap-1 hover:underline"
                  >
                    Laisser un avis <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ReviewModal open={showReviewModal} onClose={() => setShowReviewModal(false)} tireName={reviewTire} />
    </div>
  );
}
