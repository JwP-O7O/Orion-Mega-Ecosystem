// ORION AI Brain v0.4

const ORION = {
    name: "ORION",
    version: "0.4",

    memory: [],

    think(input) {

        this.memory.push({
            time: new Date().toISOString(),
            message: input
        });

        if (input.toLowerCase().includes("plan")) {
            return "Ik help je een plan maken. Ik zal het opdelen in duidelijke stappen.";
        }

        if (input.toLowerCase().includes("idee")) {
            return "Ik analyseer je idee en help het verbeteren.";
        }

        if (input.toLowerCase().includes("wie ben je")) {
            return "Ik ben ORION v0.4, jouw persoonlijke AI-orchestrator.";
        }

        return "Ik heb je opdracht ontvangen. Mijn redeneerlaag wordt verder uitgebreid.";
    }
};


function ORION_Request(message) {
    return ORION.think(message);
}
