import React from "react";
import { Box, Text } from "ink";

export type JobActif = { commande: string; sortie: string };

// Nombre de dernières lignes affichées par job : on ne veut pas qu'un
// serveur bavard (webpack, vite…) fasse exploser la hauteur du terminal.
const LIGNES_AFFICHEES = 8;

// Panneau "live" (hors <Static>) : contrairement aux blocs du scrollback,
// il se redessine à chaque nouveau fragment de sortie tant que le job tourne.
export function JobsPanel({ jobs }: { jobs: Record<string, JobActif> }) {
    const entrees = Object.entries(jobs);
    if (entrees.length === 0) return null;

    return (
        <Box flexDirection="column" marginTop={1}>
            {entrees.map(([id, job]) => {
                const lignes = job.sortie.split("\n").filter(Boolean).slice(-LIGNES_AFFICHEES);
                return (
                    <Box key={id} flexDirection="column" borderStyle="round"
                        borderColor="green" paddingX={1} marginBottom={1}>
                        <Text color="green">
                            🖥 {job.commande} <Text color="gray">({id}, en cours…)</Text>
                        </Text>
                        {lignes.map((l, i) => <Text key={i} color="gray">{l}</Text>)}
                    </Box>
                );
            })}
        </Box>
    );
}
