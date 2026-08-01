// ORION v0.6 Model Router

const OLLAMA_URL = "http://localhost:11434/api/chat";


function chooseModel(message) {

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
        text.includes("redeneer")
    ) {
        return "kimi-k2.6:cloud";
    }


    return "hermes3:8b";

}



async function ORION_Think(message) {

    const model = chooseModel(message);


    const response = await fetch(
        OLLAMA_URL,
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({

                model:model,

                messages:[
                    {
                        role:"system",
                        content:
                        "Je bent ORION, een persoonlijke AI-orchestrator."
                    },
                    {
                        role:"user",
                        content:message
                    }
                ],

                stream:false

            })
        }
    );


    const data = await response.json();


    return {
        model:model,
        answer:data.message.content
    };

}
