import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { TextInput } from "@inkjs/ui";

// L'outil ask_user en pratique : si le modèle a proposé des choix, une liste
// à sélectionner (comme la confirmation de commande) ; sinon un champ libre.
export function AskUserPanel({ question, choix, onReponse }: {
    question: string;
    choix?: string[];
    onReponse: (v: string) => void;
}) {
    return (
        <Box flexDirection="column" borderStyle="single" borderColor="blue" paddingX={2}>
            <Text color="blue">❓ {question}</Text>
            {choix && choix.length > 0 ? (
                <SelectInput
                    items={choix.map(c => ({ label: c, value: c }))}
                    onSelect={item => onReponse(item.value)}
                />
            ) : (
                <Box>
                    <Text color="blue">❯ </Text>
                    <TextInput placeholder="Ta réponse…" onSubmit={onReponse} />
                </Box>
            )}
        </Box>
    );
}
