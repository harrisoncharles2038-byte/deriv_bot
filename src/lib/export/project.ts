import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { zipSync } from "fflate";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".output",
  ".cache",
  ".tmp",
  "tmp",
  ".wrangler",
  ".DS_Store",
  "Thumbs.db",
]);

const IGNORED_FILES = new Set([".env", ".env.local", ".env.development", ".env.production"]);

const IGNORED_EXTS = new Set([".log"]);

export async function collectProjectFiles(root: string): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name === ".env" || entry.name.startsWith(".env.")) continue;
      const fullPath = join(dir, entry.name);
      const relPath = relative(root, fullPath);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (IGNORED_FILES.has(entry.name)) continue;
        const ext = entry.name.slice(entry.name.lastIndexOf("."));
        if (IGNORED_EXTS.has(ext)) continue;
        const buffer = await readFile(fullPath);
        files.set(relPath, new Uint8Array(buffer));
      }
    }
  }

  await walk(root);
  return files;
}

export function createProjectZip(files: Map<string, Uint8Array>): Uint8Array {
  const zipFiles: Record<string, Uint8Array> = {};
  for (const [path, content] of files) {
    zipFiles[path] = content;
  }
  return zipSync(zipFiles, { level: 6 });
}
