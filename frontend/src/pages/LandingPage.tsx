import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2, Activity, Gauge, ShieldCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function LandingPage() {
  const { connectStrava, loadDemoData, authStatus } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Nettoie le paramètre `?auth=...` laissé par le callback OAuth.
  // La réhydratation de session (bootstrap dans AppContext) détecte la connexion ;
  // on n'a plus besoin de relancer le chargement ici.
  useEffect(() => {
    if (searchParams.get("auth")) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  // Dès qu'une session valide est confirmée, on bascule sur le dashboard.
  useEffect(() => {
    if (authStatus === "authed") {
      navigate("/profil", { replace: true });
    }
  }, [authStatus, navigate]);

  async function handleLoadDemo() {
    await loadDemoData();
    navigate("/profil");
  }

  // Pendant la vérification de session, on évite de flasher la landing.
  if (authStatus === "checking") {
    return (
      <div className="min-h-screen bg-[#00205B] flex items-center justify-center">
        <Loader2 size={32} className="text-[#FCE500] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#00205B] flex flex-col items-center justify-center font-sans overflow-hidden relative px-6 py-6 sm:py-8">
      {/* Cercles décoratifs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full w-[220px] h-[220px] md:w-[600px] md:h-[600px] -left-[110px] md:-left-[300px] blur-md"
             style={{ top: "38%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.05)" }} />
        <div className="absolute rounded-full w-[320px] h-[320px] md:w-[820px] md:h-[820px] -left-[160px] md:-left-[410px] blur-md"
             style={{ top: "38%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.05)" }} />
        <div className="absolute rounded-full w-[220px] h-[220px] md:w-[600px] md:h-[600px] -right-[110px] md:-right-[300px] blur-md"
             style={{ top: "62%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.05)" }} />
        <div className="absolute rounded-full w-[320px] h-[320px] md:w-[820px] md:h-[820px] -right-[160px] md:-right-[410px] blur-md"
             style={{ top: "62%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.05)" }} />
      </div>

      {/* Logo Michelin + titre appli */}
      <div className="relative z-10 mb-5 sm:mb-6 flex flex-col items-center gap-2 sm:gap-2.5">
        <img src="/michelin-logo-white.png" alt="Michelin" className="w-35 sm:w-40" />
        <span className="text-white/55 text-[10px] sm:text-[11px] tracking-[0.28em] uppercase font-semibold">
          Road Intelligence
        </span>
      </div>

      {/* Hero text */}
      <div className="relative z-10 text-center mb-5 sm:mb-6">
        <h1 className="text-white font-extrabold text-[2.05rem] sm:text-[2rem] leading-[1.16] mb-3 sm:mb-4">
          Vos sorties.<br />
          Votre terrain.<br />
          Votre pneu Michelin.
        </h1>
        <p className="text-white/70 text-[14px] sm:text-[15px] leading-relaxed mx-auto max-w-[23rem]">
          Chaque sortie en dit long sur vos pneus. À partir de vos données Strava,
          on vous guide vers le pneu Michelin fait pour vous — et on veille à le
          changer au bon moment.
        </p>
      </div>

      {/* Comment ça marche — crédibilise la reco */}
      <div className="relative z-10 w-full max-w-sm mb-5 sm:mb-6 grid grid-cols-3 gap-2">
        {[
          { icon: Activity, title: "On vous lit", desc: "Vos sorties Strava analysées" },
          { icon: Gauge, title: "On vous matche", desc: "Le pneu taillé pour votre usage" },
          { icon: ShieldCheck, title: "On veille", desc: "Alerte usure au bon moment" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-center text-center gap-1.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10">
              <Icon size={17} className="text-[#FCE500]" />
            </span>
            <span className="text-white text-[11px] font-bold leading-tight">{title}</span>
            <span className="text-white/45 text-[10px] leading-snug">{desc}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="relative z-10 w-full max-w-sm mb-3">
        <button
          onClick={connectStrava}
          className="w-full bg-[#FC4C02] hover:bg-[#e04302] active:scale-[0.98] text-white font-bold py-[14px] sm:py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-[15px] transition-all shadow-[0_8px_28px_rgba(252,76,2,0.55)]"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white flex-shrink-0" aria-hidden="true">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Découvrir mon pneu idéal
        </button>
        <p className="text-white/45 text-[11px] text-center mt-2.5">
          Connexion Strava sécurisée · Gratuit · Sans engagement
        </p>
      </div>

      {/* Legal / réassurance */}
      <p className="relative z-10 text-white/35 text-[11px] text-center px-6 leading-relaxed max-w-[24rem]">
        Accès exclusif à vos actions, pour vos suggestions. Pas de publication sur Strava, pas de données revendues.
      </p>

      {/* Accès démo discret pour le jury */}
      <button
        onClick={handleLoadDemo}
        className="relative z-10 text-white/20 hover:text-white/40 text-[11px] mt-3 sm:mt-6 transition-colors"
      >
        Mode démo
      </button>
    </div>
  );
}
