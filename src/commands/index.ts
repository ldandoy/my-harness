import type { AgentCallbacks } from "../types";
import { commandePlanifier } from "./planifier";
import { commandeRemember } from "./remember";

export async function intercepterCommandes(
    tache: string,
    cb: AgentCallbacks
): Promise<boolean> {
    if (tache.startsWith("/planifier ")) { await commandePlanifier(tache.slice("/planifier ".length).trim(), cb); return true; }

    if (tache.startsWith("/remember "))            // ← AJOUT
    { await commandeRemember(tache.slice("/remember ".length).trim(), cb); return true; }

    return false; // pas une commande → l'appelant envoie au LLM
}