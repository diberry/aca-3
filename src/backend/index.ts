export interface BackendServiceBoundary {
  readonly audience: string;
  readonly ingress: "internal";
}

export { createBackendServer, startBackendServer } from "./server.js";
