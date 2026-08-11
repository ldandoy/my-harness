import { listerModeles as listerDepuis } from "../llm";
import { urlActive, retenirModele } from "../serveurs";
import type { AgentCallbacks } from "../types";

// Les modèles du serveur actuellement connecté.
export async function listerModeles(): Promise<string[]> {
    return listerDepuis(urlActive());
}

// Change le modèle et le mémorise SUR LE SERVEUR ACTIF : un nom de modèle
// n'a pas de sens d'un backend à l'autre.
export async function changerModele(nom: string): Promise<void> {
    await retenirModele(nom);
}

export async function commandeModels(cb: AgentCallbacks): Promise<void> {
    const modeles = await listerModeles();
    const liste = modeles.map((m, i) => `  ${i + 1}. ${m}`).join("\n");
    cb.onResponse?.(
        `Modèles disponibles sur ${urlActive()} :\n${liste}\n\nTape /models pour changer.`
    );
}
