import type { AuthContextValue, AuthenticatedUser } from "../../../packages/auth-context/index.js";

export interface LocalAuthConfiguration {
  readonly context: AuthContextValue;
  readonly trustedUser: AuthenticatedUser | null;
}

export function resolveLocalAuth(
  environment: Readonly<Record<string, string | undefined>>,
): LocalAuthConfiguration {
  const enabled = environment.LOCAL_DEV_AUTH_ENABLED === "true";
  const applicationEnvironment = environment.ACA_ENVIRONMENT;

  if (enabled && applicationEnvironment !== "local") {
    throw new Error(
      "LOCAL_DEV_AUTH_ENABLED may be true only when ACA_ENVIRONMENT is explicitly local.",
    );
  }

  const trustedUser: AuthenticatedUser | null = enabled
    ? {
        displayName: environment.LOCAL_DEV_USER_NAME?.trim() || "Local Author",
        provider: "local",
      }
    : null;

  return {
    context: {
      user: trustedUser,
      localDevelopment: enabled,
    },
    trustedUser,
  };
}
