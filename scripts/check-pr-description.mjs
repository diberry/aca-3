import { readFile } from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const requiredPullRequestSections = [
  "Goal",
  "Scope",
  "Implementation steps",
  "Risks and mitigations",
  "Validation criteria",
];

function normalizeHeading(heading) {
  return heading
    .replace(/\s+#+\s*$/, "")
    .trim()
    .toLowerCase();
}

function hasMeaningfulContent(content) {
  const withoutComments = content.replace(/<!--[\s\S]*?-->/g, "");
  const meaningfulLines = withoutComments
    .split(/\r?\n/)
    .filter((line) => !/^\s*#{1,6}\s+/.test(line))
    .map((line) =>
      line
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")
        .replace(/^\s*\[[ xX]\]\s*/, "")
        .trim(),
    )
    .filter(Boolean);

  return meaningfulLines.length > 0;
}

export function validatePullRequestDescription(body) {
  const errors = [];
  const headings = [];
  const headingPattern = /^##(?!#)\s+(.+?)\s*$/gm;

  for (const match of body.matchAll(headingPattern)) {
    headings.push({
      heading: normalizeHeading(match[1]),
      contentStart: match.index + match[0].length,
      headingStart: match.index,
    });
  }

  for (const requiredSection of requiredPullRequestSections) {
    const normalizedRequiredSection = requiredSection.toLowerCase();
    const matchingHeadings = headings.filter(
      ({ heading }) => heading === normalizedRequiredSection,
    );

    if (matchingHeadings.length === 0) {
      errors.push(`Missing required section: ## ${requiredSection}.`);
      continue;
    }

    if (matchingHeadings.length > 1) {
      errors.push(`Required section appears more than once: ## ${requiredSection}.`);
      continue;
    }

    const section = matchingHeadings[0];
    const sectionIndex = headings.indexOf(section);
    const nextHeading = headings[sectionIndex + 1];
    const contentEnd = nextHeading?.headingStart ?? body.length;
    const content = body.slice(section.contentStart, contentEnd);

    if (!hasMeaningfulContent(content)) {
      errors.push(`Required section has no meaningful content: ## ${requiredSection}.`);
    }
  }

  return errors;
}

function parseArguments(argumentsToParse) {
  if (argumentsToParse.length !== 2 || argumentsToParse[0] !== "--event" || !argumentsToParse[1]) {
    throw new Error("Usage: node scripts/check-pr-description.mjs --event <event.json>");
  }

  return argumentsToParse[1];
}

async function main() {
  const eventFilename = parseArguments(process.argv.slice(2));
  const event = JSON.parse(await readFile(eventFilename, "utf8"));
  const errors = validatePullRequestDescription(event.pull_request?.body ?? "");

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`::error::${error}`);
    }
    throw new Error("Pull request description does not satisfy the repository standard.");
  }

  console.log("Pull request description includes all required nonempty sections.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
