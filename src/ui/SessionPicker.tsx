import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { SessionMeta } from "../session";

// /resume sans argument : plus besoin de recopier un id, on choisit direct
// dans la liste (même principe que ModelPicker pour /models).
export function SessionPicker({ sessions, onChoisir }: {
    sessions: SessionMeta[];
    onChoisir: (id: string) => void;
}) {
    return (
        <Box flexDirection="column" marginY={1}>
            <Text color="cyan">Sessions sauvegardées :</Text>
            <SelectInput
                items={sessions.map(s => ({
                    label: `${s.titre}  —  ${new Date(s.misAJourLe).toLocaleString("fr-FR")}`,
                    value: s.id,
                }))}
                onSelect={item => onChoisir(item.value)}
            />
        </Box>
    );
}
