import React, { useState } from "react";
import { Box, Text } from "ink";
import { TextInput } from "@inkjs/ui";
import SelectInput from "ink-select-input";
import { Messages } from "./Messages";
import { lancerAgent } from "../agent";
import type { Ligne, ConfirmChoice } from "../types";
import { ModelPicker } from "./commands/ModelPicker";
import { log } from "../logger";
import { Banner } from "./Banner";
import { cmdInit } from "../commands/init";
import type { AgentCallbacks } from "../types";
import { intercepterCommandes } from "../commands";
import { StatusBar } from "./StatusBar";
import { obtenirInfosEnv } from "./env-info";

export function App({ workspace }: { workspace: string }) {
    const [lignes, setLignes] = useState<Ligne[]>([]);
    const [enCours, setEnCours] = useState(false);
    const [confirmState, setConfirmState] = useState<{
        prog: string;
        resolve: (v: ConfirmChoice) => void;
    } | null>(null);
    const [showModelPicker, setShowModelPicker] = useState(false);

    const [envInfo] = useState(
        () => obtenirInfosEnv()
    );

    const [tokens, setTokens]
        = useState(0);
    const [maxTokens, setMaxTokens]
        = useState(4096);

    function demanderChoix(prog: string): Promise<ConfirmChoice> {
        return new Promise(resolve => setConfirmState({ prog, resolve }));
    }

    const ajouter = (role: Ligne["role"], text: string) =>
        setLignes(prev => [...prev, { role, text }]);

    async function soumettre(tache: string) {
        log(`soumettre() — "${tache}"`);

        const cb: AgentCallbacks = {
            onTour: n => ajouter("tool", `\n===== TOUR ${n} =====`),
            onTool: (n, a) => ajouter("tool", `🔧 ${n}(${JSON.stringify(a)})`),
            onResponse: t => ajouter("agent", `🤖 ${t}`),
            onConfirm: demanderChoix,
        };

        if (tache.trim() === "/models") {
            setShowModelPicker(true);
            return;
        }

        if (tache.trim() === "/init") {
            setEnCours(true);
            await cmdInit({
                onTour: n => ajouter("tool", `\n===== TOUR ${n} =====`),
                onTool: (n, a) => ajouter("tool", `🔧 ${n}(${JSON.stringify(a)})`),
                onResponse: t => ajouter("assistant", `🤖 ${t}`),
                onConfirm: demanderChoix,
            });
            setEnCours(false);
            return;
        }

        if (await intercepterCommandes(tache, cb)) return;

        ajouter("user", `❯ ${tache}`);
        setEnCours(true);
        await lancerAgent(tache, {
            onTour: n => ajouter("tool", `\n===== TOUR ${n} =====`),
            onTool: (n, a) => ajouter("tool", `🔧 ${n}(${JSON.stringify(a)})`),
            onResponse: t => ajouter("agent", `🤖 ${t}`),
            onConfirm: demanderChoix,
            onTokens: (prompt, _r, max) => {
                setTokens(prompt); // re-render
                setMaxTokens(max);
            },
        });
        setEnCours(false);
        log("lancerAgent() terminé");
    }

    return (
        <Box flexDirection="column" padding={1}>
            <Banner workspace={workspace} />
            <Messages lignes={lignes} enCours={enCours} />

            {!enCours && !showModelPicker && (
                <Box marginTop={1}>
                    <Text color="cyan">❯ </Text>
                    <TextInput placeholder="Quelle est ta prochaine tâche ?" onSubmit={soumettre} />
                </Box>
            )}

            {showModelPicker && (
                <ModelPicker
                    onDone={modele => {
                        ajouter("tool", `✓ Modèle changé : ${modele}`);
                        setShowModelPicker(false);
                    }}
                />
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

            <StatusBar
                {...envInfo}
                tokens={tokens}
                maxTokens={maxTokens}
            />
        </Box>
    );
}