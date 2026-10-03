import { describe, expect, it } from "vitest";
import {
  evaluateTddPolicy,
  extractMarkdownField,
  findTestBypasses,
  flattenPages,
} from "../../scripts/check-tdd-policy.mjs";

const redSha = "1111111111111111111111111111111111111111";
const implementationSha = "2222222222222222222222222222222222222222";
const validBody = `## Test-driven development evidence

- **Failing-test commit:** ${redSha}
- **Red-step command:** pnpm test -- auth
- **Expected failure reason:** Auth accepted a forged identity header.
`;

describe("TDD policy enforcement", () => {
  it("flattens paginated GitHub API arrays", () => {
    expect(flattenPages([[{ filename: "src/a.ts" }], [{ filename: "tests/a.test.ts" }]])).toEqual([
      { filename: "src/a.ts" },
      { filename: "tests/a.test.ts" },
    ]);
  });

  it("extracts PR template fields without Markdown decoration", () => {
    expect(extractMarkdownField(validBody, "Failing-test commit")).toBe(redSha);
    expect(extractMarkdownField(validBody, "Red-step command")).toBe("pnpm test -- auth");
  });

  it("exempts changes outside runtime paths", () => {
    const result = evaluateTddPolicy({
      body: "",
      changedFiles: ["docs/architecture/wave-plan.md", ".github/workflows/validation.yml"],
      commits: [],
    });

    expect(result.exempt).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("does not treat a colocated test as production implementation", () => {
    const result = evaluateTddPolicy({
      body: validBody,
      changedFiles: ["src/auth/server.test.ts", "src/auth/server.ts"],
      commits: [
        { sha: redSha, files: ["src/auth/server.test.ts"] },
        { sha: implementationSha, files: ["src/auth/server.ts"] },
      ],
      checkRunsBySha: {
        [redSha]: [{ name: "test", conclusion: "failure" }],
      },
    });

    expect(result.errors).toEqual([]);
  });

  it("accepts a failing test commit that precedes implementation", () => {
    const result = evaluateTddPolicy({
      body: validBody,
      changedFiles: ["tests/security/auth.test.ts", "src/auth/server.ts"],
      commits: [
        { sha: redSha, files: ["tests/security/auth.test.ts"] },
        { sha: implementationSha, files: ["src/auth/server.ts"] },
      ],
      checkRunsBySha: {
        [redSha]: [{ name: "test", conclusion: "failure" }],
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.exempt).toBe(false);
  });

  it("rejects production code in the failing test commit", () => {
    const result = evaluateTddPolicy({
      body: validBody,
      changedFiles: ["tests/security/auth.test.ts", "src/auth/server.ts"],
      commits: [
        {
          sha: redSha,
          files: ["tests/security/auth.test.ts", "src/auth/server.ts"],
        },
      ],
      checkRunsBySha: {
        [redSha]: [{ name: "test", conclusion: "failure" }],
      },
    });

    expect(result.errors).toContain(
      "Failing-test commit must not include production implementation changes.",
    );
    expect(result.errors).toContain(
      "Failing-test commit must precede the first production implementation commit.",
    );
  });

  it("rejects a red commit without a failed test check", () => {
    const result = evaluateTddPolicy({
      body: validBody,
      changedFiles: ["tests/security/auth.test.ts", "src/auth/server.ts"],
      commits: [
        { sha: redSha, files: ["tests/security/auth.test.ts"] },
        { sha: implementationSha, files: ["src/auth/server.ts"] },
      ],
      checkRunsBySha: {
        [redSha]: [{ name: "test", conclusion: "success" }],
      },
    });

    expect(result.errors).toContain(
      "Failing-test commit must have a completed failing check named test.",
    );
  });

  it("detects prohibited test bypasses", () => {
    expect(
      findTestBypasses([
        {
          filename: "tests/security/auth.test.ts",
          source: 'test.skip("forged header", () => {});',
        },
      ]),
    ).toEqual(["tests/security/auth.test.ts: skipped, TODO, or expected-failure test"]);
  });
});
