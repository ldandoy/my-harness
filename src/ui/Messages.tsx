import React from "react";
import { Box, Static, Text } from "ink";
import { Spinner } from "@inkjs/ui";
import type { Ligne } from "../types";

const COULEUR = { user: "white", agent: "green", tool: "yellow" } as const;

export function Messages({ lignes, ligneEnCours, enCours }: {
    lignes: Ligne[];              // lignes closes : ne bougent plus, jamais redessinées
    ligneEnCours: Ligne | null;   // la ligne en train de streamer, ou rien
    enCours: boolean;
}) {
    return (
        <Box flexDirection="column">
            <Static items={lignes}>
                {(l, i) => <Text key={i} color={COULEUR[l.role]}>{l.text}</Text>}
            </Static>
            {ligneEnCours && (
                <Text color={COULEUR[ligneEnCours.role]}>{ligneEnCours.text}</Text>
            )}
            {enCours && <Spinner label=" en cours..." />}
        </Box>
    );
}