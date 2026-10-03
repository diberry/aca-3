import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const directory = path.dirname(fileURLToPath(import.meta.url));

function authorManifestPlugin(): Plugin {
  return {
    name: "aca-author-manifest",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url !== "/mfe/author/manifest.json") {
          next();
          return;
        }

        response.setHeader("cache-control", "no-store");
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(
          JSON.stringify({
            schemaVersion: 1,
            name: "author",
            contractVersion: "1.0.0",
            entry: "/mfe/author/remote.tsx",
            buildVersion: "stage-0-development",
          }),
        );
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(
          {
            schemaVersion: 1,
            name: "author",
            contractVersion: "1.0.0",
            entry: "/mfe/author/author.js",
            buildVersion: "stage-0",
          },
          null,
          2,
        ),
      });
    },
  };
}

export default defineConfig({
  base: "/mfe/author/",
  root: directory,
  plugins: [authorManifestPlugin()],
  server: {
    host: "127.0.0.1",
    port: 4200,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(directory, "../../dist/apps/author"),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(directory, "remote.tsx"),
      formats: ["es"],
      fileName: () => "author.js",
    },
  },
});
