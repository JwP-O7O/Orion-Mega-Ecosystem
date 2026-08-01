const fs = require('fs');
const http = require('http');
const { exec } = require('child_process');

console.log("[OMNI-CORE QA GUARDIAN] 🛡️ The Watchers have awakened. Masterplan linked.");
console.log("[QA AGENT 1] Node Scanner: Active");
console.log("[QA AGENT 2] Network Ping: Active");
console.log("[QA AGENT 3] Log Analyzer & Patch Proposer: Active\n");

const ENDPOINTS = [
    { name: 'Ollama API', url: 'http://localhost:11434/', restartCommand: 'start cmd /c "ollama serve"' },
    { name: 'Neural Nexus Backend', url: 'http://localhost:3000/api/status', restartCommand: 'start cmd /c "node server.js"' }
];

const path = require('path');
const PROCESSED_ERRORS_FILE = path.join(__dirname, 'data', 'processed_errors.json');
const PROPOSALS_LOG = path.join(__dirname, 'data', 'proposals.log');

let processedErrors = new Set();
if (fs.existsSync(PROCESSED_ERRORS_FILE)) {
    try {
        processedErrors = new Set(JSON.parse(fs.readFileSync(PROCESSED_ERRORS_FILE, 'utf8')));
    } catch(e) {}
}

function saveProcessedErrors() {
    if (!fs.existsSync(path.dirname(PROCESSED_ERRORS_FILE))) {
        fs.mkdirSync(path.dirname(PROCESSED_ERRORS_FILE), { recursive: true });
    }
    fs.writeFileSync(PROCESSED_ERRORS_FILE, JSON.stringify(Array.from(processedErrors)));
}

async function askLLMForPatch(errorLine, file) {
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            model: "hermes3:8b", // Default fallback model available in Orion
            prompt: `Je bent QA Agent 3 van de Omni-Core stack. Je taak is bugs repareren. Er is een error gevonden in ${file}:\n\nERROR:\n${errorLine}\n\nWat is de meest waarschijnlijke oorzaak en hoe lossen we dit op in de code? Geef een korte patch.`,
            stream: false
        });

        const req = http.request({
            hostname: 'localhost',
            port: 11434,
            path: '/api/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.response);
                } catch(e) { resolve(null); }
            });
        });
        
        req.on('error', () => resolve(null));
        req.write(payload);
        req.end();
    });
}

async function checkEndpoint(endpoint) {
    return new Promise((resolve) => {
        const req = http.get(endpoint.url, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => { req.abort(); resolve(false); });
    });
}

const recoveryCooldowns = {};

async function runHealthCheckAgents() {
    for (const endpoint of ENDPOINTS) {
        const isUp = await checkEndpoint(endpoint);
        if (!isUp) {
            const now = Date.now();
            const lastRecovery = recoveryCooldowns[endpoint.name] || 0;
            
            console.log(`[QA AGENT 1] ❌ FATAL ERROR: ${endpoint.name} is DOWN! Target: ${endpoint.url}`);
            
            if (now - lastRecovery > 60000) { // 60 seconds cooldown
                console.log(`[QA AGENT 2] 🔄 Initiating auto-recovery for ${endpoint.name}...`);
                recoveryCooldowns[endpoint.name] = now;
                exec(endpoint.restartCommand, (error) => {
                    if (error) console.error(`[QA AGENT 2] 🚨 Recovery failed: ${error.message}`);
                    else console.log(`[QA AGENT 2] ✅ ${endpoint.name} successfully restarted.`);
                });
            } else {
                console.log(`[QA AGENT 2] ⏳ Cooldown actief voor ${endpoint.name}. Wachten met nieuwe recovery...`);
            }
        } else {
            // Reset cooldown if it's up
            if (recoveryCooldowns[endpoint.name]) {
                delete recoveryCooldowns[endpoint.name];
                console.log(`[QA AGENT 1] 🟢 ${endpoint.name} is weer online.`);
            }
        }
    }
}

async function scanLogsForBugs() {
    const logFiles = [path.join(__dirname, 'data', 'orion.log'), path.join(__dirname, 'data', 'ollama.log')];
    
    for (const file of logFiles) {
        if (fs.existsSync(file)) {
            const data = fs.readFileSync(file, 'utf8');
            const lines = data.split('\n').slice(-20); 
            
            for (const line of lines) {
                const lower = line.toLowerCase();
                if ((lower.includes('error') || lower.includes('failed') || lower.includes('exception')) && !lower.includes('qa agent')) {
                    
                    const errorHash = Buffer.from(line).toString('base64');
                    
                    if (!processedErrors.has(errorHash)) {
                        console.log(`[QA AGENT 3] ⚠️ Nieuwe bug gedetecteerd in ${file}: ${line.trim()}`);
                        console.log(`[QA AGENT 3] 🧠 LLM Analyse starten voor patch...`);
                        
                        const patchProposal = await askLLMForPatch(line, file);
                        if (patchProposal) {
                            const logEntry = `\n[${new Date().toISOString()}] BUG IN ${file}\nERROR: ${line}\nPATCH PROPOSAL:\n${patchProposal}\n---------------------------\n`;
                            fs.appendFileSync(PROPOSALS_LOG, logEntry);
                            console.log(`[QA AGENT 3] 🎯 Patch succesvol gegenereerd en weggeschreven naar proposals.log!`);
                            
                            // SWARM INTELLIGENCE: Auto-Delegate critical errors to AgentZero or Claude
                            if (lower.includes("fatal") || lower.includes("syntax")) {
                                console.log(`[QA AGENT 4 - SWARM COMMANDER] 🐝 Critical bug detected. Escalating to Swarm (Claude) for auto-fix analysis...`);
                                const swarmPayload = JSON.stringify({ agent: "claude", command: `--print "Analyze and fix the error: ${line.replace(/"/g, '')} in ${file}"` });
                                const reqSwarm = http.request({
                                    hostname: 'localhost', port: 3000, path: '/api/swarm', method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(swarmPayload) }
                                }, (res) => {
                                    let swData = '';
                                    res.on('data', chunk => swData += chunk);
                                    res.on('end', () => console.log(`[QA AGENT 4] Swarm response received.`));
                                });
                                reqSwarm.on('error', (e) => console.log(`[QA AGENT 4] Swarm API unreachable.`));
                                reqSwarm.write(swarmPayload);
                                reqSwarm.end();
                            }
                        }
                        
                        processedErrors.add(errorHash);
                        saveProcessedErrors();
                    }
                }
            }
        }
    }
}

setInterval(async () => {
    await runHealthCheckAgents();
    await scanLogsForBugs();
}, 10000); 

runHealthCheckAgents();
scanLogsForBugs();
