// src/tools/security/garde-fou.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { WORKSPACE } from "./sandbox";
import type { ConfirmChoice } from "../../types";

type OnConfirmFn = (prog: string) => Promise<ConfirmChoice>;

let _onConfirm: OnConfirmFn | undefined;

export function setOnConfirm(fn: OnConfirmFn | undefined): void {
    _onConfirm = fn;
}

function chargerAutorisees(): string[] {
    const harnessPath = resolve(WORKSPACE, ".my-harness/settings.json");
    if (!existsSync(harnessPath)) return [];   // fichier ou dossier absent → liste vide
    try {
        return JSON.parse(readFileSync(harnessPath, "utf-8")).allowedCommands ?? [];
    } catch { return []; }
}

function sauvegarderAutorisees(commandes: string[]): void {
    const harnessPath = resolve(WORKSPACE, ".my-harness/settings.json");
    mkdirSync(dirname(harnessPath), { recursive: true }); // crée .harness/ si absent
    writeFileSync(harnessPath, JSON.stringify({ allowedCommands: commandes }, null, 2));
}

// Fonction pure — testable sans I/O
export function estAutorisee(prog: string, autorisees: string[]): boolean {
    return autorisees.includes(prog);
}

export async function verifierCommande(prog: string): Promise<void> {
    const autorisees = chargerAutorisees();
    if (estAutorisee(prog, autorisees)) return;

    const choix: ConfirmChoice = await _onConfirm!(prog);

    if (choix === "never") throw new Error(`Commande "${prog}" refusée.`);
    if (choix === "always") sauvegarderAutorisees([...autorisees, prog]);
    // "once" → on laisse passer sans sauvegarder
}