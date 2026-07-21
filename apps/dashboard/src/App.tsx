import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardHomePage } from "@/pages/DashboardHomePage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { useAuth } from "@/lib/auth-context";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") return null;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHomePage />} />
        <Route
          path="/database"
          element={<PlaceholderPage title="Banco de Dados" description="Disponível a partir da v0.2." />}
        />
        <Route
          path="/plugins"
          element={<PlaceholderPage title="Plugins" description="Instalação de plugins disponível a partir da v0.3." />}
        />
        <Route
          path="/settings"
          element={<PlaceholderPage title="Configurações" description="Em breve." />}
        />
      </Route>
    </Routes>
  );
}
