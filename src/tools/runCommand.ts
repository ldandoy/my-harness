import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";
import type { Tool } from "./types";
import { TIMEOUT_MS, CONFIRMER_COMMANDES } from "../config";
import { refuser, demanderConfirmation } from "./garde-fou";
import { resolve } from "node:path";

export const WORKSPACE = resolve("workspace");
const exec = promisify(execCallback);   // exec passe par le shell

export const runCommand: Tool = {
    name: "run_command",
    description:
        "Exécute une commande shell dans le workspace (ex: 'npm test') et renvoie sa sortie.",
    parameters: {
        type: "object",
        properties: { command: { type: "string", description: "La commande à lancer." } },
        required: ["command"],
    },
    async run(args) {
        const commande = args.command;

        // 1. Liste blanche
        const refus = refuser(commande);
        if (refus) return `REFUSÉ : ${refus}`;

        // 2. Confirmation humaine
        if (CONFIRMER_COMMANDES && !(await demanderConfirmation(commande))) {
            return "REFUSÉ : commande annulée par l'utilisateur.";
        }

        // 3. cwd = workspace, timeout
        try {
            const { stdout, stderr } = await exec(commande, {
                cwd: WORKSPACE, timeout: TIMEOUT_MS,
            });
            return `[ok]\n${stdout}\n${stderr}`;
        } catch (e: any) {
            // commande en échec (tests rouges, timeout…) : on renvoie tout au modèle
            return `[code ${e.code ?? "?"}]\n${e.stdout ?? ""}\n${e.stderr ?? e.message}`;
        }
    },
};
