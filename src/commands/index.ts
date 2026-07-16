import type { AgentCallbacks } from "../types";
import { commandeModels } from "./models";
import { commandePlanifier } from "./planifier";

export async function intercepterCommandes(
    tache: string,
    cb: AgentCallbacks
): Promise<boolean> {
    if (tache.trim() === "/models") { await commandeModels(cb); return true; }

    if (tache.startsWith("/planifier ")) { await commandePlanifier(tache.slice("/planifier ".length).trim(), cb); return true; }

    return false; // pas une commande → l'appelant envoie au LLM
}