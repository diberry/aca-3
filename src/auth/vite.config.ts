import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin, type ProxyOptions } from "vite";
import { resolveLocalAuth } from "./server/local-auth.js";
import { secureProxyRequest } from "./server/proxy-security.js";

const directory = path.dirname(fileURLToPath(import.meta.url));

function shellSecurityPlugin(): Plugin {
  const localAuth = resolveLocalAuth(process.env);
  return {
    name: "aca-shell-security",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        response.setHeader(
          "content-security-policy",
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws:; frame-ancestors 'none'; base-uri 'self'",
        );
        response.setHeader("referrer-policy", "no-referrer");
        response.setHeader("x-content-type-options", "nosniff");
        response.setHeader("x-frame-options", "DENY");

        if (request.url !== "/__local/auth/context") {
          next();
          return;
        }

        response.setHeader("cache-control", "no-store");
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(JSON.stringify(localAuth.context));
      });
    },
  };
}

function protectedProxy(target: string): ProxyOptions {
  const localAuth = resolveLocalAuth(process.env);
  return {
    target,
    changeOrigin: false,
    configure(proxy) {
      proxy.on("proxyReq", (proxyRequest) => {
        secureProxyRequest(proxyRequest, localAuth.trustedUser);
      });
    },
  };
}

export default defineConfig({
  root: directory,
  plugins: [shellSecurityPlugin()],
  server: {
    host: "127.0.0.1",
    port: 4100,
    strictPort: true,
    proxy: {
      "/api": protectedProxy("http://127.0.0.1:4300"),
      "/mfe/author": {
        ...protectedProxy("http://127.0.0.1:4200"),
        ws: true,
      },
    },
  },
  build: {
    outDir: path.resolve(directory, "../../dist/apps/auth"),
    emptyOutDir: true,
  },
});
