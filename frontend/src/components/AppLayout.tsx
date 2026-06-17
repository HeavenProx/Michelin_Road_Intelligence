import { useState } from "react";
import { Outlet, NavLink, Navigate, useNavigate } from "react-router";
import { User, Cog, Bell, Star, LogOut, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

const NAV_ITEMS = [
  { path: "/profil",   label: "Profil",   Icon: User    },
  { path: "/mon-pneu", label: "Mes pneus", Icon: Cog     },
  { path: "/alertes",  label: "Alertes",  Icon: Bell    },
  { path: "/avis",     label: "Avis",     Icon: Star    },
];

export function AppLayout() {
  const { liveData, loading, authStatus, connectStrava, logout, alertCount } = useApp();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (loading || authStatus === "checking") {
    return (
      <div className="min-h-screen bg-[#00205B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="text-[#FCE500] animate-spin" />
          <p className="text-white/60 text-sm">Analyse de tes activités Strava…</p>
        </div>
      </div>
    );
  }

  if (!liveData) {
    return <Navigate to="/" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative overflow-hidden">
      {/* Décorations de fond */}
      <div className="pointer-events-none select-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-[460px] h-[460px] rounded-full border-[80px] border-[#00205B]/10 blur-lg" />
        <div className="absolute -bottom-28 -left-28 w-[470px] h-[470px] rounded-full border-[90px] border-[#FCE500]/30 blur-lg" />
      </div>

      {/* Header fixe */}
      <header className="fixed top-0 inset-x-0 z-20 bg-[#00205B]">
        <div className="max-w-[45rem] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 select-none">
            <img src="/michelin-logo-white.png" alt="Michelin" className="h-8 w-auto object-contain" />
            <div>
              <div className="font-bold text-sm tracking-[0.18em] uppercase leading-none text-white">Michelin</div>
              <div className="text-[9px] tracking-[0.2em] uppercase leading-none mt-0.5 text-white/50">Road Intelligence</div>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium transition-colors border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5"
          >
            <LogOut size={13} />
            <span>Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="relative z-10 flex-1 pt-16 pb-16">
        <div className="max-w-[45rem] mx-auto">
          {liveData.isDemo && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
              <span className="font-semibold">Mode démo</span>
              <span className="text-amber-400">·</span>
              <button onClick={connectStrava} className="underline underline-offset-2 hover:text-amber-900">
                Connectez Strava pour votre profil réel
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200">
        <div className="max-w-[45rem] mx-auto grid grid-cols-4">
          {NAV_ITEMS.map(({ path, label, Icon }) => {
            const badge = path === "/alertes" ? alertCount : 0;
            return (
              <NavLink
                key={path}
                to={path}
                className="relative flex flex-col items-center justify-center pt-2 pb-2 gap-0.5"
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#27509B] rounded-full" />
                    )}
                    <div className="relative">
                      <Icon size={22} className={isActive ? "text-[#27509B]" : "text-gray-400"} />
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
                          {badge}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? "text-[#27509B]" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Modal confirmation déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLogoutModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <LogOut size={22} className="text-red-500" />
              </div>
              <h2 className="font-bold text-lg text-gray-900">Se déconnecter ?</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Vous serez redirigé vers la page d&apos;accueil. Vos données Strava devront être rechargées à la prochaine connexion.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { setShowLogoutModal(false); handleLogout(); }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
