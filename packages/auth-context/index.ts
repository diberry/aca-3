export interface AuthenticatedUser {
  readonly displayName: string;
  readonly provider: "entra" | "github" | "google";
}

export interface AuthContextValue {
  readonly user: AuthenticatedUser;
}
