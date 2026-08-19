// Coupe un texte trop long pour l'afficher proprement dans le terminal.
export function truncate(texte: string, max = 500): string {
    if (texte.length <= max) return texte;
    return texte.slice(0, max) + " […]";
}

// Durée lisible : secondes (avec décimale sous 10s), puis minutes, puis
// heures — l'unité la plus parlante selon l'ordre de grandeur, jamais
// un gros nombre de secondes brutes.
export function formatDuree(ms: number): string {
    const s = ms / 1000;
    if (s < 10) return `${s.toFixed(1)}s`;
    if (s < 60) return `${Math.round(s)}s`;

    const min = Math.floor(s / 60);
    if (min < 60) return `${min}min`;

    const h = Math.floor(min / 60);
    const resteMin = min % 60;
    return resteMin === 0 ? `${h}h` : `${h}h${String(resteMin).padStart(2, "0")}`;
}