import { writeFile as ecrireFichier, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Tool } from "../types";
import { resoudre } from "./security/sandbox";
import { emettreDiff } from "./diffs";

export const writeFile: Tool = {
    name: "write_file",
    description: "Écrit (ou écrase) un fichier du workspace avec le contenu fourni.",
    parameters: {
        type: "object",
        properties: {
            path: { type: "string", description: "Le fichier à écrire, ex: 'index.html'." },
            content: { type: "string", description: "Le contenu complet du fichier." },
        },
        required: ["path", "content"],
    },
    async run(args) {
        const cible = resoudre(args.path);
        // null → le fichier n'existait pas encore (erreur de lecture = nouveau fichier).
        const avant = await readFile(cible, "utf-8").catch(() => null);

        await mkdir(dirname(cible), { recursive: true });   // crée les dossiers manquants
        await ecrireFichier(cible, args.content, "utf-8");
        emettreDiff(args.path, avant ?? "", args.content, avant === null);

        return `Écrit ${args.content.length} caractères dans ${args.path}`;
    },
};

