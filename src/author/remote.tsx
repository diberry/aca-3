import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { authorContractVersion, type AuthorMountOptions } from "../../packages/contracts/index.js";
import { AuthorApp } from "./App.js";

export const contractVersion = authorContractVersion;

export function mount({ element, user }: AuthorMountOptions): () => void {
  const root = createRoot(element);
  root.render(
    <StrictMode>
      <AuthorApp user={user} />
    </StrictMode>,
  );
  return () => root.unmount();
}
