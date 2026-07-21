export const PLUGIN_STATUSES = [
  "discovered",
  "installing",
  "installed",
  "migrating",
  "enabled",
  "disabled",
  "uninstalling",
  "error",
] as const;
export type PluginStatus = (typeof PLUGIN_STATUSES)[number];

export type PluginKind = "library" | "service";

export interface PluginSummary {
  id: string;
  name: string;
  version: string;
  type: PluginKind;
  status: PluginStatus;
  provides: string[];
  errorMessage: string | null;
}
