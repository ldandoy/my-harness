import { appendFileSync, writeFileSync, mkdirSync } from "node:fs";
import { DEBUG } from "./config";

const LOG_DIR = ".my-harness";
const LOG_FILE = `${LOG_DIR}/my-harness.log`;

if (DEBUG) {
    // Le dossier n'existe pas au premier lancement (il est gitignoré) :
    // sans ça, writeFileSync plante et l'app ne démarre pas du tout.
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(LOG_FILE, `=== ${LOG_FILE} — ${new Date().toISOString()} ===\n`);
}

export function log(msg: string): void {
    if (!DEBUG) return;
    const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
}