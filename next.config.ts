import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Descubrimiento OAuth del MCP en rutas .well-known (evita carpetas con punto
  // en app/): se sirven desde route handlers normales.
  async rewrites() {
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth/metadata/protected-resource" },
      { source: "/.well-known/oauth-protected-resource/api/mcp", destination: "/api/oauth/metadata/protected-resource" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth/metadata/authorization-server" },
    ];
  },
};

export default nextConfig;
