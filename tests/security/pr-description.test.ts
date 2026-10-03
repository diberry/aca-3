import { describe, expect, it } from "vitest";
import {
  requiredPullRequestSections,
  validatePullRequestDescription,
} from "../../scripts/check-pr-description.mjs";

const validDescription = `## Goal

Make pull request intent measurable.

## Scope

### Included

- Validate required sections.

### Excluded

- Runtime behavior.

## Implementation steps

1. Parse the description.
2. Validate each section.

## Risks and mitigations

- **False positives:** Match exact level-two headings.

## Validation criteria

- [x] Unit tests pass.
`;

describe("pull request description policy", () => {
  it("accepts all required nonempty sections", () => {
    expect(validatePullRequestDescription(validDescription)).toEqual([]);
  });

  it("requires every standard section", () => {
    const errors = validatePullRequestDescription("## Goal\n\nShip a focused change.");

    for (const section of requiredPullRequestSections.slice(1)) {
      expect(errors).toContain(`Missing required section: ## ${section}.`);
    }
  });

  it("rejects sections containing only template comments and subheadings", () => {
    const description = validDescription.replace(
      "### Included\n\n- Validate required sections.\n\n### Excluded\n\n- Runtime behavior.",
      "### Included\n\n<!-- Describe included work. -->\n\n### Excluded\n\n<!-- Describe exclusions. -->",
    );

    expect(validatePullRequestDescription(description)).toContain(
      "Required section has no meaningful content: ## Scope.",
    );
  });

  it("rejects duplicate required sections", () => {
    const description = `${validDescription}\n## Goal\n\nA conflicting second goal.\n`;

    expect(validatePullRequestDescription(description)).toContain(
      "Required section appears more than once: ## Goal.",
    );
  });

  it("matches required headings case-insensitively", () => {
    const description = validDescription.replace("## Goal", "## GOAL");

    expect(validatePullRequestDescription(description)).toEqual([]);
  });
});
