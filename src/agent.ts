import { createInterface } from "node:readline/promises";
import { chatter, obtenirCtxMax, parserArguments, type MessageLLM } from "./llm";
import { MODEL, HOST, SYSTEME, MAX_TOURS, CTX_MAX } from "./config";
import { trouverOutil, schemasOllama } from "./registry";
import type { AgentCallbacks } from "./types";
import { setOnConfirm } from "./tools/security/garde-fou";
import { chargerSkills } from "./skills";
import { log } from "./logger";
import { chargerMemoire } from "./commands/remember";
import { chargerHarnessConfig } from "./commands/init";
import { compacterContexte } from "./context";

// Fallback console (mode CLI sans UI)
let debutReponse = false;
const CB_CONSOLE: AgentCallbacks = {
    onTour: n => { debutReponse = false; console.log(`\n===== TOUR ${n} =====`); },
    onTool: (n, a) => console.log(`🔧 ${n}(${JSON.stringify(a)})`),
    // On écrit les fragments au fil de l'eau ; onResponse ne fait que clore la ligne.
    onChunk: d => {
        if (!debutReponse) { process.stdout.write("\n🤖 "); debutReponse = true; }
        process.stdout.write(d);
    },
    onResponse: () => { process.stdout.write("\n"); debutReponse = false; },
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
    log(`lancerAgent() — "${tache}"`);
    setOnConfirm(cb.onConfirm);
    // const skills = await chargerSkills(".my-harness/skills");
    const [skills, memoire, harnessConfig, maxTokens] = await Promise.all([
        chargerSkills(".my-harness/skills"),
        chargerMemoire(".my-harness/memory"),
        chargerHarnessConfig(),
        // Plafonné : un modèle annonce souvent bien plus que ce qu'on veut
        // réellement charger en mémoire.
        obtenirCtxMax(HOST, MODEL).then(n => Math.min(n, CTX_MAX)),
    ]);
    log(`skills : ${skills.length} — ${skills.map(s => s.trigger).join(", ") || "aucun"}`);

    const skillsBlock = skills ? `\n## Skills disponibles\n${skills}` : "";
    const memoireBlock = memoire ? `\n## Mémoire persistante\n${memoire}` : "";
    const harnessBlock = harnessConfig ? `\n## Configuration du projet\n${harnessConfig}` : "";

    const system = `${SYSTEME} ${harnessBlock} ${skillsBlock} ${memoireBlock}`;
    log(`system prompt (${system.length} chars)`);

    let messages: MessageLLM[] = [
        { role: "system", content: system },
        { role: "user", content: tache },
    ];

    for (let tour = 1; tour <= Number(MAX_TOURS); tour++) {
        log(`--- TOUR ${tour} ---`);
        cb.onTour?.(tour);
        log(`MODEL — "${MODEL}" sur ${HOST}`);

        const { message, promptTokens, completionTokens } = await chatter({
            url: HOST,
            modele: MODEL,
            messages,
            tools: schemasOllama(),
            onChunk: cb.onChunk,
        });
        messages.push(message);

        const appels = message.tool_calls ?? [];
        log(`réponse — ${appels.length} outil(s)`);

        if (appels.length === 0) {
            cb.onTokens?.(promptTokens, completionTokens, maxTokens);

            if (promptTokens / maxTokens > 0.75)
                messages = await compacterContexte(messages);

            cb.onResponse?.(message.content);
            return;
        }

        for (const appel of appels) {
            log(`outil : ${appel.function.name}(${appel.function.arguments})`);
            const { name } = appel.function;
            // Côté OpenAI les arguments sont une chaîne JSON, à décoder avant
            // de les passer à l'outil (et à l'affichage).
            const args = parserArguments(appel.function.arguments);
            cb.onTool?.(name, args);

            const outil = trouverOutil(name);
            let sortie: string;
            try {
                sortie = outil ? await outil.run(args) : `Outil inconnu : ${name}`;
            } catch (e) {
                sortie = `ERREUR : ${(e as Error).message}`;
            }

            // tool_call_id relie le résultat à l'appel : sans lui, les serveurs
            // compatibles OpenAI rejettent le message.
            messages.push({ role: "tool", tool_call_id: appel.id, content: sortie });
        }
    }

    cb.onResponse?.("Nombre maximum de tours atteint.");
}
