export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export interface HealthCheckResponse {
  status: "ok" | "degraded" | "down";
  version: string;
  uptimeSeconds: number;
  database: "ok" | "down";
}
