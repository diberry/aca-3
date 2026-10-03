export interface AuthShellBoundary {
  readonly publicOrigin: URL;
  readonly authorRoutePrefix: "/mfe/author";
  readonly backendRoutePrefix: "/api";
}
