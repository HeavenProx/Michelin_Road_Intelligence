import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, CalendarDays, Loader2, Search } from "lucide-react";
import type { TyreModelOption } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  bikeId: number;
  bikeName: string;
  bikeType: string;
  position: "FRONT" | "REAR";
  existingTyreId?: number;
  onSuccess: () => void;
}

export function TyrePicker({
  open, onClose, bikeId, bikeName, bikeType, position, existingTyreId, onSuccess,
}: Props) {
  const [models, setModels]           = useState<TyreModelOption[]>([]);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<TyreModelOption | null>(null);
  const [mountedDate, setMountedDate] = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setSearch("");
    setError("");
    setMountedDate(new Date().toISOString().slice(0, 10));
    setLoading(true);
    fetch(`/api/tyres?bikeType=${bikeType}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setModels(data); })
      .catch(() => setError("Impossible de charger le catalogue."))
      .finally(() => setLoading(false));
  }, [open, bikeType]);

  if (!open) return null;

  const posLabel = position === "FRONT" ? "Avant" : "Arrière";

  const filtered = search.trim()
    ? models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : models;

  async function handleSave() {
    if (!selected || !mountedDate) return;
    setSaving(true);
    setError("");
    try {
      const url    = existingTyreId ? `/api/garage/tyres/${existingTyreId}/replace` : "/api/garage/tyres";
      const method = existingTyreId ? "POST" : "PUT";
      const body   = existingTyreId
        ? { modelGlobalId: selected.globalId, mountedDate }
        : { bikeId, position, modelGlobalId: selected.globalId, mountedDate };

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        setError("session_expired");
        return;
      }
      if (!res.ok) throw new Error();
      onSuccess();
      onClose();
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-3xl px-5 pt-4 pb-6 mb-16 flex flex-col max-h-[calc(85vh-4rem)]">

        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">
              {bikeName} · Pneu {posLabel}
            </p>
            <h2 className="font-bold text-xl text-gray-900 mt-0.5">
              {existingTyreId ? "Changer de pneu" : "Ajouter un pneu"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0 ml-3"
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Recherche */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5 mb-3 flex-shrink-0">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Rechercher un modèle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Liste — scrollable */}
        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={22} className="text-[#27509B] animate-spin" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              {search ? `Aucun résultat pour « ${search} »` : "Aucun modèle disponible."}
            </p>
          )}

          {!loading && filtered.map((model) => {
            const isSelected = selected?.globalId === model.globalId;
            return (
              <button
                key={model.globalId}
                onClick={() => { setSelected(model); setError(""); }}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? "border-[#00205B] bg-[#00205B]/5"
                    : "border-gray-200 bg-white hover:border-[#00205B]/30 hover:bg-gray-50"
                }`}
              >
                <p className={`font-semibold text-sm ${isSelected ? "text-[#00205B]" : "text-gray-900"}`}>
                  {model.name}
                </p>
                {isSelected && <CheckCircle2 size={16} className="text-[#00205B] flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Date + CTA */}
        <div className="pt-4 space-y-3 flex-shrink-0">
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <CalendarDays size={15} className="text-gray-400 flex-shrink-0" />
            <label className="text-sm text-gray-600 flex-shrink-0">Date de pose</label>
            <input
              type="date"
              value={mountedDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setMountedDate(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none min-w-0 text-right"
            />
          </div>

          {error === "session_expired" ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
              <p className="text-sm font-semibold text-amber-800 mb-1">Session expirée</p>
              <p className="text-xs text-amber-700 mb-2">Votre connexion Strava a expiré.</p>
              <a
                href="/auth/strava"
                className="text-xs font-bold text-[#00205B] underline underline-offset-2"
              >
                Se reconnecter →
              </a>
            </div>
          ) : error ? (
            <p className="text-xs text-red-600 text-center">{error}</p>
          ) : null}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!selected || !mountedDate || saving}
              className="flex-1 bg-[#00205B] text-white font-semibold py-3 rounded-xl text-sm hover:bg-[#27509B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Enregistrement…</>
                : "Monter ce pneu"
              }
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body,
  );
}
