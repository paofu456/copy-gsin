import { cp, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "public");
const destination = path.join(root, "dist");
const staging = path.join(root, ".tmp", "dist-build");

await rm(staging, { recursive: true, force: true });
await mkdir(path.dirname(staging), { recursive: true });
await cp(source, staging, { recursive: true });
await rm(destination, { recursive: true, force: true });
await rename(staging, destination);
console.log(`Static site built at ${destination}`);
