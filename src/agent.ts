import type { Message } from "ollama";
import { createInterface } from "node:readline/promises";
import { ollama } from "./ollama";
import { MODEL, SYSTEME, MAX_TOURS } from "./config";
import { trouverOutil, schemasOllama } from "./registry";
import type { AgentCallbacks } from "./types";
import { setOnConfirm } from "./tools/security/garde-fou";

// Fallback console (mode CLI sans UI)
const CB_CONSOLE: AgentCallbacks = {
    onTour: n => console.log(`\n===== TOUR ${n} =====`),
    onTool: (n, a) => console.log(`🔧 ${n}(${JSON.stringify(a)})`),
    onResponse: t => console.log(`\n🤖 ${t}`),
    onConfirm: async prog => {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const r = await rl.question(`Autoriser "${prog}" ? [1=once/2=always/3=refuse] `);
        rl.close();
        return r === "2" ? "always" : r === "3" ? "never" : "once";
    },
};

export async function lancerAgent(
    tache: string,
    cb: AgentCallbacks = CB_CONSOLE
): Promise<void> {
    setOnConfirm(cb.onConfirm);

    const messages: Message[] = [
        { role: "system", content: SYSTEME },
        { role: "user", content: tache },
    ];

    for (let tour = 1; tour <= Number(MAX_TOURS); tour++) {
        cb.onTour?.(tour);

        const reponse = await ollama.chat({ model: MODEL, messages, tools: schemasOllama() });
        messages.push(reponse.message);

        const appels = reponse.message.tool_calls ?? [];

        if (appels.length === 0) {
            cb.onResponse?.(reponse.message.content);
            return;
        }

        for (const appel of appels) {
            const { name, arguments: args } = appel.function;
            cb.onTool?.(name, args);

            const outil = trouverOutil(name);
            let sortie: string;
            try {
                sortie = outil ? await outil.run(args) : `Outil inconnu : ${name}`;
            } catch (e) {
                sortie = `ERREUR : ${(e as Error).message}`;
            }
            cb.onTool?.(name, args);

            messages.push({ role: "tool", content: sortie });
        }
    }

    cb.onResponse?.("Nombre maximum de tours atteint.");
}
