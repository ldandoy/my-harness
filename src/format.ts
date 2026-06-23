// Coupe un texte trop long pour l'afficher proprement dans le terminal.
export function truncate(texte: string, max = 500): string {
    if (texte.length <= max) return texte;
    return texte.slice(0, max) + " […]";
}