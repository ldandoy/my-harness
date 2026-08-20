import React from "react";
import { Box, Text } from "ink";
import type { LigneDiff } from "../tools/diffs";

const COULEUR = { ajout: "green", suppr: "red", contexte: "gray" } as const;
const PREFIXE = { ajout: "+", suppr: "-", contexte: " " } as const;

// Un bloc figé de plus (comme les autres lignes du scrollback) : le diff
// entier reste consultable en remontant dans le terminal, sans widget de
// scroll dédié — Ink n'en offre pas pour du contenu figé.
export function DiffView({ chemin, lignes, nouveauFichier }: {
    chemin: string;
    lignes: LigneDiff[];
    nouveauFichier: boolean;
}) {
    return (
        <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} marginY={1}>
            <Text color="magenta" bold>
                📝 {chemin}{nouveauFichier ? " (nouveau fichier)" : ""}
            </Text>
            {lignes.map((l, i) => (
                <Text key={i} color={COULEUR[l.type]}>{PREFIXE[l.type]} {l.texte}</Text>
            ))}
        </Box>
    );
}
