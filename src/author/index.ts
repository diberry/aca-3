import type { ComponentType } from "react";

export interface AuthorRuntimeModule {
  readonly AuthorApp: ComponentType;
  readonly contractVersion: string;
}
