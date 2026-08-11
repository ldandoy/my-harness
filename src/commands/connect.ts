import { connecter, estUneUrl, tousLesServeurs, serveurActif } from "../serveurs";
import { listerModeles } from "../llm";
import type { AgentCallbacks } from "../types";
import { log } from "../logger";

// /connect <nom>            → bascule sur un serveur connu
// /connect <nom> <url>      → enregistre (ou met à jour) puis bascule
// /connect <url>            → serveur anonyme, nommé d'après son hôte:port
export async function commandeConnect(
    argument: string,
    cb: AgentCallbacks
): Promise<void> {
    const morceaux = argument.trim().split(/\s+/).filter(Boolean);
    if (morceaux.length === 0) { listerServeurs(cb); return; }

    let [nom, url] = morceaux as [string, string | undefined];

    // "/connect http://…" : on dérive un nom lisible de l'URL.
    if (!url && estUneUrl(nom)) {
        url = nom;
        try { nom = new URL(url).host; } catch { /* on garde l'URL comme nom */ }
    }

    try {
        const serveur = await connecter(nom, url);
        log(`/connect — ${nom} → ${serveur.url}`);

        // On vérifie tout de suite que le serveur répond : se rendre compte
        // d'une URL erronée au premier prompt serait bien plus déroutant.
        let dispo: string[] = [];
        try {
            dispo = await listerModeles(serveur.url);
        } catch (e) {
            cb.onResponse?.(
                `⚠ Connecté à "${nom}" (${serveur.url}) mais le serveur ne répond pas : ` +
                `${(e as Error).message}`
            );
            return;
        }

        const modele = serveur.modele && dispo.includes(serveur.modele)
            ? serveur.modele
            : dispo[0];

        // Le modèle mémorisé peut ne plus exister sur ce serveur.
        if (modele && modele !== serveur.modele) {
            const { retenirModele } = await import("../serveurs");
            await retenirModele(modele);
        }

        cb.onResponse?.(
            `✓ Connecté à "${nom}" — ${serveur.url}\n` +
            `  modèle : ${modele ?? "aucun"}\n` +
            `  ${dispo.length} modèle(s) disponible(s)`
        );
    } catch (e) {
        cb.onResponse?.(`✗ ${(e as Error).message}`);
    }
}

function listerServeurs(cb: AgentCallbacks): void {
    const serveurs = tousLesServeurs();
    const actif = serveurActif();
    const lignes = Object.entries(serveurs).map(([nom, s]) =>
        `  ${nom === actif ? "❯" : " "} ${nom.padEnd(14)} ${s.url}` +
        (s.modele ? `  (${s.modele})` : "")
    );
    cb.onResponse?.(
        `Serveurs :\n${lignes.join("\n")}\n\n` +
        `/connect <nom>        bascule\n` +
        `/connect <nom> <url>  enregistre puis bascule`
    );
}
