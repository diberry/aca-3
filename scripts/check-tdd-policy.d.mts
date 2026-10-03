export interface CommitEvidence {
  sha: string;
  files: string[];
}

export interface CheckRunEvidence {
  name: string;
  conclusion: string | null;
}

export interface TestSource {
  filename: string;
  source: string;
}

export interface TddPolicyInput {
  body: string;
  changedFiles: string[];
  commits: CommitEvidence[];
  checkRunsBySha?: Record<string, CheckRunEvidence[]>;
  bypasses?: string[];
}

export interface TddPolicyResult {
  errors: string[];
  exempt: boolean;
  message: string;
}

export function flattenPages<T>(value: unknown): T[];
export function isRuntimePath(filename: string): boolean;
export function isTestPath(filename: string): boolean;
export function extractMarkdownField(body: string, label: string): string;
export function findTestBypasses(testSources: TestSource[]): string[];
export function evaluateTddPolicy(input: TddPolicyInput): TddPolicyResult;
