import { describe, it, expect, afterEach } from "vitest";
import { chatter, parserArguments, listerModeles } from "../src/llm";

const vraiFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = vraiFetch; });

// Rejoue un flux SSE en le découpant à des frontières VOLONTAIREMENT mauvaises
// (au milieu des lignes), pour vérifier que le tampon recolle correctement.
function fauxFlux(evenements: object[], tailleMorceau = 7) {
    const texte = evenements.map(e => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n";
    const octets = new TextEncoder().encode(texte);

    globalThis.fetch = (async () => new Response(new ReadableStream({
        start(ctrl) {
            for (let i = 0; i < octets.length; i += tailleMorceau) {
                ctrl.enqueue(octets.slice(i, i + tailleMorceau));
            }
            ctrl.close();
        },
    }), { status: 200 })) as any;
}

const delta = (d: object) => ({ choices: [{ index: 0, delta: d }] });

describe("client compatible OpenAI", () => {
    it("assemble le texte et rapporte les fragments au fil de l'eau", async () => {
        fauxFlux([
            delta({ content: "Bon" }), delta({ content: "jour" }), delta({ content: " !" }),
            { choices: [], usage: { prompt_tokens: 12, completion_tokens: 3 } },
        ]);

        const recus: string[] = [];
        const r = await chatter({
            url: "http://x", modele: "m", messages: [{ role: "user", content: "salut" }],
            onChunk: d => recus.push(d),
        });

        expect(r.message.content).toBe("Bonjour !");
        expect(recus).toEqual(["Bon", "jour", " !"]);
        expect(r.promptTokens).toBe(12);
        expect(r.completionTokens).toBe(3);
    });

    it("recolle les arguments d'outil fragmentés", async () => {
        // Découpage réel observé sur llama-server.
        fauxFlux([
            delta({ tool_calls: [{ index: 0, id: "abc", function: { name: "list_directory", arguments: "{" } }] }),
            delta({ tool_calls: [{ index: 0, function: { arguments: "\"path\":\"" } }] }),
            delta({ tool_calls: [{ index: 0, function: { arguments: "/tmp" } }] }),
            delta({ tool_calls: [{ index: 0, function: { arguments: "/demo\"}" } }] }),
        ]);

        const r = await chatter({ url: "http://x", modele: "m", messages: [] });
        const appel = r.message.tool_calls?.[0];

        expect(appel?.id).toBe("abc");
        expect(appel?.function.name).toBe("list_directory");
        expect(appel?.function.arguments).toBe('{"path":"/tmp/demo"}');
        expect(parserArguments(appel!.function.arguments)).toEqual({ path: "/tmp/demo" });
    });

    it("gère plusieurs outils en parallèle, sans mélanger les arguments", async () => {
        fauxFlux([
            delta({
                tool_calls: [
                    { index: 0, id: "a", function: { name: "read_file", arguments: '{"path":"' } },
                    { index: 1, id: "b", function: { name: "list_directory", arguments: '{"path":"' } },
                ],
            }),
            delta({ tool_calls: [{ index: 1, function: { arguments: 'dossier"}' } }] }),
            delta({ tool_calls: [{ index: 0, function: { arguments: 'fichier.txt"}' } }] }),
        ]);

        const r = await chatter({ url: "http://x", modele: "m", messages: [] });
        expect(r.message.tool_calls?.map(t => [t.function.name, t.function.arguments])).toEqual([
            ["read_file", '{"path":"fichier.txt"}'],
            ["list_directory", '{"path":"dossier"}'],
        ]);
    });

    it("ignore les événements illisibles au lieu de tomber", async () => {
        globalThis.fetch = (async () => new Response(
            'data: {ceci n\'est pas du json\n\ndata: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
            { status: 200 },
        )) as any;

        const r = await chatter({ url: "http://x", modele: "m", messages: [] });
        expect(r.message.content).toBe("ok");
    });

    it("remonte une erreur explicite si le serveur refuse", async () => {
        globalThis.fetch = (async () => new Response("modèle inconnu", { status: 404, statusText: "Not Found" })) as any;
        await expect(chatter({ url: "http://x", modele: "m", messages: [] }))
            .rejects.toThrow(/404/);
    });

    it("des arguments JSON invalides donnent un objet vide, sans planter", () => {
        expect(parserArguments('{"path":')).toEqual({});
        expect(parserArguments("")).toEqual({});
        expect(parserArguments('{"path":"ok"}')).toEqual({ path: "ok" });
    });

    it("lit les modèles au format OpenAI comme au format Ollama", async () => {
        globalThis.fetch = (async () => new Response(
            JSON.stringify({ data: [{ id: "qwen2.5" }, { id: "gemma4" }] }), { status: 200 },
        )) as any;
        expect(await listerModeles("http://x")).toEqual(["qwen2.5", "gemma4"]);

        globalThis.fetch = (async () => new Response(
            JSON.stringify({ models: [{ name: "local-gguf" }] }), { status: 200 },
        )) as any;
        expect(await listerModeles("http://x")).toEqual(["local-gguf"]);
    });
});
