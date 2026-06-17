import { useState } from "react";
import { Star, CheckCircle } from "lucide-react";

export function ReviewModal({
  open,
  onClose,
  tireName,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  tireName: string;
  onSubmitted?: () => void;
}) {
  const [rating, setRating]     = useState(0);
  const [hover, setHover]       = useState(0);
  const [criteria, setCriteria] = useState({ grip: 0, durabilite: 0, confort: 0, anticrv: 0 });
  const [comment, setComment]   = useState("");
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");

  if (!open) return null;

  async function submit() {
    if (!rating) return;
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tire: tireName,
          rating,
          grip: criteria.grip,
          durabilite: criteria.durabilite,
          confort: criteria.confort,
          anticrv: criteria.anticrv,
          comment,
        }),
      });
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Connectez-vous via Strava pour publier votre avis."
            : "Une erreur est survenue. Réessayez.",
        );
        return;
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      return;
    }
    onSubmitted?.();
    setDone(true);
    setTimeout(() => {
      onClose();
      setDone(false);
      setRating(0);
      setCriteria({ grip: 0, durabilite: 0, confort: 0, anticrv: 0 });
      setComment("");
      setError("");
    }, 1800);
  }

  const critLabels: { key: keyof typeof criteria; label: string }[] = [
    { key: "grip",       label: "Grip" },
    { key: "durabilite", label: "Durabilité" },
    { key: "confort",    label: "Confort" },
    { key: "anticrv",   label: "Anti-crevaison" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl px-5 pt-5 pb-6 mb-16 max-h-[calc(85vh-4rem)] overflow-y-scroll">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        {done ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle size={48} className="text-green-500" />
            <p className="font-bold text-lg text-gray-900">Merci pour votre avis !</p>
            <p className="text-sm text-gray-400 text-center">Votre retour aide la communauté Michelin.</p>
          </div>
        ) : (
          <>
            <h2 className="font-bold text-xl text-gray-900 mb-0.5">Votre avis</h2>
            <p className="text-sm text-gray-400 mb-5">{tireName}</p>

            <div className="mb-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Note globale</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => setRating(i)} className="p-1">
                    <Star size={32} className={i <= (hover || rating) ? "fill-[#FCE500] text-[#FCE500]" : "fill-gray-200 text-gray-200"} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Critères détaillés</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {critLabels.map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-sm text-gray-700 mb-1.5">{label}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button key={i} onClick={() => setCriteria((c) => ({ ...c, [key]: i }))} className="p-0.5">
                          <Star size={22} className={i <= criteria[key] ? "fill-[#27509B] text-[#27509B]" : "fill-gray-200 text-gray-200"} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Commentaire</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience avec ce pneu..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none outline-none focus:border-[#27509B] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={submit} disabled={rating === 0} className="flex-1 bg-[#00205B] text-white font-semibold py-3 rounded-xl text-sm hover:bg-[#27509B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Publier
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
