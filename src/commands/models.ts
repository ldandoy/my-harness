import { OLLAMA_HOST, setModel } from "../config";
import type { AgentCallbacks } from "../types";

export async function listerModeles(): Promise<string[]> {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`);
    const data = await res.json() as { models: { name: string }[] };
    return data.models.map(m => m.name);
}

export function changerModele(nom: string): void {
    setModel(nom);
}

export async function commandeModels(cb: AgentCallbacks): Promise<void> {
    const modeles = await listerModeles();
    const liste = modeles.map((m, i) => `  ${i + 1}. ${m}`).join("\n");
    cb.onResponse?.(
        `Modèles disponibles :\n${liste}\n\nTape /models <nom> pour changer.`
    );
}