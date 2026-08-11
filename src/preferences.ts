import { readFile, writeFile, mkdir } from "node:fs/promises";
import { log } from "./logger";

const DOSSIER = ".my-harness";
const FICHIER = `${DOSSIER}/config.json`;

export type Serveur = {
    url: string;
    modele?: string;   // chaque serveur retient le modèle qu'on y utilisait
};

export type Preferences = {
    actif?: string;                        // nom du serveur courant
    serveurs?: Record<string, Serveur>;
};

export async function chargerPreferences(): Promise<Preferences> {
    try {
        const brut = JSON.parse(await readFile(FICHIER, "utf-8"));
        return migrer(brut);
    } catch {
        return {};   // pas de fichier (ou JSON cassé) → réglages par défaut
    }
}

// Ancien format : { "modele": "qwen2.5" }, sans notion de serveur.
// On le replie sur le serveur par défaut pour ne pas perdre le choix de l'utilisateur.
function migrer(brut: any): Preferences {
    if (brut && typeof brut.modele === "string" && !brut.serveurs) {
        log(`migration des préférences : modele "${brut.modele}" → serveur "ollama"`);
        return {
            actif: "ollama",
            serveurs: { ollama: { url: "http://127.0.0.1:11434", modele: brut.modele } },
        };
    }
    return brut ?? {};
}

export async function sauverPreferences(prefs: Preferences): Promise<void> {
    await mkdir(DOSSIER, { recursive: true });
    await writeFile(FICHIER, JSON.stringify(prefs, null, 2), "utf-8");
    log(`préférences sauvegardées — actif: ${prefs.actif}`);
}
