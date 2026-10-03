import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseDocument } from "yaml";

const workflowDirectory = path.resolve(".github", "workflows");
const workflowFiles = (await readdir(workflowDirectory))
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .map((file) => path.join(workflowDirectory, file))
  .sort();
const yamlFiles = [
  path.resolve("pnpm-workspace.yaml"),
  path.resolve(".github", "dependabot.yml"),
  path.resolve(".github", "governance", "agent-governance.yml"),
  path.resolve(".github", "ISSUE_TEMPLATE", "feature.yml"),
  ...workflowFiles,
];

if (workflowFiles.length === 0) {
  throw new Error("No GitHub Actions workflows were found.");
}

const actionReferencePattern = /^[^@\s]+@[0-9a-f]{40}$/;

function collectActionReferences(value, references = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectActionReferences(item, references);
    }
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "uses" && typeof item === "string") {
        references.push(item);
      } else {
        collectActionReferences(item, references);
      }
    }
  }

  return references;
}

for (const yamlFile of yamlFiles) {
  const source = await readFile(yamlFile, "utf8");
  const document = parseDocument(source);
  const relativePath = path.relative(process.cwd(), yamlFile);

  if (document.errors.length > 0) {
    const details = document.errors.map((error) => error.message).join("; ");
    throw new Error(`${relativePath} is invalid YAML: ${details}`);
  }

  if (!workflowFiles.includes(yamlFile)) {
    continue;
  }

  const workflow = document.toJS();
  if (!workflow.permissions) {
    throw new Error(`${relativePath} must declare top-level least-privilege permissions.`);
  }

  for (const reference of collectActionReferences(workflow)) {
    if (reference.startsWith("./") || reference.startsWith("docker://")) {
      continue;
    }
    if (!actionReferencePattern.test(reference)) {
      throw new Error(`${relativePath} uses a mutable Action reference: ${reference}`);
    }
  }
}

console.log(
  `Validated ${yamlFiles.length} YAML files, ${workflowFiles.length} workflows, and immutable Action pins.`,
);
