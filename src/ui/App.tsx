import React, { useState } from "react";
import { Box, Text } from "ink";
import { TextInput } from "@inkjs/ui";
import SelectInput from "ink-select-input";
import { Header } from "./Header";
import { Messages } from "./Messages";
import { lancerAgent } from "../agent";
import type { Ligne, ConfirmChoice } from "../types";

export function App() {
    const [lignes, setLignes] = useState<Ligne[]>([]);
    const [enCours, setEnCours] = useState(false);
    const [confirmState, setConfirmState] = useState<{
        prog: string;
        resolve: (v: ConfirmChoice) => void;
    } | null>(null);

    function demanderChoix(prog: string): Promise<ConfirmChoice> {
        return new Promise(resolve => setConfirmState({ prog, resolve }));
    }

    const ajouter = (role: Ligne["role"], text: string) =>
        setLignes(prev => [...prev, { role, text }]);

    async function soumettre(tache: string) {
        if (!tache.trim() || enCours) return;
        ajouter("user", `❯ ${tache}`);
        setEnCours(true);
        await lancerAgent(tache, {
            onTour: n => ajouter("tool", `\n===== TOUR ${n} =====`),
            onTool: (n, a) => ajouter("tool", `🔧 ${n}(${JSON.stringify(a)})`),
            onResponse: t => ajouter("agent", `🤖 ${t}`),
            onConfirm: demanderChoix,
        });
        setEnCours(false);
    }

    return (
        <Box flexDirection="column" padding={1}>
            <Header />
            <Messages lignes={lignes} enCours={enCours} />

            {!enCours && (
                <Box marginTop={1}>
                    <Text color="cyan">❯ </Text>
                    <TextInput
                        placeholder="Quelle est ta prochaine tâche ?"
                        onSubmit={soumettre}
                    />
                </Box>
            )}

            {confirmState && (
                <Box flexDirection="column" borderStyle="single"
                    borderColor="yellow" paddingX={2}>
                    <Text color="yellow">⚠ Autoriser "{confirmState.prog}" ?</Text>
                    <SelectInput
                        items={[
                            { label: "Une fois", value: "once" },
                            { label: "Toujours", value: "always" },
                            { label: "Refuser", value: "never" },
                        ]}
                        onSelect={item => {
                            confirmState.resolve(item.value as ConfirmChoice);
                            setConfirmState(null);
                        }}
                    />
                </Box>
            )}
        </Box>
    );
}