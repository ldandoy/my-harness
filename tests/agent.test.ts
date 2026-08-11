import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lancerAgent } from "../src/agent";
import { setWorkspace } from "../src/tools/security/sandbox";

const vraiFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = vraiFetch; });

// Workspace jetable : les tests ne doivent jamais écrire dans celui du projet.
let bac: string;
beforeAll(async () => {
    bac = await mkdtemp(join(tmpdir(), "harness-"));
    await writeFile(join(bac, "note.txt"), "coucou");
    setWorkspace(bac);
});
afterAll(async () => { await rm(bac, { recursive: true, force: true }); });

function sse(evenements: object[]): Response {
    const texte = evenements.map(e => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n";
    return new Response(texte, { status: 200 });
}

// Sert des réponses de chat scriptées et retient les corps envoyés,
// pour pouvoir inspecter ce que l'agent renvoie au serveur au tour suivant.
function serveurSimule(tours: object[][]) {
    const envois: any[] = [];
    let n = 0;
    globalThis.fetch = (async (url: string, init?: any) => {
        if (String(url).includes("/v1/chat/completions")) {
            envois.push(JSON.parse(init.body));
            return sse(tours[n++] ?? []);
        }
        return new Response("", { status: 404 });   // /api/show et /props : absents
    }) as any;
    return envois;
}

const APPEL_OUTIL = [{
    choices: [{
        index: 0,
        delta: {
            tool_calls: [{
                index: 0, id: "call_1",
                function: { name: "list_directory", arguments: '{"path":"."}' },
            }],
        },
    }],
}];

const REPONSE = [
    { choices: [{ index: 0, delta: { content: "Il y a 1 fichier." } }] },
    { choices: [], usage: { prompt_tokens: 40, completion_tokens: 5 } },
];

describe("boucle de l'agent", () => {
    it("ne signale chaque outil qu'une seule fois", async () => {
        serveurSimule([APPEL_OUTIL, REPONSE]);

        const vus: string[] = [];
        await lancerAgent("liste le dossier", {
            onTool: n => vus.push(n),
            onConfirm: async () => "never",
        });

        // Régression : onTool était appelé avant ET après l'exécution,
        // ce qui affichait deux fois la même ligne dans l'UI.
        expect(vus).toEqual(["list_directory"]);
    });

    it("renvoie le résultat de l'outil avec son tool_call_id", async () => {
        const envois = serveurSimule([APPEL_OUTIL, REPONSE]);

        await lancerAgent("liste le dossier", { onConfirm: async () => "never" });

        // Le 2e envoi contient l'historique : appel d'outil puis son résultat.
        const messages = envois[1].messages;
        const resultat = messages.find((m: any) => m.role === "tool");
        expect(resultat.tool_call_id).toBe("call_1");
        expect(resultat.content).toContain("note.txt");
    });

    it("transmet le texte final et les compteurs de tokens", async () => {
        serveurSimule([REPONSE]);

        let texte = "", tokens = [0, 0];
        await lancerAgent("bonjour", {
            onResponse: t => { texte = t; },
            onTokens: (p, r) => { tokens = [p, r]; },
            onConfirm: async () => "never",
        });

        expect(texte).toBe("Il y a 1 fichier.");
        expect(tokens).toEqual([40, 5]);
    });

    it("un outil inconnu ne casse pas la boucle", async () => {
        serveurSimule([
            [{ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: "c", function: { name: "inexistant", arguments: "{}" } }] } }] }],
            REPONSE,
        ]);

        let texte = "";
        await lancerAgent("essaie", {
            onResponse: t => { texte = t; },
            onConfirm: async () => "never",
        });
        expect(texte).toBe("Il y a 1 fichier.");
    });
});
