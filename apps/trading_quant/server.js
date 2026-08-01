const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

app.use(express.json());

// Serve ORION Web Dashboard and Godmode Clone
app.use("/", express.static(path.join(__dirname, "web_dashboard")));
app.use("/godmode", express.static(path.join(__dirname, "godmod3_clone")));
const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";

function chooseModel(message) {
    const text = message.toLowerCase();
    if (text.includes("analyse") || text.includes("onderzoek") || text.includes("strategie")) {
        return "gemma4:31b-cloud";
    }
    if (text.includes("denk diep") || text.includes("redeneer")) {
        return "kimi-k2.6:cloud";
    }
    return "hermes3:8b";
}

// ==========================================
// 1. TOOL DEFINITIES (FUNCTION CALLING)
// ==========================================
const availableTools = {
    get_quant_status: async () => {
        try {
            const statePath = "/data/data/com.termux/files/home/solana_quant_bot/data/state.json";
            if (fs.existsSync(statePath)) return fs.readFileSync(statePath, 'utf8');
            return "Geen actieve state.json gevonden.";
        } catch(e) { return "Error reading quant status: " + e.message; }
    },
    read_omni_log: async () => {
        try {
            const logPath = "/data/data/com.termux/files/home/.omni/orion.log";
            if (fs.existsSync(logPath)) {
                const logs = fs.readFileSync(logPath, 'utf8').split('\n').slice(-20).join('\n');
                return logs;
            }
            return "Geen orion.log gevonden.";
        } catch(e) { return "Error reading logs: " + e.message; }
    },
    read_proposals: async () => {
        try {
            const pPath = "/data/data/com.termux/files/home/.omni/proposals.log";
            if (fs.existsSync(pPath)) {
                return fs.readFileSync(pPath, 'utf8').split('\n').slice(-30).join('\n');
            }
            return "Geen automatische patches gevonden.";
        } catch(e) { return "Error reading proposals: " + e.message; }
    }
};

const toolDeclarations = [
    {
        type: "function",
        function: {
            name: "get_quant_status",
            description: "Lees de live trading data en winst/verlies (ROI) van de Solana Quant bot uit.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "read_omni_log",
            description: "Lees de laatste 20 regels van het systeemlogboek om fouten of waarschuwingen te detecteren.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "read_proposals",
            description: "Bekijk de voorgestelde code-patches van het nieuwe autonome QA team.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    }
];

// ==========================================
// 1.5. FULL MONOLITH API & SWARM DELEGATION
// ==========================================

// Helper function to read json files safely
const readJsonFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (e) { console.error(e); }
    return {};
};

app.get("/api/status", (req, res) => res.json({ status: "online", orchestrator: "OrionX Node.js Monolith", modules: ["Ollama", "Quant_Bot", "QA_Agents", "Omni-Swarm"] }));
app.get("/api/system", (req, res) => res.json({ memory: process.memoryUsage(), uptime: process.uptime(), platform: process.platform }));
app.get("/api/todo", (req, res) => res.json(readJsonFile("/data/data/com.termux/files/home/.omni/todo.json") || []));
app.get("/api/events", (req, res) => res.json(readJsonFile("/data/data/com.termux/files/home/.omni/events.json") || []));
app.get("/api/cortex", (req, res) => res.json(readJsonFile("/data/data/com.termux/files/home/.omni/cortex/knowledge_graph.json") || {}));
app.get("/api/proposals", (req, res) => {
    try {
        const pPath = "/data/data/com.termux/files/home/.omni/proposals.log";
        res.json({ proposals: fs.existsSync(pPath) ? fs.readFileSync(pPath, "utf8").split("\n").slice(-50) : [] });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.get("/api/solana", (req, res) => res.json(readJsonFile("/data/data/com.termux/files/home/solana_quant_bot/data/state.json")));
app.get("/api/sniper", (req, res) => res.json(readJsonFile("/data/data/com.termux/files/home/data/weights.json")));
app.get("/api/greenwheels", (req, res) => res.json(readJsonFile("/data/data/com.termux/files/home/.omni/greenwheels_sessions.json")));

// Omni-Swarm Router (Integrating ALL local agents: agy, claude, codex, hermes, openclaw, pi, agentzero)
app.post("/api/swarm", (req, res) => {
    const { agent, command } = req.body;
    let cliCommand = "";
    
    switch(agent?.toLowerCase()) {
        case "agy":
        case "antigravity":
            cliCommand = `agy ${command}`;
            break;
        case "claude":
            cliCommand = `claude ${command}`;
            break;
        case "codex":
            cliCommand = `codex ${command}`;
            break;
        case "hermes":
            cliCommand = `hermes ${command}`;
            break;
        case "openclaw":
            cliCommand = `openclaw ${command}`;
            break;
        case "pi":
            cliCommand = `pi ${command}`;
            break;
        case "agentzero":
            cliCommand = `agent0 ${command}`;
            break;
        default:
            return res.status(400).json({ error: "Unknown agent in swarm: " + agent });
    }

    exec(cliCommand, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message, stderr });
        }
        res.json({ agent, output: stdout });
    });
});

