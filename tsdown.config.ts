import { defineConfig } from "tsdown";

const clientExternals = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-web-react",
  "@deepseek-ai/dsh-client-ui-primitives",
  "@deepseek-ai/dsh-client-ui-attachment",
  "@deepseek-ai/dsh-client-schema-form",
  "@deepseek-ai/dsh-client-runtime/client",
];

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    outDir: "lib",
    format: "esm",
    platform: "node",
    clean: false,
    dts: false,
    sourcemap: true,
    outputOptions: {
      entryFileNames: "[name].js",
    },
  },
  {
    entry: { client: "src/client/index.tsx" },
    outDir: "lib",
    format: "cjs",
    platform: "browser",
    clean: false,
    dts: false,
    sourcemap: true,
    external: clientExternals,
    outputOptions: {
      entryFileNames: "[name].js",
      banner:
        'window.__ModuleLoader__.load({ id: "dsh-artifacts", factory: (require) => {',
      intro: "var module = { exports: {} }; var exports = module.exports;",
      footer: "return module.exports; } });",
    },
  },
]);
