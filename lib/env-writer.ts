import fs from "fs";
import path from "path";

const ENV_FILE = path.join(process.cwd(), ".env.local");

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

function serializeEnv(env: Record<string, string>): string {
  return (
    Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n"
  );
}

export function writeEnvKey(key: string, value: string): void {
  let current: Record<string, string> = {};
  if (fs.existsSync(ENV_FILE)) {
    current = parseEnv(fs.readFileSync(ENV_FILE, "utf-8"));
  }
  if (value) {
    current[key] = value;
  } else {
    delete current[key];
  }
  fs.writeFileSync(ENV_FILE, serializeEnv(current), "utf-8");
}

export function readAllEnvKeys(): Record<string, string> {
  if (!fs.existsSync(ENV_FILE)) return {};
  return parseEnv(fs.readFileSync(ENV_FILE, "utf-8"));
}
