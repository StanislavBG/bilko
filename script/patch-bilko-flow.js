import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bfDir = path.resolve(__dirname, "..", "node_modules", "bilko-flow");
const pkgPath = path.join(bfDir, "package.json");

if (!fs.existsSync(pkgPath)) {
  console.log("[patch-bilko-flow] bilko-flow not installed, skipping");
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

pkg.exports = {
  ".": {
    types: "./dist/index.d.ts",
    default: "./dist/index.js",
  },
  "./react": {
    types: "./dist/react/index.d.ts",
    default: "./dist/react/index.js",
  },
  "./dist/*": "./dist/*",
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log("[patch-bilko-flow] Added ./dist/* wildcard export");

if (!fs.existsSync(path.join(bfDir, "dist"))) {
  console.log("[patch-bilko-flow] Building dist...");
  try {
    execSync("npm install @types/uuid 2>/dev/null; npx tsc --noEmitOnError false", {
      cwd: bfDir,
      stdio: "inherit",
    });
  } catch {
    console.log("[patch-bilko-flow] Build had errors (non-fatal, dist still produced)");
  }
}

const indexJs = path.join(bfDir, "dist", "index.js");
if (!fs.existsSync(indexJs)) {
  console.error("[patch-bilko-flow] FATAL: dist/index.js not found after build");
  process.exit(1);
}

const SAFE_INDEX = `"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppContext = exports.createApp = void 0;
// Re-exports only — no server auto-start (patched by patch-bilko-flow.js)
var server_2 = require("./server");
Object.defineProperty(exports, "createApp", { enumerable: true, get: function () { return server_2.createApp; } });
Object.defineProperty(exports, "createAppContext", { enumerable: true, get: function () { return server_2.createAppContext; } });
__exportStar(require("./domain"), exports);
__exportStar(require("./dsl"), exports);
__exportStar(require("./engine"), exports);
__exportStar(require("./storage"), exports);
__exportStar(require("./planner"), exports);
__exportStar(require("./data-plane"), exports);
__exportStar(require("./audit"), exports);
__exportStar(require("./notifications"), exports);
__exportStar(require("./llm"), exports);
`;

fs.writeFileSync(indexJs, SAFE_INDEX);
console.log("[patch-bilko-flow] Wrote safe dist/index.js (no server auto-start)");

const verifyContent = fs.readFileSync(indexJs, "utf-8");
if (verifyContent.includes("app.listen")) {
  console.error("[patch-bilko-flow] FATAL: dist/index.js still contains app.listen after patch");
  process.exit(1);
}
console.log("[patch-bilko-flow] Verified: no app.listen in dist/index.js");
