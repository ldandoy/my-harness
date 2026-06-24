import { readFile as lireFichier } from "node:fs/promises";
import type { Tool } from "./types";
import { resoudre } from "./security/sandbox";

export const readFile: Tool = {
    name: "read_file",
    description: "Lit et renvoie le contenu d'un fichier du workspace.",
    parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Le fichier à lire." } },
        required: ["path"],
    },
    async run(args) {
        return await lireFichier(resoudre(args.path), "utf-8");
    },
};