// src/index.tsx  ← extension .tsx obligatoire pour le JSX
import React from "react";
import { render } from "ink";
import { App } from "./ui/App";
import { resolve } from "node:path";
import { setWorkspace } from "./tools/security/sandbox";
import { initialiserServeurs } from "./serveurs";

const workspacePath = resolve(process.argv[2] ?? "workspace");
setWorkspace(workspacePath);

// Restaure le serveur choisi par /connect et le modèle qu'on y utilisait.
// Ces choix l'emportent sur le .env : ce sont les derniers gestes explicites.
await initialiserServeurs();

process.stdout.write("\x1Bc");

render(<App workspace={workspacePath} />);