import { describe, expect, it } from "vitest";
import { resolveLocalAuth } from "../../src/auth/server/local-auth.js";
import { rebuildTrustedIdentityHeaders } from "../../src/auth/server/proxy-security.js";

describe("local authentication gate", () => {
  it("fails closed when local auth is enabled outside local", () => {
    expect(() =>
      resolveLocalAuth({
        ACA_ENVIRONMENT: "production",
        LOCAL_DEV_AUTH_ENABLED: "true",
      }),
    ).toThrow(/only when ACA_ENVIRONMENT is explicitly local/);
  });

  it("does not create a user unless the gate is explicitly enabled", () => {
    expect(resolveLocalAuth({ ACA_ENVIRONMENT: "local" }).context.user).toBeNull();
  });
});

describe("trusted proxy headers", () => {
  it("strips caller identity and recreates it from trusted state", () => {
    const headers = rebuildTrustedIdentityHeaders(
      {
        accept: "application/json",
        authorization: "Bearer forged",
        "x-aca-user-name": "Forged user",
        "x-ms-client-principal": "forged",
      },
      { displayName: "Local Author", provider: "local" },
    );

    expect(headers).toEqual({
      accept: "application/json",
      "x-aca-user-name": "Local Author",
    });
  });
});
