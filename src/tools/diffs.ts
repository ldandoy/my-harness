// Calcule et diffuse le diff d'une écriture de fichier vers l'UI — même
// principe que jobs.ts : l'outil (write_file) ne connaît pas l'UI, il émet
// juste un événement que l'UI câble à l'affichage.
import { diffLines } from "diff";

export type LigneDiff = { type: "ajout" | "suppr" | "contexte"; texte: string };

const CONTEXTE = 2;      // lignes de contexte gardées autour d'un changement
const MAX_LIGNES = 60;   // au-delà, on tronque plutôt que d'inonder le scrollback

// Diff compact façon git : seuls les changements et quelques lignes de
// contexte autour sont gardés — pas le fichier entier, sinon une petite
// retouche sur un gros fichier noierait le scrollback.
export function calculerDiff(avant: string, apres: string): LigneDiff[] {
    if (avant === apres) return [];

    const brut: LigneDiff[] = [];
    for (const part of diffLines(avant, apres)) {
        const type = part.added ? "ajout" : part.removed ? "suppr" : "contexte";
        const lignes = part.value.split("\n");
        if (lignes[lignes.length - 1] === "") lignes.pop();   // \n final de diffLines
        for (const texte of lignes) brut.push({ type, texte });
    }

    const procheChangement = (i: number) => {
        for (let d = -CONTEXTE; d <= CONTEXTE; d++) {
            const v = brut[i + d];
            if (v && v.type !== "contexte") return true;
        }
        return false;
    };

    const compact: LigneDiff[] = [];
    brut.forEach((ligne, i) => {
        if (ligne.type !== "contexte" || procheChangement(i)) {
            compact.push(ligne);
        } else if (compact[compact.length - 1]?.texte !== "⋯") {
            compact.push({ type: "contexte", texte: "⋯" });
        }
    });

    if (compact.length <= MAX_LIGNES) return compact;
    return [
        ...compact.slice(0, MAX_LIGNES),
        { type: "contexte", texte: `⋯ ${compact.length - MAX_LIGNES} lignes supplémentaires non affichées` },
    ];
}

export type DiffEntree = {
    id: number;
    chemin: string;
    lignes: LigneDiff[];
    nouveauFichier: boolean;
    resume: string;   // "+8 -4", pour la ligne compacte affichée par défaut
};

function resumer(lignes: LigneDiff[]): string {
    const ajouts = lignes.filter(l => l.type === "ajout").length;
    const suppr = lignes.filter(l => l.type === "suppr").length;
    return `+${ajouts} -${suppr}`;
}

// Historique de la session : chaque écriture garde son diff complet ici,
// consultable ensuite via /diff <id> même si sa ligne compacte a défilé.
const historique: DiffEntree[] = [];
let compteur = 0;

type OnFileDiff = (entree: DiffEntree) => void;
let _onFileDiff: OnFileDiff | undefined;

export function setDiffCallback(fn?: OnFileDiff): void {
    _onFileDiff = fn;
}

// Rien à afficher si le contenu écrit est identique à l'existant.
export function emettreDiff(chemin: string, avant: string, apres: string, nouveauFichier: boolean): void {
    const lignes = calculerDiff(avant, apres);
    if (lignes.length === 0) return;

    const entree: DiffEntree = { id: ++compteur, chemin, lignes, nouveauFichier, resume: resumer(lignes) };
    historique.push(entree);
    _onFileDiff?.(entree);
}

// /diff (sans argument) → le plus récent ; /diff <id> → celui-là précisément.
export function trouverDiff(id?: number): DiffEntree | undefined {
    return id === undefined ? historique[historique.length - 1] : historique.find(d => d.id === id);
}
