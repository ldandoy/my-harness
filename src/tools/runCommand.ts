import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";
import type { Tool } from "./types";
import { TIMEOUT_MS } from "../config";
import { verifierCommande } from "./security/garde-fou";
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

        if (await verifierCommande(commande) === "refuse") {
            return "REFUSÉ : commande non autorisée.";
        }

        try {
            const { stdout, stderr } = await exec(commande, {
                cwd: WORKSPACE, timeout: TIMEOUT_MS,
            });
            return `[ok]\n${stdout}\n${stderr}`;
        } catch (e: any) {
            return `[code ${e.code ?? "?"}]\n${e.stdout ?? ""}\n${e.stderr ?? e.message}`;
        }
    },
};
