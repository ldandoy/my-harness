// src/tools/security/garde-fou.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createInterface } from "node:readline/promises";
import { WORKSPACE } from "../security/sandbox";

const HARNESS_PATH = resolve(WORKSPACE, ".harness/settings.json");

function chargerAutorisees(): string[] {
    if (!existsSync(HARNESS_PATH)) return [];   // fichier ou dossier absent → liste vide
    try {
        return JSON.parse(readFileSync(HARNESS_PATH, "utf-8")).allowedCommands ?? [];
    } catch { return []; }
}

function sauvegarderAutorisees(commandes: string[]): void {
    mkdirSync(dirname(HARNESS_PATH), { recursive: true }); // crée .harness/ si absent
    writeFileSync(HARNESS_PATH, JSON.stringify({ allowedCommands: commandes }, null, 2));
}

// Fonction pure — testable sans I/O
export function estAutorisee(prog: string, autorisees: string[]): boolean {
    return autorisees.includes(prog);
}

export async function verifierCommande(commande: string): Promise<"ok" | "refuse"> {
    const prog = commande.trim().split(/\s+/)[0];
    const autorisees = chargerAutorisees();

    if (estAutorisee(prog, autorisees)) return "ok";    // déjà dans harness.json → direct

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const rep = await rl.question(
        `\n⚠️  « ${prog} » n'est pas autorisée.\n` +
        `   [1] Accepter une fois  [2] Toujours autoriser  [3] Refuser\n> `
    );
    rl.close();

    if (rep.trim() === "2") {
        sauvegarderAutorisees([...autorisees, prog]);
        console.log(`   ✅ « ${prog} » ajoutée à harness.json`);
        return "ok";
    }
    return rep.trim() === "1" ? "ok" : "refuse";  // tout le reste → refus
}