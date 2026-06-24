import { describe, it, expect } from "vitest";
import { estAutorisee } from "../src/tools/security/garde-fou";

describe("estAutorisee", () => {
    it("reconnaît une commande présente dans la liste", () => {
        expect(estAutorisee("npm", ["npm", "node"])).toBe(true);
    });

    it("rejette une commande absente de la liste", () => {
        expect(estAutorisee("rm", ["npm", "node"])).toBe(false);
    });
});