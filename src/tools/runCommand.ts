import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";
import type { Tool } from "../types";
import { TIMEOUT_MS } from "../config";
import { verifierCommande } from "./security/garde-fou";
import { WORKSPACE } from "./security/sandbox";
import { lancerJobBackground } from "./jobs";

const exec = promisify(execCallback);   // exec passe par le shell

export const runCommand: Tool = {
    name: "run_command",
    description:
        "Exécute une commande shell dans le workspace (ex: 'npm test') et renvoie sa sortie. " +
        "Pour un process qui ne se termine pas de lui-même (serveur de dev, watcher…), " +
        "passer background: true : il démarre en arrière-plan, sa sortie s'affiche au fil " +
        "de l'eau, et l'outil renvoie tout de suite sans attendre qu'il se termine.",
    parameters: {
        type: "object",
        properties: {
            command: { type: "string", description: "La commande à lancer." },
            background: {
                type: "boolean",
                description:
                    "true pour un process long qui ne se termine pas seul (ex: npm run dev, un watcher).",
            },
        },
        required: ["command"],
    },
    async run(args) {
        const commande = args.command;
        await verifierCommande(commande);

        if (args.background) {
            const id = lancerJobBackground(commande);
            return `[background ${id}] démarré, sa sortie s'affiche au fil de l'eau.`;
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
