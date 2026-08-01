        // --- WEB AUDIO SFX ENGINE (SCI-FI dashboard sounds) ---
        class AudioEngine {
            constructor() {
                this.ctx = null;
                this.muted = true;
            }
            init() {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
            }
            toggleMute() {
                this.muted = !this.muted;
                this.init();
                return this.muted;
            }
            playClick() {
                if (this.muted) return;
                this.init();
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);
                gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.08);
            }
            playSuccess() {
                if (this.muted) return;
                this.init();
                const now = this.ctx.currentTime;
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                    gain.gain.setValueAtTime(0.03, now + idx * 0.06);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);
                    osc.start(now + idx * 0.06);
                    osc.stop(now + idx * 0.06 + 0.15);
                });
            }
            playPulse() {
                if (this.muted) return;
                this.init();
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(120, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.2);
            }
        }
        const sfx = new AudioEngine();

        function toggleAudioFX() {
            const isMuted = sfx.toggleMute();
            const icon = document.getElementById('audio-icon');
            if (icon) {
                if (isMuted) {
                    icon.className = 'fa-solid fa-volume-xmark';
                    icon.style.color = 'var(--text-muted)';
                } else {
                    icon.className = 'fa-solid fa-volume-high';
                    icon.style.color = 'var(--color-accent)';
                    sfx.playSuccess();
                }
            }
        }

        // --- 3D NEURAL CORE SPHERE RENDERER ---
        class NeuralCore3D {
            constructor(canvasId) {
                this.canvas = document.getElementById(canvasId);
                if (!this.canvas) return;
                this.ctx = this.canvas.getContext('2d');
                this.nodes = [];
                this.nodeCount = 28;
                this.radius = 65;
                this.angleX = 0.006;
                this.angleY = 0.008;
                this.init();
            }
            init() {
                for (let i = 0; i < this.nodeCount; i++) {
                    const u = Math.random();
                    const v = Math.random();
                    const theta = u * 2.0 * Math.PI;
                    const phi = Math.acos(2.0 * v - 1.0);
                    this.nodes.push({
                        x: this.radius * Math.sin(phi) * Math.cos(theta),
                        y: this.radius * Math.sin(phi) * Math.sin(theta),
                        z: this.radius * Math.cos(phi)
                    });
                }
                this.animate();
            }
            rotateX(node, angle) {
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const y1 = node.y * cos - node.z * sin;
                const z1 = node.z * cos + node.y * sin;
                node.y = y1;
                node.z = z1;
            }
            rotateY(node, angle) {
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const x1 = node.x * cos - node.z * sin;
                const z1 = node.z * cos + node.x * sin;
                node.x = x1;
                node.z = z1;
            }
            animate() {
                if (!this.canvas) return;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                const xc = this.canvas.width / 2;
                const yc = this.canvas.height / 2;
                const fov = 180;

                // Rotatiesnelheid op basis van actieve CPU telemetry
                let currentCpu = 30;
                if (overviewChartInstance && overviewChartInstance.data.datasets[0].data[0] !== undefined) {
                    currentCpu = overviewChartInstance.data.datasets[0].data[0];
                }
                const speedMultiplier = 1 + (currentCpu / 35);

                this.nodes.forEach(node => {
                    this.rotateX(node, this.angleX * speedMultiplier);
                    this.rotateY(node, this.angleY * speedMultiplier);
                });

                const projected = this.nodes.map(node => {
                    const scale = fov / (fov + node.z);
                    return {
                        x: node.x * scale + xc,
                        y: node.y * scale + yc,
                        z: node.z,
                        scale: scale
                    };
                });

                // Connections
                for (let i = 0; i < projected.length; i++) {
                    for (let j = i + 1; j < projected.length; j++) {
                        const dist = Math.hypot(projected[i].x - projected[j].x, projected[i].y - projected[j].y);
                        if (dist < 60) {
                            // Dynamic color transition based on CPU load
                            this.ctx.strokeStyle = `hsla(${200 + currentCpu * 1.5}, 85%, 65%, ${0.12 * (1 - dist / 60)})`;
                            this.ctx.lineWidth = 0.8;
                            this.ctx.beginPath();
                            this.ctx.moveTo(projected[i].x, projected[i].y);
                            this.ctx.lineTo(projected[j].x, projected[j].y);
                            this.ctx.stroke();
                        }
                    }
                }

                // Nodes
                projected.forEach(p => {
                    const size = Math.max(0.8, 2 * p.scale);
                    const alpha = Math.max(0.1, (p.z + this.radius) / (2 * this.radius));
                    this.ctx.fillStyle = `hsla(${200 + currentCpu * 1.5}, 90%, 70%, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    this.ctx.fill();
                });

                requestAnimationFrame(() => this.animate());
            }
        }

        // Core data model
        let knowledgeGraph = {
            "nodes": {
                "solana_bot": { "label": "Solana Bot", "type": "project" },
                "greenwheels": { "label": "Greenwheels", "type": "project" },
                "mywheels": { "label": "Mywheels", "type": "project" },
                "contabo_vps": { "label": "Contabo VPS", "type": "server" },
                "sniper": { "label": "Quantum Sniper", "type": "project" }
            },
            "edges": [
                { "source": "solana_bot", "target": "contabo_vps", "relation": "deployed_on" },
                { "source": "contabo_vps", "target": "sniper", "relation": "hosts_data" }
            ]
        };

        let activeTab = 'overview';
        let dragNodeId = null;
        let nodeCoordinates = {};
        
        // S Pen Drawing State
        let drawing = false;
        let spenColor = '#38bdf8';
        let spenSize = 3;
        let activeTool = 'pen'; // pen or eraser

        // Speech recognition state
        let speechRecognition = null;
        let isListening = false;

        // 3D Nebula particle system state
        let nebulaParticles = [];
        const particleCount = 40;

        // Omni AI Cognitive Wave State
        let waveCanvas = null;
        let waveCtx = null;
        let waveSpeed = 0.04;
        let waveAmplitude = 4;

        // Kelly Predictor State
        let lastCalculatedProbs = { home: 52, draw: 22, away: 26 };

        window.addEventListener('DOMContentLoaded', () => {
            initBatteryStatus();
            initNodeCoordinates();
            initCharts();
            setupDraggableCortex();
            initSpenCanvas();
            initVoiceRecognition();
            init3DNebula();
            setup3DCardParallax();
            initCognitiveWave();
            
            // Start 3D holografische bol
            new NeuralCore3D('neural-core-canvas');
            
            // Initial fetches for S26 dashboard feeds
            fetchLiveScores();
            loadSystemSettings();
            
            // Live recalculate Kelly when odds or bankroll inputs change
            ['odds-home', 'odds-draw', 'odds-away', 'bankroll'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('input', () => {
                        const oddsHome = parseFloat(document.getElementById('odds-home').value) || 1.0;
                        const oddsDraw = parseFloat(document.getElementById('odds-draw').value) || 1.0;
                        const oddsAway = parseFloat(document.getElementById('odds-away').value) || 1.0;
                        const bankrollVal = parseFloat(document.getElementById('bankroll').value) || 100;
                        calculateKellyAdvices(
                            lastCalculatedProbs,
                            { home: oddsHome, draw: oddsDraw, away: oddsAway },
                            bankrollVal
                        );
                    });
                }
            });
            
            // Periodically fetch data from serve_dashboard.py
            setInterval(syncWithServer, 4000);
        });

        // Device Haptic feedback helper
        function vibrateDevice(pattern) {
            if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
            // Trigger sci-fi sfx feedback
            sfx.playClick();
        }

        function showToast(message) {
            let toast = document.getElementById('nexus-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'nexus-toast';
                toast.style.cssText = `
                    position: fixed;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%) translateY(20px);
                    background: rgba(15, 10, 25, 0.95);
                    border: 1px solid var(--color-primary);
                    color: #fff;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3), 0 0 15px rgba(139, 92, 246, 0.2);
                    z-index: 9999;
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: none;
                    text-align: center;
                    backdrop-filter: blur(10px);
                    max-width: 90%;
                    width: max-content;
                    font-family: 'Outfit', sans-serif;
                `;
                document.body.appendChild(toast);
            }
            
            toast.textContent = message;
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(20px)';
            }, 3000);
        }

        // HTML5 Battery Telemetry
        function initBatteryStatus() {
            if (navigator.getBattery) {
                navigator.getBattery().then(battery => {
                    updateBatteryDisplay(battery);
                    battery.addEventListener('levelchange', () => updateBatteryDisplay(battery));
                    battery.addEventListener('chargingchange', () => updateBatteryDisplay(battery));
                });
            } else {
                document.getElementById('bat-level').textContent = "100%";
            }
        }

        function updateBatteryDisplay(battery) {
            const level = Math.round(battery.level * 100);
            document.getElementById('bat-level').textContent = `${level}%`;
            
            const batIcon = document.getElementById('bat-icon');
            if (battery.charging) {
                batIcon.className = "fa-solid fa-battery-charging";
                batIcon.style.color = "var(--color-accent)";
            } else {
                batIcon.className = level > 50 ? "fa-solid fa-battery-three-quarters" : "fa-solid fa-battery-quarter";
                batIcon.style.color = level > 25 ? "var(--color-success)" : "var(--color-danger)";
            }
        }

        // Swipe & Navigation Controller
        function switchMobileTab(tabId) {
            vibrateDevice([12]); // sharp tactile click feedback
            
            document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-button').forEach(el => el.classList.remove('active'));
            
            const tabEl = document.getElementById(tabId);
            if (tabEl) {
                tabEl.classList.add('active');
                const viewport = document.getElementById('viewport');
                if (viewport) viewport.scrollTop = 0;
            }
            
            // Highlight bottom nav button
            const btns = Array.from(document.querySelectorAll('.nav-button'));
            const moreMenuTabs = ['chat', 'terminal', 'processes', 'models', 'hermes', 'antigravity', 'settings', 'greenwheels', 'security', 'solana', 'collab', 'todo', 'aiagency'];
            
            if (moreMenuTabs.includes(tabId)) {
                const moreBtn = document.getElementById('more-nav-btn');
                if (moreBtn) moreBtn.classList.add('active');
            } else {
                const matched = btns.find(b => b.textContent.toLowerCase().includes(tabId === 'spen' ? 's pen' : tabId));
                if (matched) matched.classList.add('active');
            }

            // Highlight top strip button
            document.querySelectorAll('.top-tab-btn').forEach(btn => {
                if (btn.getAttribute('data-tab') === tabId) {
                    btn.classList.add('active');
                    try { btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch(e) {}
                } else {
                    btn.classList.remove('active');
                }
            });

            activeTab = tabId;

            if (tabId === 'cortex') {
                setTimeout(drawCortexEdges, 100);
            } else if (tabId === 'spen') {
                setTimeout(resizeSpenCanvas, 100);
            } else if (tabId === 'processes') {
                refreshProcesses();
            } else if (tabId === 'models') {
                loadModelsRegistry();
            } else if (tabId === 'hermes') {
                loadHermesStatus();
            } else if (tabId === 'antigravity') {
                loadAntigravityStatus();
            } else if (tabId === 'settings') {
                loadSystemSettings();
            } else if (tabId === 'greenwheels') {
                loadGwCars();
            } else if (tabId === 'security') {
                // Initialisatie
            } else if (tabId === 'solana') {
                loadSolanaStatus();
                loadSolanaPositions();
            } else if (tabId === 'collab') {
                setTimeout(initializeCollabTab, 100);
            } else if (tabId === 'todo') {
                setTimeout(initializeTodoTab, 100);
            } else if (tabId === 'aiagency') {
                loadAiAgencyData();
                loadResearchReport();
                if (!window.researchPollInterval) {
                    window.researchPollInterval = setInterval(loadResearchReport, 5000);
                }
            } else {
                if (window.researchPollInterval) {
                    clearInterval(window.researchPollInterval);
                    window.researchPollInterval = null;
                }
            }
        }

        // More Menu (Bottom-Sheet) Toggle
        function toggleMoreMenu(show) {
            vibrateDevice([8]);
            const overlay = document.getElementById('more-menu-overlay');
            const sheet = document.getElementById('more-menu-sheet');
            if (show) {
                if (overlay) overlay.classList.add('active');
                if (sheet) sheet.classList.add('active');
            } else {
                if (overlay) overlay.classList.remove('active');
                if (sheet) sheet.classList.remove('active');
            }
        }

        // --- SOLANA BOT MANAGER ---
        async function loadSolanaStatus() {
            try {
                const response = await fetch('/api/solana/status');
                const data = await response.json();
                
                const badge = document.getElementById('solana-bot-status-badge');
                const startBtn = document.getElementById('solana-start-btn');
                const stopBtn = document.getElementById('solana-stop-btn');
                const balanceEl = document.getElementById('solana-bot-balance');
                const cyclesEl = document.getElementById('solana-bot-cycles');
                
                if (badge && startBtn && stopBtn) {
                    if (data && data.running) {
                        badge.className = 'badge-status-glow success';
                        badge.innerHTML = '<i class="fa-solid fa-circle-play"></i> Online';
                        startBtn.style.display = 'none';
                        stopBtn.style.display = 'block';
                    } else {
                        badge.className = 'badge-status-glow error';
                        badge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Offline';
                        startBtn.style.display = 'block';
                        stopBtn.style.display = 'none';
                    }
                }
                
                if (balanceEl) balanceEl.textContent = (data && data.balance_sol != null ? data.balance_sol.toFixed(2) : '0.00') + ' SOL';
                if (cyclesEl) cyclesEl.textContent = data ? (data.cycle_count ?? 0) : 0;
            } catch (e) {
                console.error("Fout bij laden Solana status: ", e);
            }
        }

        async function loadSolanaPositions() {
            try {
                const response = await fetch('/api/solana/positions');
                const data = await response.json();
                const tableBody = document.getElementById('solana-positions-table-body');
                if (!tableBody) return;
                
                if (!Array.isArray(data) || data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:16px; color:var(--text-muted);">Geen actieve posities in Supabase.</td></tr>';
                    return;
                }
                
                let html = '';
                data.forEach(pos => {
                    if (!pos) return;
                    const date = pos.updated_at ? new Date(pos.updated_at).toLocaleTimeString() : '--:--';
                    const addr = pos.token_address || '';
                    const shortAddr = addr.length > 10 ? addr.slice(0, 6) + '...' + addr.slice(-4) : (addr || 'Token');
                    const buyPrice = pos.buy_price != null ? pos.buy_price.toFixed(4) : '0.0000';
                    const sizeSol = pos.size_sol != null ? pos.size_sol.toFixed(2) : '0.00';
                    html += `
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.03); color:#fff;">
                            <td style="padding:10px 4px; font-family:monospace; color:var(--color-accent);">${shortAddr}</td>
                            <td style="padding:10px 4px;">${buyPrice} SOL</td>
                            <td style="padding:10px 4px;">${sizeSol} SOL</td>
                            <td style="padding:10px 4px; color:var(--text-muted);">${date}</td>
                        </tr>
                    `;
                });
                tableBody.innerHTML = html;
            } catch (e) {
                console.error("Fout bij laden Solana posities: ", e);
            }
        }

        async function controlSolanaBot(action) {
            vibrateDevice([15]);
            try {
                const response = await fetch('/api/solana/control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action })
                });
                const data = await response.json();
                if (data.success) {
                    showToast(data.message);
                    setTimeout(loadSolanaStatus, 500);
                } else {
                    showToast("Fout: " + data.error);
                }
            } catch (e) {
                showToast("Netwerkfout bij beheer bot.");
            }
        }

        // --- LIVE PROCESS MANAGER ---
        function refreshProcesses() {
            const tableBody = document.getElementById('processes-table-body');
            if (!tableBody) return;
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Processen ophalen...</td></tr>';
            
            fetch('/api/system/processes')
                .then(r => r.json())
                .then(processes => {
                    if (!tableBody) return;
                    tableBody.innerHTML = '';
                    if (!Array.isArray(processes) || processes.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Geen actieve AI/Termux processen gevonden.</td></tr>';
                        return;
                    }
                    processes.forEach(proc => {
                        if (!proc) return;
                        const tr = document.createElement('tr');
                        let shortCmd = proc.cmd ? String(proc.cmd) : 'Process';
                        if (shortCmd.length > 35) {
                            shortCmd = '...' + shortCmd.slice(-32);
                        }
                        
                        tr.innerHTML = `
                            <td style="font-weight:700; color:var(--color-accent);">${proc.pid || '-'}</td>
                            <td style="font-family:'Fira Code', monospace; font-size:0.75rem;" title="${proc.cmd || ''}">${shortCmd}</td>
                            <td style="color:var(--text-muted);">${proc.stime || '-'}</td>
                            <td>
                                <button onclick="killProcess(${proc.pid})" style="background:rgba(244,63,94,0.1); border:1px solid var(--color-danger); color:var(--color-danger); border-radius:8px; padding:4px 8px; font-size:0.7rem; font-weight:800; cursor:pointer;"><i class="fa-solid fa-skull"></i> Kill</button>
                            </td>
                        `;
                        tableBody.appendChild(tr);
                    });
                })
                .catch(err => {
                    console.error("Fout bij laden processen:", err);
                    if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--color-danger);">Fout bij laden processen.</td></tr>';
                });
        }

        function killProcess(pid) {
            if (confirm(`Weet je zeker dat je proces PID ${pid} wilt beëindigen?`)) {
                vibrateDevice([50, 30, 50]);
                fetch('/api/system/process/kill', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pid })
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        alert(`Proces ${pid} succesvol gestopt.`);
                        refreshProcesses();
                    } else {
                        alert(`Fout: ${data.error}`);
                    }
                })
                .catch(() => {
                    alert("Fout bij uitvoeren actie.");
                });
            }
        }

        // --- MODEL REGISTRY & COMPASS ---
        let allModels = [];

        function loadModelsRegistry() {
            const tableBody = document.getElementById('models-table-body');
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Modellen inladen...</td></tr>';
            
            fetch('/api/models')
                .then(r => r.json())
                .then(data => {
                    allModels = (data && Array.isArray(data.models)) ? data.models : [];
                    allModels.unshift({
                        displayName: "Claude 3.5 Sonnet",
                        name: "claude-3-5-sonnet",
                        inputTokenLimit: 200000,
                        outputTokenLimit: 8192,
                        thinking: false,
                        description: "Anthropic's state-of-the-art reasoning model"
                    });
                    renderModelsTable(allModels);
                })
                .catch(err => {
                    console.error("Fout bij laden models:", err);
                    if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--color-danger);">Fout bij laden model registry.</td></tr>';
                });
        }

        function renderModelsTable(modelsList) {
            const tableBody = document.getElementById('models-table-body');
            tableBody.innerHTML = '';
            
            if (modelsList.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Geen modellen gevonden die voldoen aan de zoekopdracht.</td></tr>';
                return;
            }

            modelsList.forEach(m => {
                const tr = document.createElement('tr');
                const isThinking = m.thinking ? '<span style="color:var(--color-success); font-weight:800;"><i class="fa-solid fa-circle-check"></i> JA</span>' : '<span style="color:var(--text-muted);">-</span>';
                
                // Format numbers to readable strings (e.g. 1M)
                const formatTokens = (num) => {
                    if (!num) return '-';
                    if (num >= 1000000) return (num / 1000000) + 'M';
                    if (num >= 1000) return (num / 1000) + 'K';
                    return num;
                };

                tr.innerHTML = `
                    <td style="font-weight:700; color:#fff;">
                        ${m.displayName}
                        <div style="font-size:0.65rem; color:var(--text-muted); font-weight:400; font-family:'Fira Code', monospace; margin-top:2px;">${m.name}</div>
                    </td>
                    <td>${formatTokens(m.inputTokenLimit)}</td>
                    <td>${formatTokens(m.outputTokenLimit)}</td>
                    <td>${isThinking}</td>
                `;
                tableBody.appendChild(tr);
            });
        }

        function filterModels() {
            const query = document.getElementById('model-search').value.toLowerCase();
            const filtered = allModels.filter(m => 
                m.displayName.toLowerCase().includes(query) || 
                m.name.toLowerCase().includes(query)
            );
            renderModelsTable(filtered);
        }

        // --- SYSTEM CONFIGURATION ---
        function loadSystemSettings() {
            fetch('/api/settings')
                .then(r => r.json())
                .then(settings => {
                    if (settings.llm_model) {
                        document.getElementById('settings-model').value = settings.llm_model;
                    }
                    if (settings.vps_ip) {
                        document.getElementById('settings-vps-ip').value = settings.vps_ip;
                    }
                    if (settings.vps_port) {
                        document.getElementById('settings-vps-port').value = settings.vps_port;
                    }
                })
                .catch(() => {});
        }

        function saveSystemSettings() {
            vibrateDevice([20, 10, 20]);
            const model = document.getElementById('settings-model').value;
            const ip = document.getElementById('settings-vps-ip').value.trim();
            const port = parseInt(document.getElementById('settings-vps-port').value);

            if (!ip || isNaN(port)) {
                alert("Ongeldige invoergegevens.");
                return;
            }

            const updatedSettings = {
                llm_model: model,
                vps_ip: ip,
                vps_port: port
            };

            fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedSettings)
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    alert("Instellingen succesvol bijgewerkt en opgeslagen naar settings.json!");
                } else {
                    alert("Opslaan mislukt.");
                }
            })
            .catch(() => {
                alert("Netwerkfout bij opslaan instellingen.");
            });
        }

        function logoutSession() {
            vibrateDevice([50, 50]);
            // Clear de cookie door een verlopen cookie terug te schrijven
            document.cookie = "session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
            showToast("U bent succesvol afgemeld.");
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
        }

        // --- HERMES AGENT CONTROLLER ---
        function loadHermesStatus() {
            const skillsList = document.getElementById('hermes-skills-list');
            const backtestTable = document.getElementById('hermes-backtest-table');
            
            fetch('/api/hermes/status')
                .then(r => r.json())
                .then(data => {
                    const statusBadge = document.getElementById('hermes-badge-status');
                    const modelBadge = document.getElementById('hermes-badge-model');
                    const oddBadge = document.getElementById('hermes-highest-odd');
                    
                    if (statusBadge && data.status) statusBadge.textContent = data.status;
                    if (modelBadge && data.model) modelBadge.textContent = data.model;
                    if (oddBadge && data.highest_odd) oddBadge.textContent = data.highest_odd;

                    // Load active skills
                    if (skillsList && data.active_skills) {
                        skillsList.innerHTML = '';
                        data.active_skills.forEach(skill => {
                            const sDiv = document.createElement('div');
                            sDiv.style.cssText = "background:rgba(255,255,255,0.02); padding:12px; border-radius:12px; border:1px solid var(--panel-border); display:flex; justify-content:space-between; align-items:center;";
                            sDiv.innerHTML = `
                                <div>
                                    <strong style="color:#fff; font-size:0.8rem;">${skill.name}</strong>
                                    <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${skill.desc}</div>
                                </div>
                                <span style="background:rgba(16,185,129,0.15); color:var(--color-success); border:1px solid rgba(16,185,129,0.25); font-size:0.6rem; font-weight:800; padding:2px 6px; border-radius:6px; text-transform:uppercase;">${skill.status}</span>
                            `;
                            skillsList.appendChild(sDiv);
                        });
                    }

                    // Load backtest table
                    if (backtestTable && data.backtest) {
                        backtestTable.innerHTML = '';
                        let totalInleg = 0;
                        let totalWinst = 0;

                        data.backtest.forEach(row => {
                            totalInleg += row.inleg;
                            totalWinst += row.winst;

                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td style="font-weight:700; color:#fff;">${row.league}</td>
                                <td>€${row.inleg}</td>
                                <td style="color:var(--color-success); font-weight:700;">+€${row.winst.toFixed(2)}</td>
                                <td style="color:var(--color-accent); font-weight:700;">${row.roi}%</td>
                            `;
                            backtestTable.appendChild(tr);
                        });

                        const totalTr = document.createElement('tr');
                        totalTr.style.borderTop = "2px dashed var(--panel-border)";
                        totalTr.innerHTML = `
                            <td style="font-weight:800; color:var(--color-accent);">TOTAAL</td>
                            <td style="font-weight:800;">€${totalInleg}</td>
                            <td style="color:var(--color-success); font-weight:800;">+€${totalWinst.toFixed(2)}</td>
                            <td style="color:var(--color-accent); font-weight:800;">${totalInleg > 0 ? Math.round((totalWinst/totalInleg)*100) : 0}%</td>
                        `;
                        backtestTable.appendChild(totalTr);
                    }
                    
                    if (typeof updateSniperChart === 'function' && data.backtest) {
                        updateSniperChart(data.backtest);
                    }
                })
                .catch(() => {
                    if (skillsList) skillsList.innerHTML = '<div style="font-size:0.8rem; color:var(--color-danger); text-align:center;">Fout bij laden Hermes status.</div>';
                });
        }

        function testBiometrics() {
            vibrateDevice([40, 20, 40]);
            sfx.playPulse();

            const resultDiv = document.getElementById('biometric-result');
            const btn = document.getElementById('biometric-btn');
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scannen...';
            btn.style.opacity = '0.7';
            btn.disabled = true;

            resultDiv.style.display = 'none';

            fetch('/api/hermes/biometric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(r => r.json())
            .then(data => {
                btn.innerHTML = '<i class="fa-solid fa-fingerprint"></i> Scan Vingerafdruk';
                btn.style.opacity = '1';
                btn.disabled = false;

                resultDiv.style.display = 'block';

                if (data.auth_result === "SUCCESS" || data.auth_result === "SUCCESSFUL") {
                    vibrateDevice([80, 50, 80]);
                    sfx.playSuccess();
                    resultDiv.className = 'livescore-time'; // Reuse pulsing style or style manually
                    resultDiv.style.cssText = "background:rgba(16,185,129,0.15); border:1px solid var(--color-success); color:var(--color-success); margin-top:12px; font-size:0.8rem; padding:10px 14px; border-radius:10px; font-weight:700; text-align:center;";
                    resultDiv.textContent = data.note ? `AUTH SUCCES: ${data.note}` : "✓ VINGERAFDRUK GEVALIDEERD: Hermes AI Ontgrendeld!";
                } else {
                    vibrateDevice([150, 100, 150]);
                    resultDiv.style.cssText = "background:rgba(244,63,94,0.15); border:1px solid var(--color-danger); color:var(--color-danger); margin-top:12px; font-size:0.8rem; padding:10px 14px; border-radius:10px; font-weight:700; text-align:center;";
                    resultDiv.textContent = "✗ AUTHENTICATIE MISLUKT: Vingerafdruk niet herkend.";
                }
            })
            .catch(e => {
                btn.innerHTML = '<i class="fa-solid fa-fingerprint"></i> Scan Vingerafdruk';
                btn.style.opacity = '1';
                btn.disabled = false;
                resultDiv.style.display = 'block';
                resultDiv.style.cssText = "background:rgba(244,63,94,0.15); border:1px solid var(--color-danger); color:var(--color-danger); margin-top:12px; font-size:0.8rem; padding:10px 14px; border-radius:10px; font-weight:700; text-align:center;";
                resultDiv.textContent = "✗ FOUT: Termux API communicatiefout.";
            });
        }

        // --- ANTIGRAVITY AGI CONTROLLER ---
        function loadAntigravityStatus() {
            const toolsList = document.getElementById('antigravity-tools-list');
            const skillsList = document.getElementById('antigravity-skills-list');
            
            fetch('/api/antigravity/status')
                .then(r => r.json())
                .then(data => {
                    // Load tools
                    if (toolsList && data.tools) {
                        toolsList.innerHTML = '';
                        data.tools.forEach(tool => {
                            const tDiv = document.createElement('div');
                            tDiv.style.cssText = "background:rgba(255,255,255,0.02); padding:10px 14px; border-radius:10px; border:1px solid var(--panel-border); display:flex; justify-content:space-between; align-items:center;";
                            
                            let typeColor = 'var(--text-muted)';
                            if (tool.type === 'bestand') typeColor = 'var(--color-accent)';
                            if (tool.type === 'systeem') typeColor = 'var(--color-danger)';
                            if (tool.type === 'agentic') typeColor = 'var(--color-warning)';
                            
                            tDiv.innerHTML = `
                                <div>
                                    <span style="font-family:'Fira Code', monospace; font-size:0.75rem; font-weight:700; color:#fff;">${tool.name}</span>
                                    <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">${tool.desc}</div>
                                </div>
                                <span style="font-size:0.55rem; font-weight:800; border:1px solid ${typeColor}; color:${typeColor}; padding:1px 4px; border-radius:4px; text-transform:uppercase;">${tool.type}</span>
                            `;
                            toolsList.appendChild(tDiv);
                        });
                    }

                    // Load forensic skills
                    if (skillsList && data.skills) {
                        skillsList.innerHTML = '';
                        data.skills.forEach(skill => {
                            const sDiv = document.createElement('div');
                            sDiv.style.cssText = "background:rgba(255,255,255,0.02); padding:12px; border-radius:12px; border:1px solid var(--panel-border); display:flex; justify-content:space-between; align-items:center;";
                            sDiv.innerHTML = `
                                <div>
                                    <strong style="color:#fff; font-size:0.8rem;">${skill.name}</strong>
                                    <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">${skill.desc}</div>
                                </div>
                                <span style="background:rgba(56,189,248,0.15); color:var(--color-accent); border:1px solid rgba(56,189,248,0.25); font-size:0.6rem; font-weight:800; padding:2px 6px; border-radius:6px; text-transform:uppercase;">${skill.status}</span>
                            `;
                            skillsList.appendChild(sDiv);
                        });
                    }
                })
                .catch(() => {
                    if (toolsList) toolsList.innerHTML = '<div style="font-size:0.8rem; color:var(--color-danger); text-align:center;">Fout bij laden Antigravity status.</div>';
                });
        }

        function spawnActiveSubagent() {
            vibrateDevice([30, 15, 30]);
            sfx.playPulse();

            const type = document.getElementById('subagent-type').value;
            const prompt = document.getElementById('subagent-prompt').value.trim();
            const logBox = document.getElementById('subagent-log-box');
            const logOutput = document.getElementById('subagent-log-output');

            if (!prompt) {
                alert("Geef een geldige prompt/taak op.");
                return;
            }

            logBox.style.display = 'block';
            logOutput.innerHTML = '';

            fetch('/api/antigravity/subagent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, prompt })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    let lineIdx = 0;
                    const printNextLine = () => {
                        if (lineIdx < data.log.length) {
                            const lDiv = document.createElement('div');
                            lDiv.textContent = data.log[lineIdx];
                            
                            // Color code systems logs
                            if (data.log[lineIdx].startsWith('[SYSTEM]')) lDiv.style.color = 'var(--text-muted)';
                            if (data.log[lineIdx].startsWith('[SUBAGENT]')) lDiv.style.color = 'var(--color-accent)';
                            
                            logOutput.appendChild(lDiv);
                            logOutput.scrollTop = logOutput.scrollHeight;
                            
                            vibrateDevice([5]);
                            lineIdx++;
                            setTimeout(printNextLine, 600); // 600ms stagger for cool bootlog effect
                        } else {
                            sfx.playSuccess();
                            const successDiv = document.createElement('div');
                            successDiv.style.color = 'var(--color-success)';
                            successDiv.style.fontWeight = '800';
                            successDiv.style.marginTop = '4px';
                            successDiv.textContent = `✓ SUBAGENT SUCCESSFULLY SPAWNED (ID: ${data.conversation_id})`;
                            logOutput.appendChild(successDiv);
                            logOutput.scrollTop = logOutput.scrollHeight;
                            vibrateDevice([50, 25, 50]);
                        }
                    };
                    printNextLine();
                }
            })
            .catch(() => {
                logOutput.innerHTML = '<div style="color:var(--color-danger);">✗ FOUT: Kon subagent niet spawnen.</div>';
            });
        }

        // --- 3D PARTICLE NEBULA SYSTEM ---
        function init3DNebula() {
            const canvas = document.getElementById('nebula-3d-canvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            
            const resize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            };
            resize();
            window.addEventListener('resize', resize);

            // Initialize 3D particles
            for (let i = 0; i < particleCount; i++) {
                nebulaParticles.push({
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    z: Math.random() * 400,
                    size: Math.random() * 2 + 1,
                    color: Math.random() > 0.5 ? '#6366f1' : '#38bdf8'
                });
            }

            // Animation Loop
            const animate = () => {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; // trail effect
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const xc = canvas.width / 2;
                const yc = canvas.height / 2;
                const fov = 300; // perspective depth

                // Rotate particles slowly in 3D
                const angle = 0.002;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                nebulaParticles.forEach(p => {
                    // Y axis rotation
                    const x1 = p.x * cos - p.z * sin;
                    const z1 = p.z * cos + p.x * sin;
                    p.x = x1;
                    p.z = z1;

                    // Projection formulas
                    const scale = fov / (fov + p.z);
                    const x2d = p.x * scale + xc;
                    const y2d = p.y * scale + yc;
                    const r = p.size * scale;

                    if (x2d >= 0 && x2d <= canvas.width && y2d >= 0 && y2d <= canvas.height) {
                        ctx.beginPath();
                        ctx.arc(x2d, y2d, r, 0, Math.PI * 2);
                        ctx.fillStyle = p.color;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = p.color;
                        ctx.fill();
                        ctx.shadowBlur = 0; // reset
                    }
                });

                requestAnimationFrame(animate);
            };
            animate();
        }

        // --- 3D PARALLAX CARD TILT ---
        function setup3DCardParallax() {
            const cards = document.querySelectorAll('.tilt-target');
            cards.forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const xc = rect.width / 2;
                    const yc = rect.height / 2;
                    const angleX = (yc - y) / 10; // max 10 degrees tilt
                    const angleY = (x - xc) / 10;
                    card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.02, 1.02, 1.02)`;
                });

                card.addEventListener('mouseleave', () => {
                    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                });

                // Touch / S Pen support
                card.addEventListener('touchmove', (e) => {
                    if (e.touches.length > 0) {
                        const touch = e.touches[0];
                        const rect = card.getBoundingClientRect();
                        const x = touch.clientX - rect.left;
                        const y = touch.clientY - rect.top;
                        const xc = rect.width / 2;
                        const yc = rect.height / 2;
                        const angleX = (yc - y) / 14;
                        const angleY = (x - xc) / 14;
                        card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.01, 1.01, 1.01)`;
                    }
                }, { passive: true });

                card.addEventListener('touchend', () => {
                    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                });
            });
        }

        // --- CORTEX NODE EDITOR (PORTRAIT SWIPE & DRAG) ---
        let selectedNodeId = null;
        let isDraggingNode = false;

        function initNodeCoordinates() {
            const container = document.getElementById('cortex-drag-space');
            const w = container ? container.clientWidth : 340;
            const h = container ? container.clientHeight : 350;

            nodeCoordinates = {
                "solana_bot": { x: w * 0.25, y: h * 0.25 },
                "greenwheels": { x: w * 0.15, y: h * 0.7 },
                "mywheels": { x: w * 0.5, y: h * 0.8 },
                "contabo_vps": { x: w * 0.55, y: h * 0.45 },
                "sniper": { x: w * 0.8, y: h * 0.25 }
            };
        }

        function drawCortexEdges() {
            const space = document.getElementById('cortex-drag-space');
            const svg = document.getElementById('cortex-canvas-lines');
            if (!space || !svg) return;

            const w = space.clientWidth || 340;
            const h = space.clientHeight || 350;

            // Ensure all nodes in the knowledge graph have coordinates to prevent overlapping in the center
            Object.keys(knowledgeGraph.nodes).forEach(id => {
                if (!nodeCoordinates[id]) {
                    nodeCoordinates[id] = {
                        x: 30 + Math.random() * (w - 80),
                        y: 30 + Math.random() * (h - 80)
                    };
                }
            });

            // Clear old HTML nodes
            space.querySelectorAll('.cortex-node-ui').forEach(n => n.remove());

            svg.setAttribute('width', w);
            svg.setAttribute('height', h);

            svg.innerHTML = '';
            
            // Draw connection lines & dynamic synapses (data flow)
            knowledgeGraph.edges.forEach((edge, index) => {
                const start = nodeCoordinates[edge.source];
                const end = nodeCoordinates[edge.target];
                if (start && end) {
                    const pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    line.setAttribute('d', pathD);
                    line.setAttribute('id', `edge-path-${index}`);
                    line.setAttribute('stroke', 'rgba(139, 92, 246, 0.22)');
                    line.setAttribute('stroke-width', '2');
                    line.setAttribute('fill', 'none');
                    line.setAttribute('stroke-dasharray', '5, 5');
                    
                    line.innerHTML = `<animate attributeName="stroke-dashoffset" values="50;0" dur="5s" repeatCount="indefinite" />`;
                    svg.appendChild(line);

                    // Synapse (flowing data particle)
                    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    particle.setAttribute('r', '4');
                    particle.setAttribute('fill', '#38bdf8');
                    particle.style.filter = 'drop-shadow(0 0 4px #38bdf8)';
                    
                    const animateMotion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
                    animateMotion.setAttribute('dur', '3s');
                    animateMotion.setAttribute('repeatCount', 'indefinite');
                    animateMotion.setAttribute('path', pathD);
                    
                    particle.appendChild(animateMotion);
                    svg.appendChild(particle);
                }
            });

            // Draw HTML elements
            Object.keys(knowledgeGraph.nodes).forEach(id => {
                const node = knowledgeGraph.nodes[id];
                const pos = nodeCoordinates[id];

                const el = document.createElement('div');
                el.className = 'cortex-node-ui';
                el.id = `node-${id}`;
                el.style.left = `${pos.x}px`;
                el.style.top = `${pos.y}px`;
                
                let scannerHtml = '';
                if (selectedNodeId === id) {
                    el.style.borderColor = 'var(--color-accent)';
                    el.style.boxShadow = `0 0 25px rgba(56, 189, 248, 0.55), inset 0 0 15px rgba(56, 189, 248, 0.3)`;
                    scannerHtml = `<div class="cortex-node-scanner"></div>`;
                } else {
                    el.style.borderColor = node.type === 'server' ? 'var(--color-accent)' : 'var(--color-primary)';
                    el.style.boxShadow = `0 0 20px ${node.type === 'server' ? 'var(--color-accent)' : 'var(--color-primary)'}33`;
                }

                // Determine icon based on name
                let iconClass = 'fa-circle-nodes';
                if (id.includes('solana') || id.includes('bot')) iconClass = 'fa-coins';
                else if (id.includes('greenwheels') || id.includes('mywheels') || id.includes('car')) iconClass = 'fa-car';
                else if (id.includes('contabo') || id.includes('vps') || node.type === 'server') iconClass = 'fa-server';
                else if (id.includes('sniper')) iconClass = 'fa-crosshairs';

                el.innerHTML = `
                    ${scannerHtml}
                    <i class="fa-solid ${iconClass}"></i>
                    <div class="cortex-node-ui-label">${node.label}</div>
                `;
                
                el.addEventListener('click', (e) => {
                    if (isDraggingNode) return;
                    showNodeDetails(id);
                });

                space.appendChild(el);
            });
        }

        function showNodeDetails(id) {
            selectedNodeId = id;
            vibrateDevice([15]);
            drawCortexEdges();
            
            const node = knowledgeGraph.nodes[id];
            if (!node) return;
            
            const panel = document.getElementById('cortex-detail-panel');
            const title = document.getElementById('cortex-detail-title');
            const desc = document.getElementById('cortex-detail-desc');
            const typeEl = document.getElementById('cortex-detail-type');
            const ipEl = document.getElementById('cortex-detail-ip');
            const actions = document.getElementById('cortex-detail-actions');
            const badge = document.getElementById('cortex-detail-badge');
            
            panel.style.display = 'block';
            title.textContent = node.label;
            desc.textContent = node.description || "Geen beschrijving beschikbaar voor dit AGI-systeem.";
            typeEl.textContent = node.type || "project";
            
            // Context actions based on node ID
            if (id.includes('solana') || id.includes('bot')) {
                ipEl.textContent = "Supabase API REST";
                fetch('/api/solana/status')
                    .then(r => r.json())
                    .then(data => {
                        if (data.running) {
                            badge.className = "badge-status-glow success";
                            badge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Actief';
                        } else {
                            badge.className = "badge-status-glow error";
                            badge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Gestopt';
                        }
                    });
                
                actions.innerHTML = `
                    <button class="action-button primary" onclick="switchMobileTab('solana')" style="flex:1;"><i class="fa-solid fa-gear"></i> Open Solana Monitor</button>
                `;
            } else if (id.includes('contabo') || id.includes('vps') || node.type === 'server') {
                ipEl.textContent = "158.220.91.62:2222";
                badge.className = "badge-status-glow error";
                badge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Offline';
                
                actions.innerHTML = `
                    <button class="action-button primary" onclick="switchMobileTab('security')" style="flex:1; background:var(--color-danger); border:none;"><i class="fa-solid fa-shield-halved"></i> Open Security Panel</button>
                `;
            } else if (id.includes('greenwheels') || id.includes('mywheels') || id.includes('car')) {
                ipEl.textContent = "API Geofence Delft";
                badge.className = "badge-status-glow success";
                badge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Gekoppeld';
                
                actions.innerHTML = `
                    <button class="action-button primary" onclick="switchMobileTab('greenwheels')" style="flex:1; background: linear-gradient(135deg, var(--color-success), #047857); border:none;"><i class="fa-solid fa-car"></i> Mobility Center</button>
                `;
            } else if (id.includes('sniper')) {
                ipEl.textContent = "Dixon-Coles active";
                badge.className = "badge-status-glow success";
                badge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Standby';
                
                actions.innerHTML = `
                    <button class="action-button primary" onclick="switchMobileTab('sniper')" style="flex:1;"><i class="fa-solid fa-crosshairs"></i> Predictor Engine</button>
                `;
            } else {
                ipEl.textContent = "Lokaal Systeem";
                badge.className = "badge-status-glow success";
                badge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Online';
                actions.innerHTML = '';
            }
        }

        function setupDraggableCortex() {
            const space = document.getElementById('cortex-drag-space');
            if (!space) return;

            const getMousePos = (e) => {
                const rect = space.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                return {
                    x: Math.max(30, Math.min(space.clientWidth - 30, clientX - rect.left)),
                    y: Math.max(30, Math.min(space.clientHeight - 30, clientY - rect.top))
                };
            };

            let dragStartTime = 0;
            let dragStartPos = { x: 0, y: 0 };

            const startDrag = (e, nodeId) => {
                dragNodeId = nodeId;
                isDraggingNode = true;
                dragStartTime = Date.now();
                const pos = nodeCoordinates[nodeId] || { x: 0, y: 0 };
                dragStartPos = { x: pos.x, y: pos.y };
                vibrateDevice([10]);
                if (e.cancelable) e.preventDefault();
            };

            const moveDrag = (e) => {
                if (!dragNodeId) return;
                const pos = getMousePos(e);
                nodeCoordinates[dragNodeId] = pos;
                drawCortexEdges();
                if (e.cancelable) e.preventDefault();
            };

            const endDrag = () => {
                if (dragNodeId) {
                    vibrateDevice([5]);
                    const endPos = nodeCoordinates[dragNodeId] || { x: 0, y: 0 };
                    const dist = Math.hypot(endPos.x - dragStartPos.x, endPos.y - dragStartPos.y);
                    const duration = Date.now() - dragStartTime;
                    
                    // If click-like tap (moved less than 8px and duration less than 250ms)
                    if (duration < 250 && dist < 8) {
                        showNodeDetails(dragNodeId);
                    }
                    
                    setTimeout(() => {
                        isDraggingNode = false;
                    }, 50);
                    dragNodeId = null;
                }
            };

            // Touch support (S Pen / mobile touchscreen)
            space.addEventListener('touchstart', (e) => {
                const nodeEl = e.target.closest('.cortex-node-ui');
                if (nodeEl) {
                    const id = nodeEl.id.replace('node-', '');
                    startDrag(e, id);
                }
            }, { passive: false });

            space.addEventListener('touchmove', moveDrag, { passive: false });
            space.addEventListener('touchend', endDrag);

            // Mouse support (desktop PC)
            space.addEventListener('mousedown', (e) => {
                const nodeEl = e.target.closest('.cortex-node-ui');
                if (nodeEl) {
                    const id = nodeEl.id.replace('node-', '');
                    startDrag(e, id);
                }
            });

            window.addEventListener('mousemove', moveDrag);
            window.addEventListener('mouseup', endDrag);
        }

        function promptAddNode() {
            vibrateDevice([10]);
            const name = prompt("Geef de naam van de nieuwe node:");
            if (name) {
                const id = name.toLowerCase().replace(/ /g, '_');
                knowledgeGraph.nodes[id] = { label: name, type: 'project' };
                
                const space = document.getElementById('cortex-drag-space');
                nodeCoordinates[id] = {
                    x: space.clientWidth / 2 + (Math.random() * 40 - 20),
                    y: space.clientHeight / 2 + (Math.random() * 40 - 20)
                };
                drawCortexEdges();
                
                fetch('/api/cortex/node', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, node: knowledgeGraph.nodes[id] })
                }).catch(() => {});
            }
        }

        // --- KELLY CRITERION CALCULATOR FOR VALUE BETTING ---
        function calculateKellyAdvices(probs, odds, bankroll) {
            const container = document.getElementById('pred-kelly-container');
            if (!container) return;
            container.innerHTML = '';

            const outcomes = [
                { name: 'Thuis Win (1)', prob: probs.home / 100, odd: odds.home, color: 'var(--color-success)' },
                { name: 'Gelijkspel (X)', prob: probs.draw / 100, odd: odds.draw, color: 'var(--color-warning)' },
                { name: 'Uit Win (2)', prob: probs.away / 100, odd: odds.away, color: 'var(--color-danger)' }
            ];

            let hasValue = false;

            outcomes.forEach(out => {
                const b = out.odd - 1;
                const p = out.prob;
                const q = 1 - p;
                
                let f = 0;
                if (b > 0) {
                    f = (p * b - q) / b;
                }

                const fractionMultiplier = 0.25; // Quarter Kelly
                const kellyFraction = Math.max(0, f);
                const suggestedFraction = kellyFraction * fractionMultiplier;
                const stake = suggestedFraction * bankroll;

                const valuePct = (p * out.odd - 1) * 100;

                const card = document.createElement('div');
                card.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.04);";

                if (f > 0) {
                    hasValue = true;
                    card.style.borderColor = "rgba(245, 158, 11, 0.4)";
                    card.style.background = "rgba(245, 158, 11, 0.03)";
                    
                    card.innerHTML = `
                        <div>
                            <strong style="color:${out.color}; font-size:0.8rem;">${out.name}</strong>
                            <div style="font-size:0.65rem; color:var(--text-muted);">Model: ${(p*100).toFixed(1)}% | Odds: ${out.odd.toFixed(2)} | EV: <span style="color:var(--color-success); font-weight:800;">+${valuePct.toFixed(1)}%</span></div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.8rem; font-weight:800; color:var(--color-warning);">Inzet: €${stake.toFixed(2)}</div>
                            <div style="font-size:0.6rem; color:var(--text-muted);">(${ (suggestedFraction*100).toFixed(1) }% van bankroll)</div>
                        </div>
                    `;
                } else {
                    card.innerHTML = `
                        <div>
                            <strong style="color:var(--text-muted); font-size:0.8rem;">${out.name}</strong>
                            <div style="font-size:0.65rem; color:var(--text-muted);">Model: ${(p*100).toFixed(1)}% | Odds: ${out.odd.toFixed(2)} | EV: <span style="color:var(--color-danger);">${valuePct.toFixed(1)}%</span></div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">Geen Value</div>
                        </div>
                    `;
                }
                container.appendChild(card);
            });

            if (!hasValue) {
                const noValueMsg = document.createElement('div');
                noValueMsg.style.cssText = "font-size:0.75rem; color:var(--text-muted); text-align:center; padding:4px 0;";
                noValueMsg.textContent = "Geen wiskundige value gevonden op basis van de huidige bookmaker odds.";
                container.appendChild(noValueMsg);
            }
        }

        // --- QUANTUM SNIPER MATCH PREDICTOR ---
        function runMobilePrediction() {
            vibrateDevice([15, 10, 15]); // complex haptic run feedback
            sfx.playSuccess();
            
            const home = document.getElementById('calc-home').value;
            const away = document.getElementById('calc-away').value;
            
            // 7 Quantum Variables
            const h_alpha = parseFloat(document.getElementById('calc-h-alpha').value) / 10;
            const a_alpha = parseFloat(document.getElementById('calc-a-alpha').value) / 10;
            const heat = parseFloat(document.getElementById('calc-heat').value);
            const weather = parseFloat(document.getElementById('calc-weather').value);
            const ref_bias = parseFloat(document.getElementById('calc-ref').value);
            const style = parseFloat(document.getElementById('calc-style').value);
            const aggression = parseFloat(document.getElementById('calc-agg').value);
            const shadow_score = parseFloat(document.getElementById('calc-shadow').value) / 10;

            const oddsHome = parseFloat(document.getElementById('odds-home').value) || 1.0;
            const oddsDraw = parseFloat(document.getElementById('odds-draw').value) || 1.0;
            const oddsAway = parseFloat(document.getElementById('odds-away').value) || 1.0;
            const bankrollVal = parseFloat(document.getElementById('bankroll').value) || 100;

            const predCard = document.getElementById('pred-card');
            
            // Fetch prediction from backend server
            fetch('/api/sniper/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    home, away, h_alpha, a_alpha, heat, weather, ref_bias, style, aggression, shadow_score
                })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const dc = data.dixon_coles;
                    const rep = data.report;
                    
                    // Render Blok I: Absolute Score Predictions
                    document.getElementById('pred-score').textContent = dc.expected_score;
                    document.getElementById('pred-1x2').textContent = `Home: ${dc.home_win}% | Draw: ${dc.draw}% | Away: ${dc.away_win}%`;
                    document.getElementById('pred-over25').textContent = `Over 2.5 Goals: ${dc['over_2.5']}%`;
                    
                    // Render Blok II: The Indestructible
                    document.getElementById('pred-safety').textContent = rep.II_Indestructible;
                    
                    // Render Blok III: The Value Hunter
                    document.getElementById('pred-corners').textContent = rep.III_Value_Hunter.Corners;
                    document.getElementById('pred-cards').textContent = rep.III_Value_Hunter.Cards;
                    document.getElementById('pred-sot').textContent = rep.III_Value_Hunter.SoT;
                    
                    // Render Blok IV: The Moonshot Gallery
                    document.getElementById('pred-moonshot').textContent = rep.IV_Moonshot;
                    
                    // Render Blok V: Kelly Criterion Value Optimizer
                    lastCalculatedProbs = { home: parseFloat(dc.home_win), draw: parseFloat(dc.draw), away: parseFloat(dc.away_win) };
                    calculateKellyAdvices(
                        lastCalculatedProbs,
                        { home: oddsHome, draw: oddsDraw, away: oddsAway },
                        bankrollVal
                    );
                    
                    predCard.style.display = 'block';
                    
                    // Draw Poisson probability matrix heatmap
                    document.getElementById('poisson-card').style.display = 'block';
                    
                    // Parse expected goals to float
                    const parts = dc.expected_score.split('-');
                    const homeExp = parseFloat(parts[0]);
                    const awayExp = parseFloat(parts[1]);
                    setTimeout(() => drawPoissonMatrix(homeExp, awayExp), 50);
                }
            })
            .catch(() => {
                // Fallback offline simulation
                const finalH = Math.round(h_alpha);
                const finalA = Math.round(a_alpha);
                document.getElementById('pred-score').textContent = `${h_alpha.toFixed(1)} - ${a_alpha.toFixed(1)}`;
                
                const homeProb = (h_alpha / (h_alpha + a_alpha)) * 70;
                const awayProb = (a_alpha / (h_alpha + a_alpha)) * 70;
                const drawProb = 20;

                document.getElementById('pred-1x2').textContent = `Home: ${Math.round(homeProb)}% | Gelijk: ${Math.round(drawProb)}% | Away: ${Math.round(awayProb)}%`;
                document.getElementById('pred-over25').textContent = `Over 2.5 Goals: ${Math.round((h_alpha+a_alpha)*20)}%`;
                document.getElementById('pred-safety').textContent = `${home} Win of Gelijk`;
                document.getElementById('pred-corners').textContent = style > 60 ? ">9.5" : "<9.5";
                document.getElementById('pred-cards').textContent = ref_bias > 60 ? ">4.5" : "<4.5";
                document.getElementById('pred-sot').textContent = ">8.5";
                document.getElementById('pred-moonshot').textContent = `BetBuilder: ${home} Win + Corners >9.5 (Odds: 5.50)`;
                
                // Render Blok V: Kelly Criterion Value Optimizer
                lastCalculatedProbs = { home: homeProb, draw: drawProb, away: awayProb };
                calculateKellyAdvices(
                    lastCalculatedProbs,
                    { home: oddsHome, draw: oddsDraw, away: oddsAway },
                    bankrollVal
                );
                
                predCard.style.display = 'block';
                
                document.getElementById('poisson-card').style.display = 'block';
                setTimeout(() => drawPoissonMatrix(h_alpha, a_alpha), 50);
            });
        }

        // Renders a shimmery probability matrix for Dixon Coles
        function drawPoissonMatrix(homeExp, awayExp) {
            const canvas = document.getElementById('poisson-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const poisson = (k, lambda) => {
                return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
            };
            const factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);

            const size = 4; // 0 to 3 goals grid
            const cellW = w / (size + 1);
            const cellH = h / (size + 1);

            // Draw header labels
            ctx.fillStyle = 'var(--text-muted)';
            ctx.font = 'bold 9px Outfit';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Draw columns (Away Goals)
            for (let a = 0; a < size; a++) {
                ctx.fillText('A' + a, cellW * (a + 1) + cellW/2, cellH/2);
            }
            // Draw rows (Home Goals)
            for (let hG = 0; hG < size; hG++) {
                ctx.fillText('H' + hG, cellW/2, cellH * (hG + 1) + cellH/2);
            }

            // Compute and draw matrix cells
            let maxProb = 0;
            const probs = [];
            for (let hG = 0; hG < size; hG++) {
                probs[hG] = [];
                for (let aG = 0; aG < size; aG++) {
                    const p = poisson(hG, homeExp) * poisson(aG, awayExp);
                    probs[hG][aG] = p;
                    if (p > maxProb) maxProb = p;
                }
            }

            for (let hG = 0; hG < size; hG++) {
                for (let aG = 0; aG < size; aG++) {
                    const p = probs[hG][aG];
                    const intensity = maxProb > 0 ? p / maxProb : 0;
                    const x = cellW * (aG + 1);
                    const y = cellH * (hG + 1);

                    // AMOLED-glow styling for heatmap cell
                    ctx.fillStyle = `rgba(56, 189, 248, ${0.05 + intensity * 0.35})`;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.02 + intensity * 0.1})`;
                    ctx.lineWidth = 1;
                    
                    // Draw cell background
                    ctx.beginPath();
                    ctx.roundRect(x + 2, y + 2, cellW - 4, cellH - 4, 6);
                    ctx.fill();
                    ctx.stroke();

                    // Draw probability value text
                    ctx.fillStyle = intensity > 0.6 ? '#fff' : 'var(--text-muted)';
                    ctx.font = 'bold 9px Fira Code';
                    ctx.fillText(Math.round(p * 100) + '%', x + cellW/2, y + cellH/2);
                }
            }
        }

        // Live Scores & Dixon-Coles Auto Loader
        function fetchLiveScores() {
            fetch('/api/sniper/livescores')
                .then(r => r.json())
                .then(scores => {
                    const container = document.getElementById('livescore-feed');
                    if (!container) return;
                    container.innerHTML = '';
                    if (scores.length === 0) {
                        container.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center;">Geen live wedstrijden op dit moment.</div>';
                        return;
                    }
                    scores.forEach(match => {
                        const card = document.createElement('div');
                        card.className = 'livescore-card';
                        card.onclick = () => selectLiveMatch(match.home, match.away, match.home_alpha);
                        card.innerHTML = `
                            <div class="livescore-teams">
                                <div>${match.home}</div>
                                <div style="color:var(--text-muted);">${match.away}</div>
                            </div>
                            <div class="livescore-details">
                                <div class="livescore-score">${match.score}</div>
                                <div class="livescore-time">${match.minute}</div>
                            </div>
                        `;
                        container.appendChild(card);
                    });
                })
                .catch(() => {});
        }

        function selectLiveMatch(home, away, homeAlpha) {
            vibrateDevice([15, 10]);
            document.getElementById('calc-home').value = home;
            document.getElementById('calc-away').value = away;
            
            // Set sliders
            document.getElementById('calc-h-alpha').value = homeAlpha;
            document.getElementById('calc-a-alpha').value = 13; // default
            
            document.getElementById('val-h-alpha').textContent = (homeAlpha/10).toFixed(1);
            document.getElementById('val-a-alpha').textContent = "1.3";
            
            // Auto run prediction
            runMobilePrediction();
            
            // Visual alert
            const alertB = document.createElement('div');
            alertB.style.cssText = "position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:var(--color-accent); color:#000; padding:8px 16px; border-radius:10px; font-size:0.75rem; font-weight:800; z-index:999; pointer-events:none; box-shadow:var(--glow-cyan); animation: slide-in 0.2s ease forwards;";
            alertB.textContent = `Live match ${home} - ${away} ingeladen in model!`;
            document.body.appendChild(alertB);
            setTimeout(() => alertB.remove(), 2500);
        }

        // --- S PEN SKETCHPAD MINDMAP AREA ---
        function initSpenCanvas() {
            const canvas = document.getElementById('spen-canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size matching styling
            resizeSpenCanvas();

            // S Pen or Touch Drawing events
            canvas.addEventListener('mousedown', startDraw);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', endDraw);
            canvas.addEventListener('mouseout', endDraw);

            canvas.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                startDraw({ clientX: touch.clientX, clientY: touch.clientY });
            }, { passive: true });

            canvas.addEventListener('touchmove', (e) => {
                if (e.touches.length > 0) {
                    const touch = e.touches[0];
                    draw({ clientX: touch.clientX, clientY: touch.clientY });
                }
            }, { passive: true });

            canvas.addEventListener('touchend', endDraw);
        }

        function resizeSpenCanvas() {
            const canvas = document.getElementById('spen-canvas');
            if (canvas) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
                clearSpenCanvas();
            }
        }
        let lastDrawX = 0;
        let lastDrawY = 0;
        let currentStrokePoints = [];
        let canvasBeforeStroke = null;

        // Geometrische wiskunde voor het herkennen van getekende cirkels/rechthoeken
        function analyzeStrokeShape(points) {
            if (points.length < 15) return null;

            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let sumX = 0, sumY = 0;

            for (let p of points) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
                sumX += p.x;
                sumY += p.y;
            }

            const width = maxX - minX;
            const height = maxY - minY;
            if (width < 20 || height < 20) return null;

            const centroidX = sumX / points.length;
            const centroidY = sumY / points.length;

            // 1. Cirkel variantie analyse
            let totalDist = 0;
            let distances = [];
            for (let p of points) {
                let d = Math.hypot(p.x - centroidX, p.y - centroidY);
                distances.push(d);
                totalDist += d;
            }
            const avgRadius = totalDist / points.length;

            let totalDev = 0;
            for (let d of distances) {
                totalDev += Math.abs(d - avgRadius);
            }
            const devRatio = (totalDev / points.length) / avgRadius;

            const startPt = points[0];
            const endPt = points[points.length - 1];
            const startEndDist = Math.hypot(startPt.x - endPt.x, startPt.y - endPt.y);

            // Als de radius variantie erg klein is en de cirkel redelijk gesloten is
            if (devRatio < 0.12 && startEndDist < avgRadius * 1.0) {
                return {
                    type: 'circle',
                    x: centroidX,
                    y: centroidY,
                    r: avgRadius
                };
            }

            // 2. Rechthoek variantie analyse
            let rectDistSum = 0;
            for (let p of points) {
                let distLeft = Math.abs(p.x - minX);
                let distRight = Math.abs(p.x - maxX);
                let distTop = Math.abs(p.y - minY);
                let distBottom = Math.abs(p.y - maxY);
                let minDist = Math.min(distLeft, distRight, distTop, distBottom);
                rectDistSum += minDist;
            }
            const avgRectDist = rectDistSum / points.length;
            const rectDevRatio = avgRectDist / Math.max(width, height);

            if (rectDevRatio < 0.12 && startEndDist < Math.max(width, height) * 0.8) {
                return {
                    type: 'rectangle',
                    x: minX,
                    y: minY,
                    w: width,
                    h: height
                };
            }

            return null;
        }

        function startDraw(e) {
            drawing = true;
            const canvas = document.getElementById('spen-canvas');
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ctx = canvas.getContext('2d');

            // Sla de staat op voor de stroke om ruwe strokes te kunnen vervangen
            canvasBeforeStroke = ctx.getImageData(0, 0, canvas.width, canvas.height);
            currentStrokePoints = [{ x, y }];

            ctx.beginPath();
            ctx.moveTo(x, y);
            lastDrawX = x;
            lastDrawY = y;
        }

        function draw(e) {
            if (!drawing) return;
            const canvas = document.getElementById('spen-canvas');
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ctx = canvas.getContext('2d');

            ctx.lineTo(x, y);
            ctx.strokeStyle = activeTool === 'pen' ? spenColor : '#010103';
            ctx.lineWidth = activeTool === 'pen' ? spenSize : 15;
            ctx.lineCap = 'round';
            ctx.stroke();

            currentStrokePoints.push({ x, y });

            // Tactile feedback based on pen speed / coordinate distance
            const dist = Math.hypot(x - lastDrawX, y - lastDrawY);
            if (dist > 8 && navigator.vibrate) {
                navigator.vibrate([2]); // tiny haptic vibration for a textured pen-on-screen feel
            }

            lastDrawX = x;
            lastDrawY = y;
        }

        function endDraw() {
            if (!drawing) return;
            drawing = false;

            if (activeTool === 'pen' && currentStrokePoints.length > 15) {
                const shape = analyzeStrokeShape(currentStrokePoints);
                if (shape) {
                    const canvas = document.getElementById('spen-canvas');
                    const ctx = canvas.getContext('2d');
                    
                    if (canvasBeforeStroke) {
                        ctx.putImageData(canvasBeforeStroke, 0, 0);
                    }
                    
                    // Teken de perfecte neon vorm
                    ctx.strokeStyle = spenColor;
                    ctx.lineWidth = spenSize + 1.5;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = spenColor;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    ctx.beginPath();
                    if (shape.type === 'circle') {
                        ctx.arc(shape.x, shape.y, shape.r, 0, 2 * Math.PI);
                    } else if (shape.type === 'rectangle') {
                        ctx.rect(shape.x, shape.y, shape.w, shape.h);
                    }
                    ctx.stroke();
                    
                    // Reset shadow parameters
                    ctx.shadowBlur = 0;
                    
                    vibrateDevice([30, 20, 30]);
                }
            }
            currentStrokePoints = [];
            canvasBeforeStroke = null;
        }

        function setSpenTool(tool) {
            vibrateDevice([8]);
            activeTool = tool;
            document.querySelectorAll('.spen-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`spen-${tool}`).classList.add('active');
        }

        function clearSpenCanvas() {
            const canvas = document.getElementById('spen-canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#010103';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        function saveSpenSketch() {
            vibrateDevice([20, 10, 20]);
            const canvas = document.getElementById('spen-canvas');
            const dataURL = canvas.toDataURL('image/png');
            
            fetch('/api/spen/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataURL })
            })
            .then(r => r.json())
            .then(data => {
                alert("S Pen schets succesvol bewaard op de server!");
                clearSpenCanvas();
            })
            .catch(e => {
                alert("Schets lokaal gesimuleerd bewaard (offline modus).");
                clearSpenCanvas();
            });
        }

        // --- WEB SPEECH VOICE RECOGNITION (OUT OF THE BOX) ---
        function initVoiceRecognition() {
            const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (Speech) {
                speechRecognition = new Speech();
                speechRecognition.continuous = false;
                speechRecognition.lang = 'nl-NL';
                
                speechRecognition.onstart = () => {
                    isListening = true;
                    document.getElementById('mic-button').classList.add('listening');
                    document.getElementById('chat-input').placeholder = "Aan het luisteren naar stem...";
                };

                speechRecognition.onend = () => {
                    isListening = false;
                    document.getElementById('mic-button').classList.remove('listening');
                    document.getElementById('chat-input').placeholder = "Typ of spreek een commando...";
                };

                speechRecognition.onresult = (e) => {
                    const resultText = e.results[0][0].transcript;
                    document.getElementById('chat-input').value = resultText;
                    vibrateDevice([15]);
                    
                    // Direct parse and send spoken phrase
                    sendVoiceCommand(resultText);
                };
            }
        }

        function toggleSpeechRecognition() {
            vibrateDevice([12]);
            if (!speechRecognition) {
                alert("Speech recognition API niet ondersteund in deze browser.");
                return;
            }
            if (isListening) {
                speechRecognition.stop();
            } else {
                speechRecognition.start();
            }
        }

        function initCognitiveWave() {
            waveCanvas = document.getElementById('cognitive-wave-canvas');
            if (!waveCanvas) return;
            waveCtx = waveCanvas.getContext('2d');
            waveCanvas.width = waveCanvas.parentElement.clientWidth;
            waveCanvas.height = 48;

            let x = 0;
            const drawWave = () => {
                if (!waveCtx) return;
                waveCtx.fillStyle = '#000000';
                waveCtx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);

                // Draw central cognitive pulse wave
                waveCtx.beginPath();
                waveCtx.strokeStyle = isListening ? 'var(--color-danger)' : 'var(--color-accent)';
                waveCtx.lineWidth = 2;
                waveCtx.shadowBlur = 10;
                waveCtx.shadowColor = isListening ? 'var(--color-danger)' : 'var(--color-accent)';

                for (let i = 0; i < waveCanvas.width; i++) {
                    const y = waveCanvas.height / 2 + Math.sin(i * 0.035 + x) * waveAmplitude;
                    if (i === 0) waveCtx.moveTo(i, y);
                    else waveCtx.lineTo(i, y);
                }
                waveCtx.stroke();
                waveCtx.shadowBlur = 0; // reset

                x += waveSpeed;
                requestAnimationFrame(drawWave);
            };
            drawWave();
        }

        function sendVoiceCommand(text) {
            const stream = document.getElementById('chat-stream');
            
            // Add user msg bubble
            const userB = document.createElement('div');
            userB.className = 'chat-bubble user';
            userB.textContent = text;
            stream.appendChild(userB);
            stream.scrollTop = stream.scrollHeight;

            document.getElementById('chat-input').value = '';

            // Animate cognitive visualizer (thinking state)
            waveSpeed = 0.22;
            waveAmplitude = 15;

            // POST command to Omni AI chat API developed by JwP Tech
            fetch('/api/omni/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            })
            .then(r => r.json())
            .then(data => {
                // Return wave to calm state
                waveSpeed = 0.04;
                waveAmplitude = 4;

                const assistB = document.createElement('div');
                assistB.className = 'chat-bubble assistant';
                
                // Formatted markdown bold parsing
                assistB.innerHTML = data.response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                
                stream.appendChild(assistB);
                stream.scrollTop = stream.scrollHeight;
                vibrateDevice([10]);

                // Handle local screen transitions based on commands
                executeLocalVoiceCommands(text.toLowerCase());
            })
            .catch(e => {
                waveSpeed = 0.04;
                waveAmplitude = 4;

                const assistB = document.createElement('div');
                assistB.className = 'chat-bubble assistant';
                assistB.textContent = "Omni AI offline. Connectie met JwP Tech server mislukt.";
                stream.appendChild(assistB);
                stream.scrollTop = stream.scrollHeight;
            });
        }

        function executeLocalVoiceCommands(phrase) {
            if (phrase.includes('bereken') || phrase.includes('voorspel')) {
                setTimeout(() => switchMobileTab('sniper'), 1200);
            } else if (phrase.includes('schrijf') || phrase.includes('teken') || phrase.includes('pen')) {
                setTimeout(() => switchMobileTab('spen'), 1200);
            } else if (phrase.includes('cortex') || phrase.includes('netwerk')) {
                setTimeout(() => switchMobileTab('cortex'), 1200);
            }
        }

        function handleChatEnter(e) {
            if (e.key === 'Enter') {
                const input = document.getElementById('chat-input');
                const val = input.value.trim();
                if (val) sendVoiceCommand(val);
            }
        }

        // --- TERMINAL COMMAND CONSOLE ---
        function handleCliEnter(e) {
            if (e.key === 'Enter') {
                const input = document.getElementById('cli-input');
                const val = input.value.trim();
                if (!val) return;

                const out = document.getElementById('cli-output');
                const line = document.createElement('div');
                line.textContent = `$ ${val}`;
                out.appendChild(line);

                input.value = '';

                if (val === 'clear') {
                    out.innerHTML = '';
                    return;
                }

                // POST command to backend subprocess shell execution
                fetch('/api/terminal/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: val })
                })
                .then(r => r.json())
                .then(data => {
                    const resp = document.createElement('pre');
                    resp.style.color = '#fff';
                    resp.style.whiteSpace = 'pre-wrap';
                    resp.style.fontFamily = 'inherit';
                    resp.style.fontSize = 'inherit';
                    resp.textContent = data.output || `Exit code: ${data.exit_code}`;
                    out.appendChild(resp);
                    out.scrollTop = out.scrollHeight;
                    vibrateDevice([8]);
                })
                .catch(e => {
                    const resp = document.createElement('div');
                    resp.style.color = 'var(--color-danger)';
                    resp.textContent = "Offline of netwerkfout bij uitvoeren commando.";
                    out.appendChild(resp);
                    out.scrollTop = out.scrollHeight;
                });
            }
        }

        function analyzeSpenSketch() {
            vibrateDevice([15, 10, 15]);
            const canvas = document.getElementById('spen-canvas');
            const dataURL = canvas.toDataURL('image/png');
            
            // First save, then analyze
            fetch('/api/spen/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataURL })
            })
            .then(r => r.json())
            .then(data => {
                const filename = data.filename;
                return fetch('/api/spen/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename })
                });
            })
            .then(r => r.json())
            .then(result => {
                alert(`AI Parser heeft mindmap geanalyseerd! Gevonden concepten:\n- ${result.detected[0].label}. Het concept is direct geïnjecteerd in je Cortex Graaf.`);
                clearSpenCanvas();
                switchMobileTab('cortex');
            })
            .catch(e => {
                alert("AI Vision parsing lokaal offline gesimuleerd.");
                clearSpenCanvas();
            });
        }

        let sniperChartInstance = null;

        function updateSniperChart(backtestData) {
            if (!backtestData || backtestData.length === 0) return;
            
            const labels = backtestData.map(row => row.league);
            const roiData = backtestData.map(row => row.roi);
            const winstData = backtestData.map(row => row.winst);
            
            const canvas = document.getElementById('sniper-roi-chart');
            if (!canvas) return;
            const ctxS = canvas.getContext('2d');
            
            if (sniperChartInstance) {
                sniperChartInstance.data.labels = labels;
                sniperChartInstance.data.datasets[0].data = roiData;
                sniperChartInstance.data.datasets[1].data = winstData;
                sniperChartInstance.update();
            } else {
                sniperChartInstance = new Chart(ctxS, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                type: 'bar',
                                label: 'ROI (%)',
                                data: roiData,
                                backgroundColor: 'rgba(56, 189, 248, 0.35)',
                                borderColor: '#38bdf8',
                                borderWidth: 1.5,
                                borderRadius: 6,
                                yAxisID: 'y'
                            },
                            {
                                type: 'line',
                                label: 'Winst (€)',
                                data: winstData,
                                borderColor: '#8b5cf6',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                borderWidth: 2.5,
                                fill: true,
                                tension: 0.3,
                                pointBackgroundColor: '#8b5cf6',
                                pointBorderColor: '#fff',
                                pointHoverRadius: 6,
                                yAxisID: 'y1'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                labels: { color: '#9ca3af', font: { family: 'Outfit', size: 9 } }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 9 } }
                            },
                            y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                grid: { color: 'rgba(255,255,255,0.03)' },
                                ticks: { 
                                    color: '#38bdf8', 
                                    font: { family: 'Outfit', size: 9 },
                                    callback: function(value) { return value + '%'; }
                                }
                            },
                            y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                grid: { drawOnChartArea: false },
                                ticks: { 
                                    color: '#8b5cf6', 
                                    font: { family: 'Outfit', size: 9 },
                                    callback: function(value) { return '€' + value; }
                                }
                            }
                        }
                    }
                });
            }
        }

        let overviewChartInstance = null;

        let solanaPnlChartInstance = null;

        // --- CHART JS (MOBILE EDITION) ---
        function initCharts() {
            const ctxO = document.getElementById('overview-chart').getContext('2d');
            overviewChartInstance = new Chart(ctxO, {
                type: 'bar',
                data: {
                    labels: ['S26 CPU Load', 'API Traffic', 'GCloud Credits', 'Active memory'],
                    datasets: [{
                        label: 'Inzet %',
                        data: [42, 65, 15, 34],
                        backgroundColor: ['#6366f1', '#38bdf8', '#10b981', '#f43f5e'],
                        borderWidth: 0,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#6b7280' } },
                        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#6b7280' } }
                    }
                }
            });

            const ctxSolana = document.getElementById('solana-pnl-chart');
            if (ctxSolana) {
                // Generate a simulated upward equity curve
                let simulatedPnL = [10.0];
                let val = 10.0;
                for (let i = 0; i < 20; i++) {
                    val += (Math.random() * 2) - 0.5; // Upward bias
                    simulatedPnL.push(val.toFixed(2));
                }

                solanaPnlChartInstance = new Chart(ctxSolana.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: Array.from({length: 21}, (_, i) => `T${i}`),
                        datasets: [{
                            label: 'Gesimuleerde PnL (SOL)',
                            data: simulatedPnL,
                            borderColor: '#10b981', // Success green
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { grid: { display: false }, ticks: { display: false } },
                            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: {size: 9} } }
                        }
                    }
                });
            }
        }

        function triggerSystemHardening() {
            vibrateDevice([100, 50, 100]);
            switchMobileTab('security');
            setTimeout(() => {
                runSecurityHardening();
            }, 300);
        }

        // --- GREENWHEELS MOBILITY WORKFLOW ---
        let allGwCars = [];

        function loadGwCars() {
            const tableBody = document.getElementById('gw-cars-table-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Auto\'s ophalen uit all_cars.json...</td></tr>';
            }
            
            fetch('/api/greenwheels/cars')
                .then(r => r.json())
                .then(cars => {
                    allGwCars = Array.isArray(cars) ? cars : [];
                    renderGwCarsTable(allGwCars);
                })
                .catch(err => {
                    console.error("Fout bij laden Greenwheels auto's:", err);
                    if (tableBody) {
                        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--color-danger);">Fout bij laden van all_cars.json.</td></tr>';
                    }
                });
        }

        let lastSelectedCarId = null;

        function renderGwCarsTable(carsList) {
            const tableBody = document.getElementById('gw-cars-table-body');
            if (!tableBody) return;
            tableBody.innerHTML = '';
            
            const countEl = document.getElementById('gw-car-count');
            if (!Array.isArray(carsList)) {
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--color-danger);">Geen geldige autodata ontvangen.</td></tr>';
                return;
            }

            if (countEl) countEl.textContent = `${carsList.length} auto's`;
            
            if (carsList.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Geen auto\'s gevonden.</td></tr>';
                return;
            }

            carsList.forEach(car => {
                if (!car) return;
                const tr = document.createElement('tr');
                
                let distanceText = "";
                if (car.distance_meters !== undefined && car.distance_meters !== null) {
                    const distKm = car.distance_meters / 1000;
                    distanceText = `<div style="font-size:0.7rem; color:var(--color-accent); font-weight:800; margin-top:2px;"><i class="fa-solid fa-location-arrow"></i> ${distKm.toFixed(2)} km afstand</div>`;
                }

                const carId = car.id ? String(car.id) : 'N/A';
                const carLicense = car.license || 'Onbekend';
                const carAddress = car.address || 'Geen adres beschikbaar';

                tr.innerHTML = `
                    <td style="font-weight:700; color:#fff;">
                        ${carLicense}
                        <div style="font-size:0.65rem; color:var(--text-muted); font-weight:400; font-family:'Fira Code', monospace; margin-top:2px;">${carId.slice(0, 8)}...</div>
                    </td>
                    <td style="font-size:0.8rem; color:var(--text-muted);">
                        ${carAddress}
                        ${distanceText}
                    </td>
                    <td>
                        <button onclick="bookGwCar('${carId}')" style="background:rgba(234,179,8,0.1); border:1px solid #eab308; color:#eab308; border-radius:8px; padding:4px 8px; font-size:0.7rem; font-weight:800; cursor:pointer;"><i class="fa-solid fa-key"></i> Unlock</button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }

        window.updateDeviceLocationHTML5 = function() {
            vibrateDevice([15]);
            if (!navigator.geolocation) {
                alert("Geolocation wordt niet ondersteund door deze browser.");
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    document.getElementById('gw-device-lat').value = lat.toFixed(5);
                    document.getElementById('gw-device-lng').value = lng.toFixed(5);
                    
                    saveDeviceLocation(lat, lng);
                },
                (error) => {
                    alert("Fout bij ophalen van GPS-locatie: " + error.message);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        };

        window.updateDeviceLocationManual = function() {
            vibrateDevice([15]);
            const lat = parseFloat(document.getElementById('gw-device-lat').value);
            const lng = parseFloat(document.getElementById('gw-device-lng').value);
            
            if (isNaN(lat) || isNaN(lng)) {
                alert("Voer geldige coördinaten in.");
                return;
            }
            
            saveDeviceLocation(lat, lng);
        };

        function saveDeviceLocation(lat, lng) {
            fetch('/api/greenwheels/coords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    alert("GPS-locatie succesvol bijgewerkt op de server!");
                    loadGwCars(); // Refresh list to calculate distances from the new location
                } else {
                    alert("Fout bij bijwerken GPS-locatie.");
                }
            })
            .catch(() => {
                alert("Netwerkfout bij bijwerken GPS-locatie.");
            });
        }

        let searchTimeout = null;

        function filterGwCars() {
            const query = document.getElementById('gw-search').value;
            
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const tableBody = document.getElementById('gw-cars-table-body');
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin"></i> Bezig met zoeken...</td></tr>';
                
                fetch(`/api/greenwheels/cars?q=${encodeURIComponent(query)}`)
                    .then(r => r.json())
                    .then(cars => {
                        allGwCars = cars;
                        renderGwCarsTable(cars);
                    })
                    .catch(() => {
                        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--color-danger);">Fout bij laden van zoekresultaten.</td></tr>';
                    });
            }, 250);
        }

        function bookGwCar(carId) {
            vibrateDevice([40, 20, 40]);
            lastSelectedCarId = carId; // Sla op als actieve target voor recon spoofing
            
            fetch('/api/greenwheels/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ car_id: carId, action: 'unlock' })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const statusCard = document.getElementById('gw-status-card');
                    statusCard.style.display = 'block';
                    document.getElementById('gw-status-license').textContent = data.details.license;
                    document.getElementById('gw-status-address').textContent = data.details.address;
                    statusCard.scrollIntoView({ behavior: 'smooth' });
                    loadGwCars(); // Herlaad vloot om afstanden te updaten
                } else {
                    vibrateDevice([100, 100]);
                    alert("Fout bij openen auto: \n\n" + data.error);
                }
            })
            .catch(() => {
                alert("Fout bij communicatie met Greenwheels API.");
            });
        }

        function controlGwCar(action) {
            vibrateDevice([60, 30, 60]);
            const license = document.getElementById('gw-status-license').textContent;
            
            // Zoek carId op basis van license
            const car = allGwCars.find(c => c.license === license);
            const carId = car ? car.id : lastSelectedCarId;
            
            fetch('/api/greenwheels/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ car_id: carId, action: 'lock' })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    alert(`Voertuig ${license} succesvol vergrendeld. Trip beëindigd.`);
                    document.getElementById('gw-status-card').style.display = 'none';
                    loadGwCars(); // Herlaad vloot om afstanden te updaten
                } else {
                    alert("Fout bij vergrendelen: " + data.message);
                }
            })
            .catch(() => {
                alert("Fout bij communicatie met API.");
            });
        }

        // --- SECURITY & HACKING AUDIT ---
        function runSecurityScan() {
            vibrateDevice([30, 15, 30]);
            const ip = document.getElementById('sec-ip').value.trim();
            const tableBody = document.getElementById('sec-scan-table-body');
            const scanCard = document.getElementById('sec-scan-card');
            
            scanCard.style.display = 'block';
            document.getElementById('sec-scan-target').textContent = ip;
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin"></i> Scannen van poorten op target...</td></tr>';
            document.getElementById('sec-vulnerabilities-box').style.display = 'none';
            
            fetch('/api/security/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip })
            })
            .then(r => r.json())
            .then(data => {
                tableBody.innerHTML = '';
                data.ports.forEach(p => {
                    const tr = document.createElement('tr');
                    let badgeColor = 'var(--color-success)';
                    if (p.security.includes('RISICO') || p.security.includes('HIGH')) badgeColor = 'var(--color-danger)';
                    else if (p.security.includes('WAARSCHUWING')) badgeColor = 'var(--color-warning)';
                    
                    tr.innerHTML = `
                        <td style="font-weight:700; color:#fff;">${p.port}</td>
                        <td style="font-family:\'Fira Code\', monospace; font-size:0.75rem;">${p.service}</td>
                        <td><span style="color:${p.status === 'Open' ? 'var(--color-success)' : 'var(--text-muted)'}; font-weight:700;">${p.status}</span></td>
                        <td><span style="color:${badgeColor}; font-weight:800; font-size:0.7rem;">${p.security}</span></td>
                    `;
                    tableBody.appendChild(tr);
                });
                
                if (data.vulnerabilities.length > 0) {
                    const vulnsBox = document.getElementById('sec-vulnerabilities-box');
                    const vulnsList = document.getElementById('sec-vulnerabilities-list');
                    vulnsBox.style.display = 'block';
                    vulnsList.innerHTML = '';
                    data.vulnerabilities.forEach(v => {
                        vulnsList.innerHTML += `
                            <div style="margin-bottom:8px;">
                                <strong style="color:var(--color-danger); font-size:0.75rem;">${v.id} - ${v.name} (${v.severity})</strong>
                                <div style="color:var(--text-muted); font-size:0.7rem; margin-top:2px;">${v.desc}</div>
                            </div>
                        `;
                    });
                }
            })
            .catch(() => {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--color-danger);">Scan mislukt of offline mode.</td></tr>';
            });
        }

        function runChronosTimeline() {
            vibrateDevice([40, 20, 40]);
            const logBox = document.getElementById('sec-timeline-results');
            const logOutput = document.getElementById('sec-timeline-log');
            const visualTimeline = document.getElementById('sec-visual-timeline');
            
            logBox.style.display = 'block';
            logOutput.textContent = '[Chronos] Bootstrap forensische scan...\n[Chronos] Analyseren van authenticatie logs...\n[Chronos] Bezig met inladen van attack models...';
            visualTimeline.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem;"><i class="fa-solid fa-circle-notch fa-spin"></i> Reconstrueren van incident-tijdlijn...</div>';
            logBox.scrollIntoView({ behavior: 'smooth' });

            fetch('/api/security/timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    let text = `[Chronos] STDOUT:\n${data.stdout}\n`;
                    if (data.stderr) text += `[Chronos] STDERR:\n${data.stderr}\n`;
                    
                    const r = data.report;
                    text += `\n[Chronos] CHRONOLOGISCH FORENSISCH RAPPORT (${r.timestamp})\n`;
                    text += `==============================================\n`;
                    text += `Gedetecteerde Bedreigingen:\n`;
                    r.threats.forEach(t => {
                        text += `- [${t.risk}] ${t.source}: ${t.title}\n`;
                    });
                    text += `\nBeveiligingsadviezen:\n`;
                    r.recommendations.forEach((rec, idx) => {
                        text += `${idx + 1}. ${rec}\n`;
                    });
                    
                    logOutput.textContent = text;

                    // Visuele details ophalen
                    fetch('/api/security/timeline/details')
                        .then(res => res.json())
                        .then(events => {
                            visualTimeline.innerHTML = '';
                            events.forEach(ev => {
                                const borderCol = ev.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.4)' : (ev.severity === 'HIGH' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.4)');
                                const badgeBg = ev.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : (ev.severity === 'HIGH' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(56, 189, 248, 0.1)');
                                const badgeTextCol = ev.severity === 'CRITICAL' ? 'var(--color-danger)' : (ev.severity === 'HIGH' ? 'var(--color-warning)' : 'var(--color-accent)');
                                
                                const node = document.createElement('div');
                                node.style.cssText = `position:relative; background:rgba(255,255,255,0.02); border:1px solid ${borderCol}; border-radius:8px; padding:10px; font-size:0.75rem; margin-bottom:8px;`;
                                node.innerHTML = `
                                    <div style="position:absolute; left:-27px; top:12px; width:12px; height:12px; border-radius:50%; background:${badgeTextCol}; border:3px solid #000; box-shadow:0 0 10px ${badgeTextCol};"></div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                        <span style="font-weight:800; color:#fff;"><i class="fa-solid ${ev.icon}"></i> ${ev.phase}</span>
                                        <span class="badge" style="background:${badgeBg}; border:1px solid ${borderCol}; color:${badgeTextCol}; font-size:0.6rem; padding:1px 5px;">${ev.severity}</span>
                                    </div>
                                    <div style="color:var(--text-muted); font-size:0.7rem; margin-bottom:4px;">${ev.desc}</div>
                                    <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:var(--text-muted);">
                                        <span>IP: <strong style="color:#fff;">${ev.ip}</strong></span>
                                        <span>${ev.time}</span>
                                    </div>
                                `;
                                visualTimeline.appendChild(node);
                            });
                        })
                        .catch(() => {
                            visualTimeline.innerHTML = '<div style="color:var(--color-danger); font-size:0.75rem;">Fout bij inladen visuele tijdlijn.</div>';
                        });
                } else {
                    logOutput.textContent = "Fout bij uitvoeren van Chronos timeline reconstructie.";
                }
            })
            .catch(e => {
                logOutput.textContent = "Offline simulatie: Forensisch rapport genereren...\n\n[Chronos] RECONSTRUCTIE TIJDLIJN\n- Fase 1: Reconnaissance (SSH brute force gedetecteerd op poort 22)\n- Fase 2: Inbraak (Succesvolle root login vanuit 185.220.101.4 op 12-06-2026 20:15 UTC)\n- Fase 3: Exfiltration (Mogelijke diefstal van private keys in overlord.log)\n- Fase 4: Execution (Transactie voltooid op blockchain)";
            });
        }

        // --- GREENWHEELS API RECON ---
        function runGwRecon(action) {
            vibrateDevice([30, 15, 30]);
            const resultsBox = document.getElementById('gw-recon-results');
            const logOutput = document.getElementById('gw-recon-log');
            
            resultsBox.style.display = 'block';
            logOutput.innerHTML = `<div style="color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin"></i> Bezig met uitvoeren van ${action} attack vector...</div>`;
            logOutput.scrollIntoView({ behavior: 'smooth' });

            fetch('/api/greenwheels/recon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, car_id: lastSelectedCarId })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    logOutput.innerHTML = '';
                    let i = 0;
                    function printLog() {
                        if (i < data.logs.length) {
                            const div = document.createElement('div');
                            const logText = data.logs[i];
                            if (logText.includes('[SUCCESS]')) {
                                div.style.color = 'var(--color-success)';
                                div.style.fontWeight = '800';
                            } else if (logText.includes('[WARNING]')) {
                                div.style.color = 'var(--color-warning)';
                            } else {
                                div.style.color = '#eab308';
                            }
                            div.textContent = logText;
                            logOutput.appendChild(div);
                            logOutput.scrollTop = logOutput.scrollHeight;
                            i++;
                            setTimeout(printLog, 300);
                        } else {
                            // Opdracht voltooid, herlaad de autotabel om de nieuwe wiskundige afstanden weer te geven
                            setTimeout(loadGwCars, 1000);
                        }
                    }
                    printLog();
                } else {
                    logOutput.textContent = "Fout bij uitvoeren van Greenwheels recon.";
                }
            })
            .catch(() => {
                logOutput.textContent = "Netwerkfout tijdens de Greenwheels API-reconnaissance.";
            });
        }

        // --- SECURITY HARDENING PROTOCOL ---
        function runSecurityHardening() {
            vibrateDevice([50, 25, 50]);
            const resultsBox = document.getElementById('sec-hardening-results');
            const logOutput = document.getElementById('sec-hardening-log');
            
            resultsBox.style.display = 'block';
            logOutput.innerHTML = '<div style="color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin"></i> Initialiseren van VPS Secure Hardening...</div>';
            logOutput.scrollIntoView({ behavior: 'smooth' });

            fetch('/api/security/hardening', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    logOutput.innerHTML = '';
                    let i = 0;
                    function printLog() {
                        if (i < data.logs.length) {
                            const div = document.createElement('div');
                            const logText = data.logs[i];
                            if (logText.includes('[SUCCESS]')) {
                                div.style.color = 'var(--color-success)';
                                div.style.fontWeight = '800';
                            } else {
                                div.style.color = 'var(--color-success)';
                            }
                            div.textContent = logText;
                            logOutput.appendChild(div);
                            logOutput.scrollTop = logOutput.scrollHeight;
                            i++;
                            setTimeout(printLog, 300);
                        }
                    }
                    printLog();
                } else {
                    logOutput.textContent = "Fout bij uitvoeren van hardening.";
                }
            })
            .catch(() => {
                logOutput.textContent = "Fout bij verbinding met hardening endpoint.";
            });
        }

        function syncWithServer() {
            // Fetch live system statistics (CPU & Memory load from S26 Ultra host)
            fetch('/api/system/stats')
                .then(r => r.json())
                .then(stats => {
                    if (stats.cpu !== undefined && stats.memory !== undefined && overviewChartInstance) {
                        overviewChartInstance.data.datasets[0].data[0] = stats.cpu; // S26 CPU load
                        overviewChartInstance.data.datasets[0].data[3] = stats.memory; // memory load
                        overviewChartInstance.update('none');
                    }
                }).catch(() => {});

            // Fetch live cortex coordinates
            fetch('/api/cortex')
                .then(r => r.json())
                .then(data => {
                    // Update cortex node list in memory
                    knowledgeGraph = data;
                    if (activeTab === 'cortex') {
                        drawCortexEdges();
                    }
                }).catch(() => {});

            // Dynamic live updates based on active S26 tab
            if (activeTab === 'sniper') {
                fetchLiveScores();
            } else if (activeTab === 'processes') {
                refreshProcesses();
            } else if (activeTab === 'collab') {
                updateCollabData();
            } else if (activeTab === 'todo') {
                loadTodoData();
            }
        }

        // --- AGENT COLLABORATION & LIFE ENGINE FRONTEND ---
        let selectedCollabAgent = null;
        let collabEngineData = null;

        function initializeCollabTab() {
            console.log("Initializing Agent Collab tab...");
            updateCollabData(true);
        }

        function updateCollabData(forceRedraw = false) {
            fetch('/api/agents/collab')
                .then(r => r.json())
                .then(data => {
                    collabEngineData = data;
                    renderCollabLogs(data.logs);
                    
                    const nodesContainer = document.getElementById('collab-nodes-container');
                    if (nodesContainer) {
                        if (forceRedraw || nodesContainer.children.length === 0) {
                            drawCollabNetwork(data.agents);
                        } else {
                            updateCollabStatuses(data.agents);
                        }
                    }
                    
                    if (selectedCollabAgent) {
                        showCollabAgentDetails(selectedCollabAgent);
                    }
                })
                .catch(err => console.error("Error updating collab data:", err));
        }

        function drawCollabNetwork(agents) {
            const container = document.getElementById('collab-nodes-container');
            const svg = document.getElementById('collab-connections-svg');
            if (!container || !svg) return;
            
            container.innerHTML = '';
            svg.innerHTML = '';
            
            const width = container.clientWidth || 300;
            const height = container.clientHeight || 280;
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) * 0.38;
            
            const agentIds = Object.keys(agents);
            const numAgents = agentIds.length;
            const positions = {};
            
            // Calculate circular positions
            agentIds.forEach((id, idx) => {
                const angle = (idx * 2 * Math.PI) / numAgents - Math.PI / 2;
                positions[id] = {
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                };
            });
            
            // Draw connections between related agents (relations >= 75%)
            agentIds.forEach(sourceId => {
                const sourceAgent = agents[sourceId];
                const sourcePos = positions[sourceId];
                
                Object.keys(sourceAgent.relationship).forEach(targetId => {
                    const targetPos = positions[targetId];
                    const relValue = sourceAgent.relationship[targetId];
                    if (targetPos && relValue >= 75) {
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', sourcePos.x);
                        line.setAttribute('y1', sourcePos.y);
                        line.setAttribute('x2', targetPos.x);
                        line.setAttribute('y2', targetPos.y);
                        line.setAttribute('stroke', 'rgba(139, 92, 246, 0.2)');
                        line.setAttribute('stroke-width', (relValue - 70) / 8);
                        svg.appendChild(line);
                    }
                });
            });
            
            // Draw nodes
            agentIds.forEach(id => {
                const agent = agents[id];
                const pos = positions[id];
                
                const node = document.createElement('div');
                node.className = 'agent-node';
                node.id = `node-${id}`;
                node.style.position = 'absolute';
                node.style.left = `${pos.x - 20}px`;
                node.style.top = `${pos.y - 20}px`;
                node.style.width = '40px';
                node.style.height = '40px';
                node.style.borderRadius = '50%';
                node.style.background = '#09090b';
                node.style.border = `2px solid ${agent.color}`;
                node.style.display = 'flex';
                node.style.justifyContent = 'center';
                node.style.alignItems = 'center';
                node.style.cursor = 'pointer';
                node.style.zIndex = '10';
                node.style.transition = 'all 0.3s ease';
                node.title = agent.name;
                
                setGlowState(node, agent.status, agent.color);
                
                node.innerHTML = `<i class="fa-solid ${agent.avatar}" style="color:${agent.color}; font-size: 0.95rem;"></i>`;
                
                node.onclick = () => {
                    vibrateDevice([10]);
                    document.querySelectorAll('.agent-node').forEach(n => {
                        n.style.transform = 'scale(1)';
                        n.style.boxShadow = '';
                    });
                    node.style.transform = 'scale(1.25)';
                    node.style.boxShadow = `0 0 15px ${agent.color}`;
                    
                    selectedCollabAgent = id;
                    showCollabAgentDetails(id);
                };
                
                container.appendChild(node);
            });
        }

        function setGlowState(node, status, color) {
            if (status === 'working') {
                node.style.boxShadow = `0 0 12px ${color}, inset 0 0 4px ${color}`;
                node.style.animation = 'pulse-glow 1.5s infinite alternate';
            } else if (status === 'thinking') {
                node.style.boxShadow = `0 0 10px var(--color-primary)`;
                node.style.animation = 'pulse-glow 2s infinite alternate';
            } else if (status === 'collaborating') {
                node.style.boxShadow = `0 0 12px #f59e0b`;
                node.style.animation = 'pulse-glow 1.2s infinite alternate';
            } else if (status === 'sleeping') {
                node.style.boxShadow = `0 0 4px rgba(255,255,255,0.05)`;
                node.style.animation = '';
            } else {
                node.style.boxShadow = `0 0 6px ${color}`;
                node.style.animation = '';
            }
        }

        function updateCollabStatuses(agents) {
            Object.keys(agents).forEach(id => {
                const agent = agents[id];
                const node = document.getElementById(`node-${id}`);
                if (node) {
                    setGlowState(node, agent.status, agent.color);
                }
            });
        }

        function showCollabAgentDetails(id) {
            const panel = document.getElementById('collab-agent-details');
            if (!panel || !collabEngineData) return;
            
            const agent = collabEngineData.agents[id];
            if (!agent) return;
            
            panel.style.display = 'block';
            document.getElementById('collab-detail-name').textContent = agent.name;
            document.getElementById('collab-detail-specialty').textContent = agent.specialty;
            document.getElementById('collab-detail-task').textContent = agent.current_task;
            
            const statusBadge = document.getElementById('collab-detail-status');
            statusBadge.textContent = agent.status.toUpperCase();
            statusBadge.className = 'badge';
            if (agent.status === 'working') statusBadge.className = 'badge badge-status-glow error';
            else if (agent.status === 'thinking') statusBadge.className = 'badge badge-status-glow primary';
            else if (agent.status === 'collaborating') {
                statusBadge.className = 'badge';
                statusBadge.style.background = '#f59e0b';
                statusBadge.style.boxShadow = '0 0 8px rgba(245,158,11,0.4)';
            }
            else if (agent.status === 'sleeping') statusBadge.className = 'badge badge-status-glow muted';
            else statusBadge.className = 'badge badge-status-glow success';
            
            const relContainer = document.getElementById('collab-detail-relations');
            relContainer.innerHTML = '';
            
            Object.keys(agent.relationship).forEach(peerId => {
                const peer = collabEngineData.agents[peerId];
                if (peer) {
                    const value = agent.relationship[peerId];
                    const badge = document.createElement('span');
                    badge.style.fontSize = '0.65rem';
                    badge.style.padding = '3px 6px';
                    badge.style.borderRadius = '4px';
                    badge.style.background = 'rgba(255,255,255,0.03)';
                    badge.style.border = '1px solid rgba(255,255,255,0.06)';
                    badge.innerHTML = `${peer.name}: <strong style="color:var(--color-accent);">${value}%</strong>`;
                    relContainer.appendChild(badge);
                }
            });
        }

        function renderCollabLogs(logs) {
            const container = document.getElementById('collab-log-output');
            if (!container) return;
            
            container.innerHTML = '';
            logs.forEach(log => {
                const div = document.createElement('div');
                div.style.marginBottom = '6px';
                
                const timeStr = log.timestamp ? `[${log.timestamp.substring(11, 19)}]` : '';
                div.innerHTML = `<span style="color:var(--text-muted);">${timeStr}</span> ${log.message}`;
                
                if (log.message.includes('🚀')) {
                    div.style.color = 'var(--color-accent)';
                    div.style.fontWeight = '700';
                } else if (log.message.includes('✅')) {
                    div.style.color = 'var(--color-success)';
                    div.style.fontWeight = '700';
                }
                
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        }

        function sendCollabTask() {
            const input = document.getElementById('collab-task-input');
            const task = input.value.trim();
            if (!task) return;
            
            vibrateDevice([15]);
            input.value = '';
            
            fetch('/api/agents/collab/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task: task })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    updateCollabData();
                }
            })
            .catch(err => console.error("Error sending collab task:", err));
        }

        // --- SYSTEM ROADMAP & TO-DO FRONTEND ---
        function initializeTodoTab() {
            console.log("Initializing To-Do tab...");
            loadTodoData();
        }

        function loadTodoData() {
            fetch('/api/todo')
                .then(r => r.json())
                .then(todos => {
                    const listContainer = document.getElementById('todo-pending-list');
                    if (!listContainer) return;
                    
                    listContainer.innerHTML = '';
                    todos.forEach(todo => {
                        const card = document.createElement('div');
                        
                        const isCompleted = todo.status === 'completed';
                        card.style.background = isCompleted ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255,255,255,0.02)';
                        card.style.border = isCompleted ? '1px solid rgba(16, 185, 129, 0.22)' : '1px solid rgba(255,255,255,0.06)';
                        card.style.borderRadius = '14px';
                        card.style.padding = '12px';
                        card.style.display = 'flex';
                        card.style.flexDirection = 'column';
                        card.style.gap = '6px';
                        card.style.opacity = isCompleted ? '0.85' : '1';
                        
                        let badgeColor = 'var(--text-muted)';
                        if (todo.priority === 'High') badgeColor = 'var(--color-danger)';
                        else if (todo.priority === 'Medium') badgeColor = 'var(--color-warning)';
                        
                        let statusHtml = `<span style="color:var(--color-warning);"><i class="fa-solid fa-hourglass-half"></i> Pending</span>`;
                        if (todo.status === 'completed') {
                            statusHtml = `<span style="color:var(--color-success); font-weight:800;"><i class="fa-solid fa-circle-check"></i> Completed</span>`;
                        } else if (todo.status === 'in_progress' || todo.status === 'working') {
                            statusHtml = `<span style="color:var(--color-accent); font-weight:800;"><i class="fa-solid fa-gear fa-spin"></i> Working</span>`;
                        }
                        
                        card.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong style="font-size:0.85rem; color:${isCompleted ? '#a7f3d0' : '#fff'};">${todo.title}</strong>
                                <span style="font-size:0.6rem; font-weight:800; padding:2px 6px; border-radius:4px; border:1px solid ${isCompleted ? 'rgba(16,185,129,0.3)' : badgeColor}; color:${isCompleted ? 'var(--color-success)' : badgeColor}; background:rgba(255,255,255,0.02);">${todo.priority}</span>
                            </div>
                            <p style="font-size:0.75rem; color:${isCompleted ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)'}; line-height:1.3;">${todo.desc}</p>
                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.65rem; color:var(--text-muted); margin-top:4px;">
                                <span>Categorie: <strong style="color:var(--color-accent);">${todo.category}</strong></span>
                                ${statusHtml}
                            </div>
                        `;
                        
                        listContainer.appendChild(card);
                    });
                })
                .catch(err => console.error("Error loading todos:", err));
        }

        function addCustomTodo() {
            const titleInput = document.getElementById('todo-title');
            const descInput = document.getElementById('todo-desc');
            const prioritySelect = document.getElementById('todo-priority');
            const catInput = document.getElementById('todo-category');
            
            const title = titleInput.value.trim();
            const desc = descInput.value.trim();
            const priority = prioritySelect.value;
            const category = catInput.value.trim() || 'Custom';
            
            if (!title) {
                alert("Vul tenminste een titel in.");
                return;
            }
            
            vibrateDevice([15]);
            
            fetch('/api/todo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title,
                    desc: desc,
                    priority: priority,
                    category: category
                })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    titleInput.value = '';
                    descInput.value = '';
                    loadTodoData();
                }
            })
            .catch(err => console.error("Error adding todo:", err));
        }

        function dispatchManusUiTask() {
            const promptInput = document.getElementById('manus-prompt');
            const logBox = document.getElementById('manus-log-box');
            const logOutput = document.getElementById('manus-log-output');
            
            const prompt = promptInput ? promptInput.value.trim() : '';
            if (!prompt) {
                alert("Voer een prompt in voor Manus AI.");
                return;
            }
            
            if (logBox) logBox.style.display = 'block';
            if (logOutput) logOutput.innerHTML = '<span style="color:#eab308;">[*] Bezig met verzenden naar Manus AI API...</span>';
            
            vibrateDevice([15]);
            sfx.playClick();
            
            fetch('/api/manus/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt, taskMode: 'agent' })
            })
            .then(r => r.json())
            .then(res => {
                if (res.success && res.data) {
                    sfx.playSuccess();
                    logOutput.innerHTML = `
                        <div style="color:var(--color-success); font-weight:bold;">[✓] Manus Task Succesvol Geïnitieerd!</div>
                        <div>Task ID: <strong>${res.data.task_id}</strong></div>
                        <div>Titel: ${res.data.task_title}</div>
                        <div>URL: <a href="${res.data.task_url}" target="_blank" style="color:var(--color-accent); text-decoration:underline;">Bekijk Live op Manus Platform</a></div>
                    `;
                } else {
                    logOutput.innerHTML = `<span style="color:var(--color-danger);">[✗] Fout: ${res.error || 'Onbekende API fout'}</span>`;
                }
            })
            .catch(err => {
                logOutput.innerHTML = `<span style="color:var(--color-danger);">[✗] Netwerkfout: ${err.message}</span>`;
            });
        }

        // --- AI AGENCY & UNIVERSAL AUTO-RESEARCH HANDLERS ---
        function loadAiAgencyData() {
            fetch('/api/agency/workers')
            .then(r => r.json())
            .then(res => {
                const mrrEl = document.getElementById('agency-mrr-val');
                const listEl = document.getElementById('agency-workers-list');
                if (mrrEl) mrrEl.textContent = `$${(res.total_mrr || 0).toLocaleString('en-US', {minimumFractionDigits:2})}`;
                if (listEl) {
                    if (!res.workers || res.workers.length === 0) {
                        listEl.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:10px;">Geen actieve AI medewerkers. Klik op Clone Worker.</div>';
                    } else {
                        listEl.innerHTML = res.workers.map(w => `
                            <div style="display:flex; flex-direction:column; align-items:center; width:30%;">
                                <div style="width:2px; height:15px; background:rgba(139, 92, 246, 0.5);"></div>
                                <div style="width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.05); border:1px solid rgba(139, 92, 246, 0.4); display:flex; justify-content:center; align-items:center; box-shadow:0 0 10px rgba(139, 92, 246, 0.1);">
                                    <i class="fa-solid fa-robot" style="color:var(--text-muted); font-size:0.9rem;"></i>
                                </div>
                                <div style="font-size:0.7rem; font-weight:800; color:#fff; margin-top:6px; text-align:center;">${w.worker_name}</div>
                                <div style="font-size:0.55rem; color:var(--text-muted); text-align:center;">ID: ${w.worker_id.substring(0,4)}...</div>
                                <div style="font-size:0.6rem; color:var(--color-success); margin-top:2px; font-weight:700;">$${w.monthly_rate_usd}/mo</div>
                            </div>
                        `).join('');
                    }
                }
            })
            .catch(err => console.error("Error loading agency workers:", err));
        }

        function cloneAiWorkerPrompt() {
            const client = prompt("Voer klantnaam in (bijv. 'Acme Corp B.V.'):", "New Client B.V.");
            if (!client) return;
            const template = prompt("Kies type AI worker:\n1. support_agent (Support)\n2. sales_agent (SDR)\n3. ops_agent (Ops)", "support_agent");
            if (!template) return;

            sfx.playClick();
            fetch('/api/agency/clone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_name: client, template_key: template })
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    sfx.playSuccess();
                    alert(`AI Worker '${res.worker.worker_name}' succesvol gekloond! ($${res.worker.monthly_rate_usd}/mnd)`);
                    loadAiAgencyData();
                } else {
                    alert("Fout bij klonen: " + res.error);
                }
            })
            .catch(err => alert("Netwerkfout: " + err.message));
        }

        function triggerUniversalResearchRun() {
            const iters = parseInt(document.getElementById('research-iters-input').value) || 15;
            sfx.playClick();
            fetch('/api/research/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ iterations: iters })
            })
            .then(r => r.json())
            .then(res => {
                sfx.playSuccess();
                alert(`Universal Auto-Research gestart met ${iters} iteraties per domein op de achtergrond!`);
                setTimeout(loadResearchReport, 2000);
            })
            .catch(err => alert("Fout: " + err.message));
        }

        function loadResearchReport() {
            fetch('/api/research/report')
            .then(r => r.json())
            .then(res => {
                const bodyEl = document.getElementById('research-report-body');
                if (!bodyEl) return;
                if (res.domains) {
                    bodyEl.innerHTML = `
                        <div style="margin-bottom:4px;">🕒 Timestamp: ${res.timestamp || 'Live'} | Ver: ${res.version}</div>
                        <div style="color:var(--color-success);">• Mobility Fitness: ${res.domains.mobility?.best_fitness?.toFixed(4) || 'N/A'} (${res.domains.mobility?.best_hits?.toFixed(1) || 0} hits)</div>
                        <div style="color:var(--color-accent);">• Solana Quant Loss: ${res.domains.quant_trading?.best_loss_score?.toFixed(2) || 'N/A'}</div>
                        <div style="color:#a78bfa;">• AI Agency Status: ${res.domains.ai_agency?.status?.toUpperCase() || 'OK'} (${res.domains.ai_agency?.tests_passed || 5}/5 Tests)</div>
                    `;
                } else {
                    bodyEl.textContent = "Geen recent rapport gevonden.";
                }
            })
            .catch(err => console.error("Error loading research report:", err));
        }