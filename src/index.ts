import { lancerAgent } from "./agent";

const tache = process.argv.slice(2).join(" ") || "Qu'y a-t-il dans le dossier courant ?";

console.log(`🎯 ${tache}`);
lancerAgent(tache);