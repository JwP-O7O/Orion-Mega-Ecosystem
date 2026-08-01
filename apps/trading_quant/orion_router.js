// ORION v0.6 Modular Model Router & LLM Dispatcher
// Integrated into Neural Nexus

const OLLAMA_DEFAULT_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/chat";

/**
 * Determines the optimal LLM model based on prompt intent.
 * @param {string} message - The input message prompt
 * @returns {string} The selected model name
 */
function chooseModel(message) {
    if (!message || typeof message !== 'string') {
        return "hermes3:8b";
    }
    const text = message.toLowerCase();

    if (
        text.includes("analyse") ||
        text.includes("onderzoek") ||
        text.includes("vergelijk") ||
        text.includes("strategie")
    ) {
        return "gemma4:31b-cloud";
    }

    if (
        text.includes("denk diep") ||
        text.includes("redeneer") ||
        text.includes("architectuur")
    ) {
        return "kimi-k2.6:cloud";
    }

    return "hermes3:8b";
}

/**
 * Dispatch message to Ollama chat endpoint with fallback error handling.
 * @param {string} message 
 * @param {string} customUrl 
 * @returns {Promise<{model: string, answer: string}>}
 */
async function ORION_Think(message, customUrl = OLLAMA_DEFAULT_URL) {
    const model = chooseModel(message);
    try {
        const response = await fetch(customUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: "Je bent ORION, een persoonlijke AI-orchestrator." },
                    { role: "user", content: message }
                ],
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            model: model,
            answer: data.message?.content || "Geen inhoud ontvangen van model."
        };
    } catch (error) {
        return {
            model: model,
            answer: `ORION Router Notice: Kon model '${model}' niet bereiken via ${customUrl}. (${error.message})`
        };
    }
}

module.exports = {
    chooseModel,
    ORION_Think,
    OLLAMA_DEFAULT_URL
};
