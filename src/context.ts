import { lancerAgent } from "./agent";
import type { MessageLLM } from "./llm";

export async function compacterContexte(
    messages: MessageLLM[]
): Promise<MessageLLM[]> {
    const [system, ...history] = messages;
    const recent = history.slice(-6);
    const aResumer = history.slice(0, -6);

    if (aResumer.length === 0) return messages;

    console.log("\n⚡ Compaction...");
    let resume = "";

    await lancerAgent(
        "Résume ces échanges en " +
        "conservant les décisions clés :\n" +
        aResumer
            .map(m => `${m.role}: ${m.content}`)
            .join("\n"),
        { onResponse: t => { resume = t; } }
    );

    return [
        system,
        {
            role: "assistant",
            content: `[Résumé]\n${resume}`
        },
        ...recent,
    ];
}