import { useState } from "react";
import { AlertTriangle, ChevronRight, CheckCircle, Star } from "lucide-react";
import { StoreSection } from "@/components/StoreSection";
import { ReviewModal } from "@/components/ReviewModal";
import { ALERTS, REVIEW_REMINDERS } from "@/data/demo";

export function AlertePage() {
  const [expandedIdx, setExpandedIdx]         = useState<number | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTire, setReviewTire]           = useState("");

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

      {/* ── Section usure ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-3">Alertes d&apos;usure</p>
        <div className="space-y-3">
          {ALERTS.map((alert, i) => {
            const expanded = expandedIdx === i;
            return (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedIdx(expanded ? null : i)}
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
                    <StoreSection filterId={`ashadow${i}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section rappels avis ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-3">Rappels avis</p>
        <div className="space-y-3">
          {REVIEW_REMINDERS.map((r, i) => (
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
