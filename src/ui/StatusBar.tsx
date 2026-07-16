import React from "react";
import { Box, Text } from "ink";
import type { EnvInfo } from "./env-info";

export function StatusBar({ tokens, maxTokens, repertoire, branche }: {
    tokens: number;
    maxTokens: number;
} & EnvInfo) {
    const ratio = tokens / maxTokens;
    const filled = Math.round(ratio * 20);
    const color = ratio > 0.75 ? "red" : ratio > 0.5 ? "yellow" : "green";

    return (
        <Box borderStyle="single" borderColor={color} paddingX={2} gap={3}>
            <Text color="gray">{repertoire}</Text>
            {branche && <Text color="cyan">({branche})</Text>}
            <Text color={color}>{"▓".repeat(filled)}{"░".repeat(20 - filled)}</Text>
            <Text color={color}>{tokens} / {maxTokens} tok</Text>
            {ratio > 0.75 && <Text color="red">⚠</Text>}
        </Box>
    );
}

