import React from "react";
import { Box, Text } from "ink";
import type { EnvInfo } from "./env-info";
import { formatDuree } from "../format";

export function StatusBar({ tokens, maxTokens, repertoire, branche, modele, dureeSession }: {
    tokens: number;
    // null tant que la vraie taille de contexte du modèle n'est pas connue :
    // mieux vaut ne rien afficher qu'un 4096 par défaut trompeur.
    maxTokens: number | null;
    modele: string;
    dureeSession: number;   // ms depuis le lancement du harness
} & EnvInfo) {
    const pret = maxTokens !== null;
    const ratio = pret ? Math.min(tokens / maxTokens, 1) : 0;
    const filled = Math.max(0, Math.min(20, Math.round(ratio * 20)));
    const color = ratio > 0.75 ? "red" : ratio > 0.5 ? "yellow" : "green";
    const pourcentage = Math.round(ratio * 100);

    return (
        <Box flexDirection="column" paddingX={1}>
            <Box gap={3}>
                <Text bold color="green">◆ My Harness</Text>
                <Text color="gray">{modele}</Text>
                <Text color="gray">Utilisation</Text>
                {pret ? (
                    <>
                        <Text color={color}>{"▓".repeat(filled)}{"░".repeat(20 - filled)}</Text>
                        <Text color={color}>{tokens} / {maxTokens} tok ({pourcentage}%)</Text>
                        {ratio > 0.75 && <Text color="red">⚠</Text>}
                    </>
                ) : (
                    <Text color="gray" dimColor>…</Text>
                )}
            </Box>
            <Box gap={3}>
                {branche && <Text color="cyan">({branche})</Text>}
                <Text color="gray">{repertoire}</Text>
                <Text color="gray">({formatDuree(dureeSession)})</Text>
            </Box>
        </Box>
    );
}

