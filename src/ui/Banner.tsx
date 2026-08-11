// src/ui/Banner.tsx
import React from "react";
import { Box, Text } from "ink";
type Props = {
    workspace: string;
    // Passés en props (et non lus depuis config) pour que /connect et /models
    // se voient immédiatement, sans redémarrage.
    serveur: string;
    modele: string;
};

// Wordmark ASCII 3 lignes — dégradé greenBright → green → cyan
const W = [
    "  ╔╦╗╦ ╦  ╦ ╦╔═╗╦═╗╔╗╔╔═╗╔═╗╔═╗",
    "  ║║║╚╦╝  ╠═╣╠═╣╠╦╝║║║║╣ ╚═╗╚═╗",
    "  ╩ ╩ ╩   ╩ ╩╩ ╩╩╚═╝╚╝╚═╝╚═╝╚═╝",
];

export function Banner({ workspace, serveur, modele }: Props) {
    return (
        <Box flexDirection="column" marginBottom={1}>
            <Text bold color="greenBright">{W[0]}</Text>
            <Text bold color="green"      >{W[1]}</Text>
            <Text color="cyan"       >{W[2]}</Text>
            <Box marginTop={1} marginLeft={4} gap={2}>
                <Text dimColor>{serveur}: {modele}</Text>
                <Text dimColor>{"  •  "}</Text>
                <Text color="cyan">{workspace}</Text>
            </Box>
            {/* || et non ?? : columns vaut 0 hors vrai terminal, et repeat(-2) lève. */}
            <Text color="green" dimColor>{"─".repeat(Math.max(1, (process.stdout.columns || 80) - 2))}</Text>
        </Box>
    );
}