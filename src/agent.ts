import type { Message } from "ollama";
import { ollama } from "./ollama";
import { MODEL, SYSTEME, MAX_TOURS } from "./config";
import { trouverOutil, schemasOllama } from "./tools/registry";
import { truncate } from "./format";

export async function lancerAgent(tache: string): Promise<void> {
    const messages: Message[] = [
        { role: "system", content: SYSTEME },
        { role: "user", content: tache },
    ];

    for (let tour = 1; tour <= Number(MAX_TOURS); tour++) {
        console.log(`\n===== TOUR ${tour} =====`);

        const reponse = await ollama.chat({ model: MODEL, messages, tools: schemasOllama() });
        messages.push(reponse.message);          // on garde la réponse dans l'historique

        const appels = reponse.message.tool_calls ?? [];

        if (appels.length === 0) {               // pas d'outil → il a fini
            console.log(`\n🤖 ${reponse.message.content}`);
            return;
        }

        for (const appel of appels) {
            const { name, arguments: args } = appel.function;
            console.log(`🔧 ${name}(${JSON.stringify(args)})`);

            const outil = trouverOutil(name);
            let sortie: string;
            try {
                sortie = outil ? await outil.run(args) : `Outil inconnu : ${name}`;
            } catch (e) {
                sortie = `ERREUR : ${(e as Error).message}`;
            }
            console.log(`   ↳ ${truncate(sortie, 300)}`);

            // Le résultat repart au modèle dans un message "tool"
            messages.push({ role: "tool", content: sortie });
        }
    } // fin de la boucle for

    console.log("\n⚠️  Nombre maximum de tours atteint.");
}