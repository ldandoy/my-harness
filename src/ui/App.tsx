import React, { useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
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
import { CommandPalette } from "./commands/CommandPalette";
import { filtrerCommandes, completion, trouverCommande } from "../commands/liste";
import { serveurActif } from "../serveurs";
import { MODEL } from "../config";

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

    // Serveur et modèle courants, en état local : /connect et /models les font
    // changer en cours de session, la bannière doit suivre sans redémarrage.
    const [serveur, setServeur] = useState(() => serveurActif());
    const [modele, setModele] = useState(() => MODEL);
    const rafraichirEtat = () => { setServeur(serveurActif()); setModele(MODEL); };

    // --- Autocomplétion des commandes ---
    const [saisie, setSaisie] = useState("");
    const [selection, setSelection] = useState(0);
    // TextInput n'est pas contrôlé : changer cette clé le remonte et vide le champ.
    const [cleInput, setCleInput] = useState(0);

    const commandes = filtrerCommandes(saisie);
    const paletteOuverte = commandes.length > 0;

    // TextInput ignore ↑/↓ et Tab (il ne gère que le curseur horizontal) :
    // on peut donc les capter ici sans lui voler ses touches.
    useInput((_input, key) => {
        if (key.upArrow) setSelection(s => (s - 1 + commandes.length) % commandes.length);
        else if (key.downArrow || key.tab) setSelection(s => (s + 1) % commandes.length);
    }, { isActive: paletteOuverte && !enCours && !showModelPicker && !confirmState });

    // On place la commande sélectionnée en tête : TextInput complète toujours
    // avec la 1re suggestion qui correspond, donc la liste et le texte fantôme
    // restent alignés sur ce qui est surligné.
    const suggestions = paletteOuverte
        ? [completion(commandes[selection]!),
        ...commandes.filter((_, i) => i !== selection).map(completion)]
        : undefined;

    // TextInput rappelle onChange à chaque re-rendu tant que sa valeur diffère de
    // sa previousValue (son useEffect dépend de l'identité de onChange, recréée à
    // chaque rendu). Sans ce garde-fou, déplacer la sélection provoque un rendu
    // qui la remet aussitôt à 0 — les flèches semblent alors sans effet.
    function surChangement(v: string) {
        if (v === saisie) return;
        setSaisie(v);
        setSelection(0);   // la saisie a vraiment changé → on repart du premier
    }

    function demanderChoix(prog: string): Promise<ConfirmChoice> {
        return new Promise(resolve => setConfirmState({ prog, resolve }));
    }

    const ajouter = (role: Ligne["role"], text: string) =>
        setLignes(prev => [...prev, { role, text }]);

    // Vrai tant qu'une ligne de réponse est "ouverte" et reçoit des fragments.
    const streamOuvert = useRef(false);

    // Premier fragment → on crée la ligne ; les suivants → on la complète.
    const onChunk = (delta: string) => {
        const premier = !streamOuvert.current;
        streamOuvert.current = true;
        setLignes(prev => premier
            ? [...prev, { role: "agent", text: `🤖 ${delta}` }]
            : [
                ...prev.slice(0, -1),
                { ...prev[prev.length - 1], text: prev[prev.length - 1].text + delta },
            ]);
    };

    // Fin de réponse : on remplace la ligne streamée par le texte complet
    // (au cas où le modèle n'aurait rien streamé, on ajoute une ligne).
    const onResponse = (t: string) => {
        if (!streamOuvert.current) { ajouter("agent", `🤖 ${t}`); return; }
        streamOuvert.current = false;
        setLignes(prev => [...prev.slice(0, -1), { role: "agent", text: `🤖 ${t}` }]);
    };

    // Chaque nouveau tour repart d'une ligne neuve : sinon le texte d'un tour
    // qui se termine par un appel d'outil (donc sans onResponse) se ferait
    // compléter par les fragments du tour suivant.
    function creerCallbacks(): AgentCallbacks {
        return {
            onTour: n => {
                streamOuvert.current = false;
                ajouter("tool", `\n===== TOUR ${n} =====`);
            },
            onTool: (n, a) => {
                streamOuvert.current = false;
                ajouter("tool", `🔧 ${n}(${JSON.stringify(a)})`);
            },
            onChunk,
            onResponse,
            onConfirm: demanderChoix,
            onTokens: (prompt, _r, max) => {
                setTokens(prompt);
                setMaxTokens(max);
            },
        };
    }

    async function soumettre(tache: string) {
        log(`soumettre() — "${tache}"`);

        // Vide le champ et referme la palette, quel que soit le chemin pris ensuite.
        setSaisie("");
        setSelection(0);
        setCleInput(k => k + 1);

        if (tache.trim() === "") return;

        // Entrée sur une commande complétée mais sans son argument :
        // on rappelle l'usage au lieu de la lancer à vide.
        const commande = trouverCommande(tache);
        if (commande?.argRequis && tache.trim() === commande.nom) {
            ajouter("tool", `Usage : ${commande.nom} <${commande.arg}>`);
            return;
        }

        const cb: AgentCallbacks = creerCallbacks();

        if (tache.trim() === "/models") {
            setShowModelPicker(true);
            return;
        }

        if (tache.trim() === "/init") {
            setEnCours(true);
            await cmdInit(creerCallbacks());
            setEnCours(false);
            return;
        }

        // /connect peut changer serveur ET modèle : on resynchronise la bannière.
        if (await intercepterCommandes(tache, cb)) { rafraichirEtat(); return; }

        ajouter("user", `❯ ${tache}`);
        setEnCours(true);
        await lancerAgent(tache, cb);
        setEnCours(false);
        log("lancerAgent() terminé");
    }

    return (
        <Box flexDirection="column" padding={1}>
            <Banner workspace={workspace} serveur={serveur} modele={modele} />
            <Messages lignes={lignes} enCours={enCours} />

            {!enCours && !showModelPicker && (
                <Box flexDirection="column" marginTop={1}>
                    {/* Bordure haut/bas seulement : elle souligne la zone de
                        saisie sans l'enfermer dans un cadre. */}
                    <Box
                        borderStyle="single"
                        borderColor="gray"
                        borderLeft={false}
                        borderRight={false}
                        paddingX={1}
                    >
                        <Text color="cyan">❯ </Text>
                        <TextInput
                            key={cleInput}
                            placeholder="Quelle est ta prochaine tâche ? (/ pour les commandes)"
                            suggestions={suggestions}
                            onChange={surChangement}
                            onSubmit={soumettre}
                        />
                    </Box>
                    <CommandPalette commandes={commandes} selection={selection} />
                </Box>
            )}

            {showModelPicker && (
                <ModelPicker
                    onDone={choisi => {
                        ajouter("tool", `✓ Modèle changé : ${choisi}`);
                        setModele(choisi);
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