import { COMMANDES_AUTORISEES } from "../config";
import { createInterface } from "node:readline/promises";

// Renvoie une raison de refus, ou null si la commande est autorisée.
export function refuser(commande: string): string | null {
    const programme = commande.trim().split(/\s+/)[0];
    if (!COMMANDES_AUTORISEES.includes(programme)) {
        return `Commande « ${programme} » hors liste blanche.`;
    }
    return null;
}

export async function demanderConfirmation(commande: string): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const reponse = await rl.question(`\n⚠️  Lancer « ${commande} » ? [o/N] `);
    rl.close();
    return reponse.trim().toLowerCase() === "o";
}