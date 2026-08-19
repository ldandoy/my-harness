import React from "react";
import { Box, Static, Text } from "ink";
import { Spinner } from "@inkjs/ui";
import type { Ligne } from "../types";

const COULEUR = { user: "cyan", agent: "green", tool: "yellow" } as const;

// Un bloc static peut être une simple ligne de texte colorée (chat, outil…)
// ou un élément riche (la bannière) : Static ne rejoue jamais ce qui est fermé,
// donc tout ce qui doit rester figé — bannière comprise — doit y transiter.
export type Bloc = { key: string; node: React.ReactNode };

export function ligneVersBloc(cle: string, ligne: Ligne): Bloc {
    // Le prompt utilisateur se distingue du reste (réponses, sorties d'outil…)
    // par un cadre, plutôt qu'une simple couleur — plus facile à repérer quand
    // le flux entre deux prompts est long.
    if (ligne.role === "user") {
        return {
            key: cle,
            node: (
                <Box borderStyle="round" borderColor="cyan" paddingX={1} marginY={1}>
                    <Text color="cyan">{ligne.text}</Text>
                </Box>
            ),
        };
    }
    return { key: cle, node: <Text color={COULEUR[ligne.role]}>{ligne.text}</Text> };
}

export function Messages({ blocs, ligneEnCours, enCours }: {
    blocs: Bloc[];                 // blocs clos : ne bougent plus, jamais redessinés
    ligneEnCours: Ligne | null;    // la ligne en train de streamer, ou rien
    enCours: boolean;
}) {
    return (
        <Box flexDirection="column">
            <Static items={blocs}>
                {b => <Box key={b.key}>{b.node}</Box>}
            </Static>
            {ligneEnCours && (
                <Text color={COULEUR[ligneEnCours.role]}>{ligneEnCours.text}</Text>
            )}
            {enCours && <Spinner label=" en cours..." />}
        </Box>
    );
}