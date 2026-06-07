import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const LOCAL_ENV_FILES = [".env", ".env.local"] as const;

export function loadLocalEnvFiles(cwd = process.cwd()): string[] {
  const loadedFiles: string[] = [];
  const locallyLoadedKeys = new Set<string>();

  for (const fileName of LOCAL_ENV_FILES) {
    const filePath = path.join(cwd, fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const parsed = dotenv.parse(readFileSync(filePath));
    for (const [key, value] of Object.entries(parsed)) {
      const canSet = process.env[key] === undefined || locallyLoadedKeys.has(key);
      if (canSet) {
        process.env[key] = value;
        locallyLoadedKeys.add(key);
      }
    }
    loadedFiles.push(fileName);
  }

  return loadedFiles;
}
