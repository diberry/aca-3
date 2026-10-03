import { readFile } from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

const runtimePathPattern = /^(?:src|packages|infra)\//;
const testPathPattern = /(?:^tests\/|(?:^|\/)[^/]+\.(?:test|spec)\.[^/]+$)/;
const bypassPatterns = [
  {
    name: "skipped, TODO, or expected-failure test",
    pattern: /\b(?:describe|it|test)\.(?:skip|todo|fails)\s*\(/g,
  },
  {
    name: "disabled x-prefixed test",
    pattern: /\b(?:xdescribe|xit|xtest)\s*\(/g,
  },
];

export function flattenPages(value) {
  if (!Array.isArray(value)) {
    throw new TypeError("Expected a JSON array.");
  }

  return value.flatMap((item) => (Array.isArray(item) ? item : [item]));
}

export function isRuntimePath(filename) {
  return runtimePathPattern.test(filename) && !isTestPath(filename);
}

export function isTestPath(filename) {
  return testPathPattern.test(filename);
}

export function extractMarkdownField(body, label) {
  const marker = `${label}:`;

  for (const line of body.split(/\r?\n/)) {
    const withoutComments = line.replace(/<!--.*?-->/g, "");
    const plainText = withoutComments.replaceAll("*", "").trim();
    const markerIndex = plainText.toLowerCase().indexOf(marker.toLowerCase());

    if (markerIndex !== -1) {
      return plainText.slice(markerIndex + marker.length).trim();
    }
  }

  return "";
}

export function findTestBypasses(testSources) {
  const findings = [];

  for (const { filename, source } of testSources) {
    for (const { name, pattern } of bypassPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(source)) {
        findings.push(`${filename}: ${name}`);
      }
    }
  }

  return findings;
}

export function evaluateTddPolicy({
  body,
  changedFiles,
  commits,
  checkRunsBySha = {},
  bypasses = [],
}) {
  const runtimeFiles = changedFiles.filter(isRuntimePath);

  if (runtimeFiles.length === 0) {
    return {
      errors: [],
      exempt: true,
      message: "No runtime paths changed; red-step evidence is not required.",
    };
  }

  const errors = [];
  const changedTests = changedFiles.filter(isTestPath);
  const redSha = extractMarkdownField(body, "Failing-test commit");
  const redCommand = extractMarkdownField(body, "Red-step command");
  const expectedFailure = extractMarkdownField(body, "Expected failure reason");

  if (changedTests.length === 0) {
    errors.push("Runtime changes must include a production-facing test.");
  }

  if (!/^[0-9a-f]{40}$/i.test(redSha)) {
    errors.push("Failing-test commit must contain a full 40-character commit SHA.");
  }

  if (redCommand.length === 0) {
    errors.push("Red-step command must record the exact test command.");
  }

  if (expectedFailure.length === 0) {
    errors.push("Expected failure reason must explain why the red-step test failed.");
  }

  const normalizedRedSha = redSha.toLowerCase();
  const redCommitIndex = commits.findIndex(
    (commit) => commit.sha.toLowerCase() === normalizedRedSha,
  );
  const firstRuntimeCommitIndex = commits.findIndex((commit) => commit.files.some(isRuntimePath));

  if (redCommitIndex === -1 && /^[0-9a-f]{40}$/i.test(redSha)) {
    errors.push("Failing-test commit is not part of this pull request.");
  } else if (redCommitIndex !== -1) {
    const redCommit = commits[redCommitIndex];

    if (!redCommit.files.some(isTestPath)) {
      errors.push("Failing-test commit does not change a test file.");
    }

    if (redCommit.files.some(isRuntimePath)) {
      errors.push("Failing-test commit must not include production implementation changes.");
    }

    if (firstRuntimeCommitIndex !== -1 && redCommitIndex >= firstRuntimeCommitIndex) {
      errors.push("Failing-test commit must precede the first production implementation commit.");
    }

    const testCheckFailed = (checkRunsBySha[normalizedRedSha] ?? []).some(
      (checkRun) => checkRun.name === "test" && checkRun.conclusion === "failure",
    );

    if (!testCheckFailed) {
      errors.push("Failing-test commit must have a completed failing check named test.");
    }
  }

  for (const bypass of bypasses) {
    errors.push(`Prohibited test bypass found: ${bypass}.`);
  }

  return {
    errors,
    exempt: false,
    message:
      errors.length === 0
        ? "TDD evidence is valid: the failing test preceded implementation and the final PR is ready for normal validation."
        : "TDD evidence is incomplete or invalid.",
  };
}

function parseArguments(argumentsToParse) {
  const values = new Map();

  for (let index = 0; index < argumentsToParse.length; index += 2) {
    const name = argumentsToParse[index];
    const value = argumentsToParse[index + 1];

    if (!name?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument sequence near ${name ?? "<end>"}.`);
    }

    values.set(name.slice(2), value);
  }

  return values;
}

async function readJson(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

async function githubGet(pathname, token) {
  const apiBaseUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub API ${response.status} for ${pathname}: ${details}`);
  }

  return response.json();
}

async function readChangedTestSources(filenames) {
  const sources = [];

  for (const filename of filenames.filter(isTestPath)) {
    try {
      sources.push({ filename, source: await readFile(filename, "utf8") });
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return sources;
}

async function main() {
  const argumentsByName = parseArguments(process.argv.slice(2));
  const event = await readJson(argumentsByName.get("event"));
  const changedFileRecords = flattenPages(await readJson(argumentsByName.get("files")));
  const commitRecords = flattenPages(await readJson(argumentsByName.get("commits")));
  const repository = argumentsByName.get("repository");
  const token = process.env.GITHUB_TOKEN;
  const body = event.pull_request?.body ?? "";
  const changedFiles = changedFileRecords.map((file) => file.filename);

  if (!repository || !token) {
    throw new Error("The repository argument and GITHUB_TOKEN are required.");
  }

  if (!changedFiles.some(isRuntimePath)) {
    console.log("TDD policy: no runtime paths changed; red-step evidence is not required.");
    return;
  }

  const commits = [];
  for (const commitRecord of commitRecords) {
    const commit = await githubGet(`/repos/${repository}/commits/${commitRecord.sha}`, token);
    commits.push({
      sha: commit.sha,
      files: (commit.files ?? []).map((file) => file.filename),
    });
  }

  const redSha = extractMarkdownField(body, "Failing-test commit").toLowerCase();
  const checkRunsBySha = {};

  if (/^[0-9a-f]{40}$/.test(redSha)) {
    const checkRuns = await githubGet(
      `/repos/${repository}/commits/${redSha}/check-runs?check_name=test&filter=all&per_page=100`,
      token,
    );
    checkRunsBySha[redSha] = checkRuns.check_runs ?? [];
  }

  const testSources = await readChangedTestSources(changedFiles);
  const result = evaluateTddPolicy({
    body,
    changedFiles,
    commits,
    checkRunsBySha,
    bypasses: findTestBypasses(testSources),
  });

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`::error::${error}`);
    }
    throw new Error(result.message);
  }

  console.log(`TDD policy: ${result.message}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
