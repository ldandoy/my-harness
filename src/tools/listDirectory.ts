import { readdir } from "node:fs/promises";
import type { Tool } from "./types";
import { resoudre } from "./sandbox";

export const listDirectory: Tool = {
    name: "list_directory",
    description:
        "Liste les fichiers et dossiers d'un répertoire (défaut : le dossier courant).",
    parameters: {
        type: "object",
        properties: {
            path: { type: "string", description: "Le dossier à lister, ex: 'src'." },
        },
        required: [],
    },

    async run(args) {
        const cible = resoudre(args.path ?? ".");
        const entrees = await readdir(cible, { withFileTypes: true });

        if (entrees.length === 0) return "(dossier vide)";

        return entrees
            .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
            .sort()
            .join("\n");
    },
};