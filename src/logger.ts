import { appendFileSync, writeFileSync } from "node:fs";
import { DEBUG } from "./config";

const LOG_FILE = ".my-harness/my-harness.log";

if (DEBUG) {
    writeFileSync(LOG_FILE, `=== .my-harness/my-harness.log — ${new Date().toISOString()} ===\n`);
}

export function log(msg: string): void {
    if (!DEBUG) return;
    const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
}