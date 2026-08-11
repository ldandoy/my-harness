// Client HTTP pour l'API « chat completions » compatible OpenAI.
// Ollama (/v1) comme llama-server l'exposent : un seul chemin de code suffit
// pour parler aux deux (et à LM Studio, vLLM…).

import { log } from "./logger";

export type OutilAppel = {
    id: string;
    type: "function";
    // Attention : côté OpenAI, arguments est une CHAÎNE JSON, pas un objet.
    function: { name: string; arguments: string };
};

export type MessageLLM = {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_calls?: OutilAppel[];
    tool_call_id?: string;   // obligatoire sur les messages role:"tool"
};

export type Reponse = {
    message: MessageLLM;
    promptTokens: number;
    completionTokens: number;
};

// --- Découpage du flux SSE -------------------------------------------------
// Le corps arrive en paquets réseau qui ne respectent pas les frontières de
// lignes : on tamponne jusqu'à obtenir des événements complets.
async function* evenementsSSE(corps: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const decodeur = new TextDecoder();
    let tampon = "";

    for await (const paquet of corps as any as AsyncIterable<Uint8Array>) {
        tampon += decodeur.decode(paquet, { stream: true });

        let coupure: number;
        while ((coupure = tampon.indexOf("\n")) !== -1) {
            const ligne = tampon.slice(0, coupure).trim();
            tampon = tampon.slice(coupure + 1);
            if (ligne.startsWith("data:")) yield ligne.slice(5).trim();
        }
    }
}

export async function chatter(opts: {
    url: string;
    modele: string;
    messages: MessageLLM[];
    tools?: unknown[];
    onChunk?: (delta: string) => void;
    signal?: AbortSignal;
}): Promise<Reponse> {
    const { url, modele, messages, tools, onChunk, signal } = opts;

    const res = await fetch(`${url.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
            model: modele,
            messages,
            ...(tools?.length ? { tools } : {}),
            stream: true,
            // Sans ça, le décompte de tokens n'arrive jamais en streaming.
            stream_options: { include_usage: true },
        }),
    });

    if (!res.ok || !res.body) {
        throw new Error(`${url} a répondu ${res.status} ${res.statusText} — ${(await res.text()).slice(0, 200)}`);
    }

    let contenu = "";
    let promptTokens = 0;
    let completionTokens = 0;

    // Les arguments d'un outil arrivent en morceaux ("{", "\"path\":\"", "."…)
    // répartis sur plusieurs événements : on les recolle par index. L'id et le
    // nom, eux, ne sont présents que dans le tout premier morceau.
    const appels = new Map<number, { id: string; name: string; args: string }>();

    for await (const donnee of evenementsSSE(res.body)) {
        if (donnee === "[DONE]") break;

        let evt: any;
        try { evt = JSON.parse(donnee); } catch { continue; }

        if (evt.usage) {
            promptTokens = evt.usage.prompt_tokens ?? 0;
            completionTokens = evt.usage.completion_tokens ?? 0;
        }

        const delta = evt.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) { contenu += delta.content; onChunk?.(delta.content); }

        for (const tc of delta.tool_calls ?? []) {
            const idx = tc.index ?? 0;
            const acc = appels.get(idx) ?? { id: "", name: "", args: "" };
            if (tc.id) acc.id = tc.id;
            if (tc.function?.name) acc.name = tc.function.name;
            if (tc.function?.arguments) acc.args += tc.function.arguments;
            appels.set(idx, acc);
        }
    }

    const message: MessageLLM = { role: "assistant", content: contenu };
    if (appels.size > 0) {
        message.tool_calls = [...appels.entries()]
            .sort(([a], [b]) => a - b)
            .map(([idx, a]) => ({
                id: a.id || `call_${idx}`,
                type: "function" as const,
                function: { name: a.name, arguments: a.args },
            }));
    }

    return { message, promptTokens, completionTokens };
}

// Les arguments transitent en JSON sérialisé : un modèle peut produire du JSON
// invalide, on ne veut pas que ça fasse tomber la boucle de l'agent.
export function parserArguments(brut: string): Record<string, unknown> {
    try {
        const v = JSON.parse(brut || "{}");
        return v && typeof v === "object" ? v : {};
    } catch {
        log(`arguments d'outil illisibles : ${brut.slice(0, 200)}`);
        return {};
    }
}

export async function listerModeles(url: string): Promise<string[]> {
    const res = await fetch(`${url.replace(/\/$/, "")}/v1/models`);
    if (!res.ok) throw new Error(`${url} a répondu ${res.status}`);
    const data = await res.json() as any;
    // Forme standard OpenAI, avec repli sur celle d'Ollama natif.
    return (data.data?.map((m: any) => m.id)
        ?? data.models?.map((m: any) => m.name)
        ?? []).filter(Boolean);
}

// Taille de contexte : aucun endpoint OpenAI ne l'expose, on interroge donc
// les API propres à chaque serveur, avec repli sur une valeur sûre.
export async function obtenirCtxMax(url: string, modele: string): Promise<number> {
    const base = url.replace(/\/$/, "");

    // Ollama : la clé est préfixée par l'architecture ("qwen2.", "llama."…).
    try {
        const res = await fetch(`${base}/api/show`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: modele }),
        });
        if (res.ok) {
            const info = (await res.json() as any).model_info ?? {};
            const cle = Object.keys(info).find(k => k.endsWith(".context_length"));
            if (cle && Number(info[cle]) > 0) return Number(info[cle]);
        }
    } catch { /* pas un Ollama : on tente llama-server */ }

    // llama-server : n_ctx est la taille réellement chargée en mémoire.
    try {
        const res = await fetch(`${base}/props`);
        if (res.ok) {
            const props = await res.json() as any;
            const n = props.default_generation_settings?.n_ctx ?? props.n_ctx;
            if (Number(n) > 0) return Number(n);
        }
    } catch { /* ni l'un ni l'autre */ }

    return 4096;
}
