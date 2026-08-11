import type { AgentCallbacks } from "../types";
import { commandePlanifier } from "./planifier";
import { commandeRemember } from "./remember";
import { commandeConnect } from "./connect";
import { trouverCommande } from "./liste";

// Renvoie true si la saisie était une commande (donc déjà traitée),
// false si elle doit partir au LLM.
export async function intercepterCommandes(
    tache: string,
    cb: AgentCallbacks
): Promise<boolean> {
    const commande = trouverCommande(tache);
    if (!commande) return false;

    // Tout ce qui suit le nom de la commande en est l'argument.
    const argument = tache.trim().slice(commande.nom.length).trim();

    switch (commande.nom) {
        case "/planifier": await commandePlanifier(argument, cb); return true;
        case "/remember": await commandeRemember(argument, cb); return true;
        case "/connect": await commandeConnect(argument, cb); return true;
        default: return false;   // /models et /init sont gérés directement par l'UI
    }
}
