import React from "react";
import { Box, Text } from "ink";
import type { Commande } from "../../commands/liste";

// Liste des commandes qui correspondent à la saisie.
// La sélection se déplace avec ↑/↓ (ou Tab) ; Entrée complète et valide.
export function CommandPalette({ commandes, selection }: {
    commandes: Commande[];
    selection: number;
}) {
    if (commandes.length === 0) return null;

    // Largeur du nom la plus longue, pour aligner les descriptions.
    const largeur = Math.max(...commandes.map(c => c.nom.length));

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
            {commandes.map((c, i) => {
                const actif = i === selection;
                return (
                    <Box key={c.nom} gap={1}>
                        <Text color={actif ? "cyan" : "gray"}>{actif ? "❯" : " "}</Text>
                        <Text color={actif ? "cyan" : "white"} bold={actif}>
                            {c.nom.padEnd(largeur)}
                        </Text>
                        <Text color="gray">
                            {c.description}{c.arg ? ` <${c.arg}>` : ""}
                        </Text>
                    </Box>
                );
            })}
            <Text color="gray">↑/↓ naviguer · Entrée compléter</Text>
        </Box>
    );
}
