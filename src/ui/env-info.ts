import { basename } from "node:path";
import { execSync } from "node:child_process";

export type EnvInfo = { repertoire: string; branche: string };

export function obtenirInfosEnv(): EnvInfo {
    const repertoire = basename(process.cwd());
    let branche = "";
    try {
        branche = execSync(
            "git branch --show-current",
            { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
        ).trim();
    } catch {
        branche = ""; // pas dans un dépôt git → on affiche rien
    }
    return { repertoire, branche };
}