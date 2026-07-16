import { readFile } from "node:fs/promises";
import { WORKSPACE } from "../tools/security/sandbox";
import { lancerAgent } from "../agent";
import type { AgentCallbacks } from "../types";

export const INIT_PROMPT = `\
Analyse le projet courant et génère un fichier MYHARNESS.md.

1. Lis package.json avec read_file({"path":"package.json"}).
2. Lis README.md s'il existe.
3. Liste src/ avec run_command({"command":"ls src/"}).
4. Génère MYHARNESS.md avec ces sections :
   ## Contexte du projet  — nom, stack, description courte
   ## Instructions permanentes — règles de codage détectées
   ## Outils disponibles  — liste les outils enregistrés
5. Sauvegarde avec write_file({"path":"MYHARNESS.md","content":"..."}).
6. Confirme : "MYHARNESS.md créé — redémarre my-harness pour l'activer."
`;

export async function chargerHarnessConfig(): Promise<string> {
    try {
        return await readFile(`${WORKSPACE}/MYHARNESS.md`, "utf-8");
    } catch {
        return "";   // pas de MYHARNESS.md → pas de config, pas d'erreur
    }
}

export async function cmdInit(cb: Partial<AgentCallbacks> = {}): Promise<void> {
    await lancerAgent(INIT_PROMPT, cb);
}