import { describe, expect, it } from "vitest";
import {
  sameOriginRoutes,
  workloadAudienceEnvironmentVariables,
} from "../../packages/contracts/index";

describe("foundation contracts", () => {
  it("keeps protected browser routes on the shell origin", () => {
    expect(sameOriginRoutes.author).toMatch(/^\//);
    expect(sameOriginRoutes.backend).toMatch(/^\//);
    expect(sameOriginRoutes.author).not.toMatch(/^\/\//);
    expect(sameOriginRoutes.backend).not.toMatch(/^\/\//);
  });

  it("requires distinct managed workload audience configuration", () => {
    expect(workloadAudienceEnvironmentVariables.author).not.toBe(
      workloadAudienceEnvironmentVariables.backend,
    );
  });
});
