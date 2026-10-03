export interface AuthenticatedUser {
  readonly displayName: string;
  readonly provider: "entra" | "github" | "google" | "local";
}

export interface AuthContextValue {
  readonly user: AuthenticatedUser | null;
  readonly localDevelopment: boolean;
}
