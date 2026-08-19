// Registre des serveurs LLM : chaque entrée porte un nom, une URL, et le
// modèle qu'on utilisait sur ce serveur. Basculer avec /connect restaure donc
// le bon modèle — un nom de modèle n'a aucun sens d'un backend à l'autre.

import { chargerPreferences, sauverPreferences, type Serveur } from "./preferences";
import { OLLAMA_HOST, setModel, setHost, MODEL, normaliserUrl } from "./config";
import { log } from "./logger";

export type { Serveur };

// Serveurs proposés d'office, pour que /connect soit utilisable sans configuration.
export const SERVEURS_PAR_DEFAUT: Record<string, Serveur> = {
    ollama: { url: OLLAMA_HOST },
    "llama-server": { url: "http://127.0.0.1:8080" },
};

let serveurs: Record<string, Serveur> = { ...SERVEURS_PAR_DEFAUT };
let actif = "ollama";

export function serveurActif(): string { return actif; }
export function urlActive(): string { return serveurs[actif]?.url ?? OLLAMA_HOST; }
export function tousLesServeurs(): Record<string, Serveur> { return { ...serveurs }; }

// Au démarrage : on fusionne les serveurs par défaut avec ceux enregistrés,
// puis on applique le serveur actif (URL + son modèle) à la config globale.
export async function initialiserServeurs(): Promise<void> {
    const prefs = await chargerPreferences();
    serveurs = { ...SERVEURS_PAR_DEFAUT, ...(prefs.serveurs ?? {}) };
    actif = prefs.actif && serveurs[prefs.actif] ? prefs.actif : "ollama";
    appliquer();
    log(`serveur actif : ${actif} (${urlActive()}) — modèle ${MODEL}`);
}

function appliquer(): void {
    setHost(urlActive());
    const modele = serveurs[actif]?.modele;
    if (modele) setModel(modele);
}

async function persister(): Promise<void> {
    await sauverPreferences({ actif, serveurs });
}

// Bascule sur un serveur connu, ou en enregistre un nouveau si `url` est fourni.
export async function connecter(nom: string, url?: string): Promise<Serveur> {
    if (url) serveurs[nom] = { ...serveurs[nom], url: normaliserUrl(url) };
    const serveur = serveurs[nom];
    if (!serveur) {
        throw new Error(
            `Serveur inconnu : "${nom}". Connus : ${Object.keys(serveurs).join(", ")}. ` +
            `Ajoute-le avec /connect ${nom} <url>`
        );
    }
    actif = nom;
    appliquer();
    await persister();
    return serveur;
}

// Mémorise le modèle SUR LE SERVEUR ACTIF (et pas globalement).
export async function retenirModele(modele: string): Promise<void> {
    serveurs[actif] = { ...serveurs[actif]!, modele };
    setModel(modele);
    await persister();
}

// Une saisie qui ressemble à une URL crée/met à jour un serveur du même nom.
export function estUneUrl(v: string): boolean {
    return /^https?:\/\//i.test(v);
}
