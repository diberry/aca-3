export const sameOriginRoutes = {
  author: "/mfe/author",
  backend: "/api",
} as const;

export const authorContractVersion = "1.0.0";

export interface AuthorManifest {
  readonly schemaVersion: 1;
  readonly name: "author";
  readonly contractVersion: typeof authorContractVersion;
  readonly entry: string;
  readonly buildVersion: string;
}

export interface AuthorMountOptions {
  readonly element: HTMLElement;
  readonly user: {
    readonly displayName: string;
    readonly provider: "entra" | "github" | "google" | "local";
  };
}

export interface AuthorRuntimeModule {
  readonly contractVersion: typeof authorContractVersion;
  mount(options: AuthorMountOptions): () => void;
}

export interface HelloResponse {
  readonly message: string;
  readonly user: string;
}

export const workloadAudienceEnvironmentVariables = {
  author: "AUTHOR_AUDIENCE",
  backend: "BACKEND_AUDIENCE",
} as const;

export type WorkloadAudienceEnvironmentVariable =
  (typeof workloadAudienceEnvironmentVariables)[keyof typeof workloadAudienceEnvironmentVariables];
