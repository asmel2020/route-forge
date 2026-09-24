import { execFileSync } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
const npmArguments = isWindows
  ? ["/d", "/s", "/c", "npm", "pack", "--dry-run", "--json"]
  : ["pack", "--dry-run", "--json"];
const output = execFileSync(npmCommand, npmArguments, {
  cwd: new URL("..", import.meta.url),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const jsonStart = output.indexOf("[");
const [manifest] = JSON.parse(output.slice(jsonStart));
const files = manifest.files.map(({ path }) => path.replaceAll("\\", "/"));
const allowedFiles = new Set(["LICENSE", "README.md", "package.json"]);
const isAllowed = (path) =>
  allowedFiles.has(path) ||
  path.startsWith("dist/") ||
  path.startsWith("skills/route-forge/");
const unexpectedFiles = files.filter((path) => !isAllowed(path));
const requiredFiles = [
  "LICENSE",
  "README.md",
  "dist/index.d.ts",
  "dist/index.js",
  "package.json",
  "skills/route-forge/SKILL.md",
];
const missingFiles = requiredFiles.filter((path) => !files.includes(path));
const maxPackedSize = 25 * 1024;
const maxUnpackedSize = 100 * 1024;
const errors = [];

if (manifest.name !== "@dannyjgg/route-forge") {
  errors.push(`Unexpected package name: ${manifest.name}`);
}

if (unexpectedFiles.length > 0) {
  errors.push(`Unexpected files: ${unexpectedFiles.join(", ")}`);
}

if (missingFiles.length > 0) {
  errors.push(`Missing files: ${missingFiles.join(", ")}`);
}

if (manifest.size > maxPackedSize) {
  errors.push(`Packed size ${manifest.size} exceeds ${maxPackedSize} bytes`);
}

if (manifest.unpackedSize > maxUnpackedSize) {
  errors.push(
    `Unpacked size ${manifest.unpackedSize} exceeds ${maxUnpackedSize} bytes`,
  );
}

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

process.stdout.write(
  `${manifest.name}@${manifest.version}: ${manifest.size} bytes packed, ${manifest.unpackedSize} bytes unpacked, ${manifest.entryCount} files\n`,
);
