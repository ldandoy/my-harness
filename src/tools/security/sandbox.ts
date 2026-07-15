import { resolve, relative, isAbsolute } from "node:path";

// Le bac à sable : l'agent ne peut RIEN toucher en dehors.
export let WORKSPACE = resolve("workspace");

export function setWorkspace(dirPath: string): void {
    WORKSPACE = resolve(dirPath);  // ← met à jour la live binding ESM
}

// Résout un chemin DANS le workspace — et refuse les évasions (../../).
export function resoudre(chemin: string): string {
    const cible = resolve(WORKSPACE, chemin);
    const rel = relative(WORKSPACE, cible);
    if (rel.startsWith("..") || isAbsolute(rel)) {
        throw new Error(`Accès hors du workspace refusé : ${chemin}`);
    }
    return cible;
}