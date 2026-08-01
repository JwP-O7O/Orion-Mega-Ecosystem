import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const OLLAMA_URL = "http://localhost:11434/api/chat";


function chooseModel(message) {

    const text = message.toLowerCase();

    if (
        text.includes("analyse") ||
        text.includes("onderzoek") ||
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


app.post("/chat", async (req,res)=>{

    try {

        const message = req.body.message;

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


        res.json({

            model:model,

            answer:data.message.content

        });


    } catch(error){

        res.status(500).json({

            answer:"ORION fout: " + error.message

        });

    }

});


app.get("/",(req,res)=>{
    res.send("ORION Ollama AI core actief");
});


app.listen(process.env.PORT || 3000,()=>{
    console.log("ORION Ollama server gestart");
});
