// src/ui/Banner.tsx
import React from "react";
import { Box, Text } from "ink";
import { MODEL } from "../config";

type Props = { workspace: string };

// Wordmark ASCII 3 lignes — dégradé greenBright → green → cyan
const W = [
    "  ╔╦╗╦ ╦  ╦ ╦╔═╗╦═╗╔╗╔╔═╗╔═╗╔═╗",
    "  ║║║╚╦╝  ╠═╣╠═╣╠╦╝║║║║╣ ╚═╗╚═╗",
    "  ╩ ╩ ╩   ╩ ╩╩ ╩╩╚═╝╚╝╚═╝╚═╝╚═╝",
];

export function Banner({ workspace }: Props) {
    return (
        <Box flexDirection="column" marginBottom={1}>
            <Text bold color="greenBright">{W[0]}</Text>
            <Text bold color="green"      >{W[1]}</Text>
            <Text color="cyan"       >{W[2]}</Text>
            <Box marginTop={1} marginLeft={4} gap={2}>
                <Text dimColor>Ollama local: {MODEL}</Text>
                <Text dimColor>{"  •  "}</Text>
                <Text color="cyan">{workspace}</Text>
            </Box>
            <Text color="green" dimColor>{"─".repeat((process.stdout.columns ?? 80) - 2)}</Text>
        </Box>
    );
}