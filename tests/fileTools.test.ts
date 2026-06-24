import { describe, it, expect } from "vitest";
import { rm } from "node:fs/promises";
import { writeFile } from "../src/tools/writeFile";
import { readFile } from "../src/tools/readFile";
import { resoudre } from "../src/tools/security/sandbox";

describe("write_file & read_file", () => {
    it("écrit puis relit un fichier", async () => {
        await writeFile.run({ path: "essai.txt", content: "bonjour" });
        expect(await readFile.run({ path: "essai.txt" })).toBe("bonjour");
        await rm(resoudre("essai.txt"));               // nettoyage
    });

    it("write_file refuse de sortir du workspace", async () => {
        await expect(writeFile.run({ path: "../pirate.txt", content: "x" }))
            .rejects.toThrow(/refusé/);
    });
});