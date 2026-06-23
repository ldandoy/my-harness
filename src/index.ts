import { ollama } from "./ollama";
import { MODEL, SYSTEME } from "./config";

async function main() {
    const question = process.argv.slice(2).join(" ") || "Dis-moi bonjour.";
    console.log(`🙋 ${question}\n`);

    const reponse = await ollama.chat({
        model: MODEL,
        messages: [
            { role: "system", content: SYSTEME },
            { role: "user", content: question },
        ],
    });

    console.log(`🤖 ${reponse.message.content}`);
}

main();


