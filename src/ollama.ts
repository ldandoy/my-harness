import { Ollama } from "ollama";
import { OLLAMA_HOST } from "./config";

// Un client unique, pointé sur notre Ollama local.
export const ollama = new Ollama({ host: OLLAMA_HOST });