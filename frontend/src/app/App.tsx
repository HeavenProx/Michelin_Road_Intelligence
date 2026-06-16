import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AppProvider } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { LandingPage } from "@/pages/LandingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { GaragePage } from "@/pages/GaragePage";
import { AlertePage } from "@/pages/AlertePage";
import { AvisPage } from "@/pages/AvisPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppLayout />}>
            <Route path="/profil"   element={<DashboardPage />} />
            <Route path="/mon-pneu" element={<GaragePage />} />
            <Route path="/alertes"  element={<AlertePage />} />
            <Route path="/avis"     element={<AvisPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
