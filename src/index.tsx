#!/usr/bin/env tsx

// src/index.tsx  ← extension .tsx obligatoire pour le JSX
import React from "react";
import { render } from "ink";
import { App } from "./ui/App";
import { resolve } from "node:path";
import { setWorkspace } from "./tools/security/sandbox";

const workspacePath = resolve(process.argv[2] ?? "workspace");
setWorkspace(workspacePath);

process.stdout.write("\x1Bc");

render(<App workspace={workspacePath} />);