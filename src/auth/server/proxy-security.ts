import type { ClientRequest } from "node:http";
import type { AuthenticatedUser } from "../../../packages/auth-context/index.js";

export const trustedIdentityHeaders = [
  "authorization",
  "x-aca-user-id",
  "x-aca-user-name",
  "x-auth-request-user",
  "x-forwarded-user",
  "x-ms-client-principal",
] as const;

export function rebuildTrustedIdentityHeaders(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  trustedUser: AuthenticatedUser | null,
): Record<string, string | string[]> {
  const sanitized: Record<string, string | string[]> = {};
  for (const [name, value] of Object.entries(headers)) {
    const isTrustedIdentityHeader = trustedIdentityHeaders.some(
      (header) => header === name.toLowerCase(),
    );
    if (value !== undefined && !isTrustedIdentityHeader) {
      sanitized[name] = value;
    }
  }

  if (trustedUser) {
    sanitized["x-aca-user-name"] = trustedUser.displayName;
  }
  return sanitized;
}

export function secureProxyRequest(
  proxyRequest: ClientRequest,
  trustedUser: AuthenticatedUser | null,
): void {
  for (const header of trustedIdentityHeaders) {
    proxyRequest.removeHeader(header);
  }
  if (trustedUser) {
    proxyRequest.setHeader("x-aca-user-name", trustedUser.displayName);
  }
}
