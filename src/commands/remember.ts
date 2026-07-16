import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import type { Tool, AgentCallbacks } from "../types";
import { lancerAgent } from "../agent";
import { WORKSPACE } from "../tools/security/sandbox";
import { log } from "../logger";

export async function chargerMemoire(dir: string): Promise<string> {
    const files = await readdir(dir).catch(() => []);
    const contents = await Promise.all(
        files
            .filter(f => f.endsWith(".md"))
            .map(f => readFile(`${dir}/${f}`, "utf-8"))
    );
    return contents.join("\n\n---\n\n");
}

export async function sauvegarderMemoire(
    dir: string,
    fichier: string,
    contenu: string
): Promise<void> {
    log(`sauvegarderMemoire() — ${dir}/${fichier}.md`);
    await mkdir(dir, { recursive: true });
    await writeFile(`${dir}/${fichier}.md`, contenu, "utf-8");
}

export const saveMemory: Tool = {
    name: "save_memory",
    description: "Sauvegarde une information dans la mémoire persistante (.harness/memory/*.md)",
    parameters: {
        type: "object",
        properties: {
            fichier: {
                type: "string",
                description: "Nom du fichier sans extension (ex: stack, preferences)",
            },
            contenu: {
                type: "string",
                description: "Contenu markdown à sauvegarder",
            },
        },
        required: ["fichier", "contenu"],
    },
    async run(args: Record<string, any>) {
        log(`saveMemory: ${WORKSPACE}.my-harness/memory`)
        const { fichier, contenu } = args as { fichier: string; contenu: string };
        await sauvegarderMemoire(`${WORKSPACE}.my-harness/memory`, fichier, contenu);
        return `Mémorisé dans ${WORKSPACE}/.my-harness/memory/${fichier}.md`;
    },
};

export async function commandeRemember(
    texte: string,
    cb: AgentCallbacks
): Promise<void> {
    await lancerAgent(
        `Mémorise cette information pour les prochaines sessions :
"${texte}"

1. Choisis un nom de fichier thématique court (ex: stack, preferences, projet).
2. Si le fichier existe déjà, lis-le d'abord avec read_file pour compléter.
3. Sauvegarde avec save_memory.
4. Réponds en une seule phrase de confirmation.`,
        cb
    );
}