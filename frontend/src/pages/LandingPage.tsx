import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useApp } from "@/context/AppContext";

export function LandingPage() {
  const { connectStrava, loadDemoData, loadLiveData } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const authParam = searchParams.get("auth");
    if (authParam === "success") {
      setSearchParams({}, { replace: true });
      loadLiveData().then(() => navigate("/profil", { replace: true }));
    } else if (authParam === "denied" || authParam === "error") {
      setSearchParams({}, { replace: true });
    }
  }, []);

  async function handleLoadDemo() {
    await loadDemoData();
    navigate("/profil");
  }

  return (
    <div className="min-h-screen bg-[#00205B] flex flex-col items-center justify-center font-sans overflow-hidden relative px-6 py-10 sm:py-12">
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
      <div className="relative z-10 mb-7 sm:mb-8 flex flex-col items-center gap-2.5 sm:gap-3">
        <img src="/michelin-logo-white.png" alt="Michelin" className="w-48 sm:w-56" />
        <span className="text-white/55 text-[10px] sm:text-[11px] tracking-[0.28em] uppercase font-semibold">
          Road Intelligence
        </span>
      </div>

      {/* Hero text */}
      <div className="relative z-10 text-center mb-7 sm:mb-8">
        <h1 className="text-white font-extrabold text-[2.05rem] sm:text-[2.20rem] leading-[1.18] mb-4 sm:mb-5">
          Vos pneus.<br />
          Vos données.<br />
          Votre performance.
        </h1>
        <p className="text-white/65 text-[14px] sm:text-[15px] leading-relaxed mx-auto max-w-[22rem]">
          Connectez votre compte Strava pour obtenir une recommandation personnalisée et suivre l&apos;usure de vos pneus Michelin.
        </p>
      </div>

      {/* CTA */}
      <div className="relative z-10 w-full max-w-sm mb-5 sm:mb-5">
        <button
          onClick={connectStrava}
          className="w-full bg-[#FC4C02] hover:bg-[#e04302] active:scale-[0.98] text-white font-bold py-[14px] sm:py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-[15px] transition-all shadow-[0_8px_28px_rgba(252,76,2,0.55)]"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white flex-shrink-0" aria-hidden="true">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Se connecter avec Strava
        </button>
      </div>

      {/* Legal */}
      <p className="relative z-10 text-white/35 text-[11px] text-center px-6 leading-relaxed">
        Données Strava utilisées uniquement pour personnaliser votre expérience. Application non commerciale.
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
