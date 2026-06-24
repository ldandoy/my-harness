import React from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";
import type { Ligne } from "../types";

const COULEUR = { user: "white", agent: "green", tool: "yellow" } as const;

export function Messages({ lignes, enCours }: {
    lignes: Ligne[];
    enCours: boolean;
}) {
    return (
        <Box flexDirection="column">
            {lignes.map((l, i) => (
                <Text key={i} color={COULEUR[l.role]}>{l.text}</Text>
            ))}
            {enCours && <Spinner label=" en cours..." />}
        </Box>
    );
}