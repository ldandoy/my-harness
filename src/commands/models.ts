import { OLLAMA_HOST, setModel } from "../config";

export async function listerModeles(): Promise<string[]> {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`);
    const data = await res.json() as { models: { name: string }[] };
    return data.models.map(m => m.name);
}

export function changerModele(nom: string): void {
    setModel(nom);
}