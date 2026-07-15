import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { useEffect, useState } from "react";
import { listerModeles, changerModele } from "../../commands/models";

type Props = {
    onDone: (modele: string) => void;
};

export function ModelPicker({ onDone }: Props) {
    const [liste, setListe] = useState<string[]>([]);

    useEffect(() => {
        listerModeles().then(setListe);
    }, []);

    if (liste.length === 0) return <Text color="gray">Chargement…</Text>;

    return (
        <Box flexDirection="column" marginY={1}>
            <Text color="cyan">Modèles disponibles :</Text>
            <SelectInput
                items={liste.map(m => ({ label: m, value: m }))}
                onSelect={item => {
                    changerModele(item.value);
                    onDone(item.value);   // ← remonte le modèle choisi à App.tsx
                }}
            />
        </Box>
    );
}