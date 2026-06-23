import type { Tool } from "./types";
import { listDirectory } from "./listDirectory";
import { readFile } from "./readFile";
import { writeFile } from "./writeFile";
import { runCommand } from "./runCommand";

// 1. La liste de tous les outils. Ajouter un outil = ajouter une ligne ici.
export const TOOLS: Tool[] = [listDirectory, readFile, writeFile, runCommand];

// 2. Retrouver un outil par son nom, pour l'exécuter.
const PAR_NOM = new Map(TOOLS.map((t) => [t.name, t]));

export function trouverOutil(nom: string): Tool | undefined {
    return PAR_NOM.get(nom);
}

// 3. Traduire nos outils au format attendu par Ollama (ce que "voit" le modèle).
export function schemasOllama() {
    return TOOLS.map((t) => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
}