import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { connecter, retenirModele, initialiserServeurs, serveurActif, urlActive, tousLesServeurs } from "../src/serveurs";
import { chargerPreferences } from "../src/preferences";

const FICHIER = ".my-harness/config.json";

// Les préférences vivent dans le dossier du projet : on sauvegarde celles de
// l'utilisateur pour ne pas les écraser en testant.
let sauvegarde: string | null = null;
beforeEach(async () => {
    if (sauvegarde === null) sauvegarde = await readFile(FICHIER, "utf-8").catch(() => "");
    await rm(FICHIER, { force: true });
    await initialiserServeurs();
});
afterAll(async () => {
    if (sauvegarde) { await mkdir(".my-harness", { recursive: true }); await writeFile(FICHIER, sauvegarde); }
    else await rm(FICHIER, { force: true });
});

describe("registre de serveurs", () => {
    it("propose ollama et llama-server sans configuration", async () => {
        expect(Object.keys(tousLesServeurs())).toContain("ollama");
        expect(Object.keys(tousLesServeurs())).toContain("llama-server");
        expect(serveurActif()).toBe("ollama");
    });

    it("chaque serveur retient son propre modèle", async () => {
        await connecter("ollama");
        await retenirModele("qwen2.5");

        await connecter("llama-server");
        await retenirModele("Qwen3-Coder-30B");

        // Le cœur de la demande : revenir sur un serveur restaure SON modèle,
        // et pas celui, invalide ici, de l'autre backend.
        await connecter("ollama");
        const { MODEL } = await import("../src/config");
        expect(MODEL).toBe("qwen2.5");

        await connecter("llama-server");
        const { MODEL: m2 } = await import("../src/config");
        expect(m2).toBe("Qwen3-Coder-30B");
    });

    it("enregistre un nouveau serveur avec son URL", async () => {
        await connecter("distant", "http://192.168.1.20:11434");
        expect(serveurActif()).toBe("distant");
        expect(urlActive()).toBe("http://192.168.1.20:11434");
    });

    it("refuse un nom inconnu sans URL, en listant les serveurs connus", async () => {
        await expect(connecter("nexistepas")).rejects.toThrow(/Serveur inconnu.*ollama/s);
    });

    it("survit à un redémarrage : serveur actif et modèle rechargés du disque", async () => {
        await connecter("llama-server");
        await retenirModele("Qwen3-Coder-30B");

        await initialiserServeurs();   // simule un redémarrage
        expect(serveurActif()).toBe("llama-server");
        const { MODEL } = await import("../src/config");
        expect(MODEL).toBe("Qwen3-Coder-30B");
    });

    it("migre l'ancien format { modele } sans perdre le choix de l'utilisateur", async () => {
        await mkdir(".my-harness", { recursive: true });
        await writeFile(FICHIER, JSON.stringify({ modele: "gemma4:12b" }));

        const prefs = await chargerPreferences();
        expect(prefs.actif).toBe("ollama");
        expect(prefs.serveurs?.ollama?.modele).toBe("gemma4:12b");
    });
});
