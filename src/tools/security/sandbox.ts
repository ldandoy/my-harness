import { resolve, relative, isAbsolute } from "node:path";

// Le bac à sable : l'agent ne peut RIEN toucher en dehors.
export const WORKSPACE = resolve("workspace");

// Résout un chemin DANS le workspace — et refuse les évasions (../../).
export function resoudre(chemin: string): string {
    const cible = resolve(WORKSPACE, chemin);
    const rel = relative(WORKSPACE, cible);
    if (rel.startsWith("..") || isAbsolute(rel)) {
        throw new Error(`Accès hors du workspace refusé : ${chemin}`);
    }
    return cible;
}