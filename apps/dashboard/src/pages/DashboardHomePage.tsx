import { useQuery } from "@tanstack/react-query";
import type { HealthCheckResponse } from "@openspace-db/shared-types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export function DashboardHomePage() {
  const { user } = useAuth();
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiClient.get<HealthCheckResponse>("/health"),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bem-vindo, {user?.name ?? user?.email}</h1>
        <p className="text-muted-foreground">Visão geral da sua instância OpenSpace-DB.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Status da API</CardTitle>
            <CardDescription className="text-2xl font-semibold text-foreground">
              {health?.status === "ok" ? "Operacional" : (health?.status ?? "Carregando...")}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Banco de dados</CardTitle>
            <CardDescription className="text-2xl font-semibold text-foreground">
              {health?.database === "ok" ? "Conectado" : (health?.database ?? "Carregando...")}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Versão</CardTitle>
            <CardDescription className="text-2xl font-semibold text-foreground">
              {health?.version ?? "-"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nenhum plugin instalado</CardTitle>
          <CardDescription>
            Storage, Redis, Filas e outros módulos aparecerão aqui assim que forem instalados.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
