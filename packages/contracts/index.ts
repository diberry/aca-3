export const sameOriginRoutes = {
  author: "/mfe/author",
  backend: "/api",
} as const;

export const workloadAudienceEnvironmentVariables = {
  author: "AUTHOR_AUDIENCE",
  backend: "BACKEND_AUDIENCE",
} as const;

export type WorkloadAudienceEnvironmentVariable =
  (typeof workloadAudienceEnvironmentVariables)[keyof typeof workloadAudienceEnvironmentVariables];