// ==========================================
// 2. ORION CHAT ENDPOINT (AGENTIC LOOP)
// ==========================================
app.post("/chat", async (req,res)=>{
    try {
        const message = req.body.message;
        const model = chooseModel(message);

        let systemContext = "Je bent ORION, een autonome AGI-orchestrator. Je hebt toegang tot system tools (function calling) om live data over het platform te analyseren (quant bots, logboeken, netwerkstatus). Gebruik deze tools actief als de gebruiker vraagt naar de status of errors. Beantwoord de gebruiker in je unieke hacker/cyberpunk persona.";
        
        let conversation = [
            { role: "system", content: systemContext },
            { role: "user", content: message }
        ];

        let finalAnswer = "";
        let isDone = false;

        // AGENTIC EXECUTION LOOP (ReAct)
        // Max 5 tool calls per interactie om oneindige loops te voorkomen
        for (let i = 0; i < 5; i++) {
            const response = await fetch(OLLAMA_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: model,
                    messages: conversation,
                    tools: toolDeclarations,
                    stream: false
                })
            });

            const data = await response.json();
            const aiMessage = data.message;
            
            // Voeg de AI response toe aan de conversatiegeschiedenis
            conversation.push(aiMessage);

            // Controleer of het model autonoom besloten heeft om tools in te zetten
            if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                console.log(`[ORION MASTER] Agent initieert tool call(s): ${aiMessage.tool_calls.map(t => t.function.name).join(", ")}`);
                
                for (const toolCall of aiMessage.tool_calls) {
                    const funcName = toolCall.function.name;
                    let resultContent = "Tool niet gevonden in backend registry.";
                    
                    if (availableTools[funcName]) {
                        resultContent = await availableTools[funcName]();
                    }

                    // Stuur de data (output van de tool) terug naar de LLM als een nieuwe message met role 'tool'
                    conversation.push({
                        role: "tool",
                        content: resultContent
                    });
                }
                
                // De loop begint opnieuw (i++) en stuurt de hele conversatie (inclusief tool output) weer naar de LLM
            } else {
                // Het model heeft geen tools meer nodig en heeft het definitieve antwoord geformuleerd.
                finalAnswer = aiMessage.content;
                isDone = true;
                break;
            }
        }

        if (!isDone) {
            finalAnswer = "Systeemfout: De Agentic Execution Loop is afgebroken (max depth bereikt). Actie geannuleerd.";
        }

        res.json({
            model: model,
            answer: finalAnswer
        });

    } catch(error){
        console.error("Chat endpoint error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 3. REALTIME WEBSOCKET STREAMING (Phase 2)
// ==========================================
const http = require('http');
const WebSocket = require('ws');
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
    console.log('[WebSocket] Nieuwe client verbonden via A-O7O protocol');
    ws.send(JSON.stringify({ type: 'sys_msg', message: 'Verbonden met Neural Nexus Master Node WebSocket' }));

    ws.on('message', (message) => {
        console.log(`[WebSocket] Bericht ontvangen: ${message}`);
        ws.send(JSON.stringify({ type: 'echo', data: message.toString() }));
    });

    ws.on('close', () => {
        console.log('[WebSocket] Client ontkoppeld');
    });
});

app.post('/api/broadcast', (req, res) => {
    const data = req.body;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
    res.json({ success: true, clients: wss.clients.size });
});

server.listen(3000, ()=>{
    console.log("ORION (Agentic Edition + WebSockets) lokaal actief op poort 3000");
});
