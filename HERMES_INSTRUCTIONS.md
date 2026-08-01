# 🤖 Hermes Agent Tool & Skill Matrix for Orion Mega-Ecosystem

Welcome Hermes Agent. This document defines your **Skills, Required Tooling, and Execution Patterns** for the **Orion Mega-Ecosystem**.

---

## 🛠️ Required Tooling & Skill Mapping

Hermes Agent MUST utilize the following tools and skills depending on the active subsystem:

| Subsystem | Required Skills / Core Logic | Primary Execution Tools / Commands | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Trading & Quant** | Solana Quant, Alpha Hunting, Edge Harvesting, Risk Management | `python3 apps/trading_quant/solana_quant_bot/main.py`<br>`python3 apps/trading_quant/empire_manager.py` | Live trading monitoring, signal generation, backtesting. |
| **Content & Autonomous Agents** | Code Health Audit, Security Scanning, Dependency Auditing | `python3 apps/content_agents/run_autonomous.py`<br>`python3 apps/content_agents/run_monitoring.py` | Automated bugfixes, security audit reports, content pipeline execution. |
| **DocuGen & Blockchain** | PDF Generation, On-Chain Proof Hash, Smart Contract Registry | `python3 apps/docu_gen/pdf_generator.py`<br>`python3 apps/docu_gen/blockchain_service.py` | PDF document generation, Ethereum/EVMSolidity contract hash verification. |
| **Orion Brain & LLM Router** | Model Routing, Gemini Interactions API, Ollama Local Fallback | `node apps/orion_brain/orion_router.js`<br>`python3 core/llm/gemini_client.py` | Multi-model routing (Gemini 3.6 Flash / Ollama local models). |
| **Infrastructure & VPS** | Docker Containerization, Traefik Proxy, Service Health | `docker compose -f deploy/vps/docker-compose.yml up -d`<br>`python3 core/orchestrator/main_orchestrator.py` | Full containerized execution, reverse proxy routing, status monitoring. |

---

## ⚡ Master Workflow for Hermes

1. **Environment Setup & Verification**:
   ```bash
   git clone https://github.com/JwP-O7O/Orion-Mega-Ecosystem.git
   cd Orion-Mega-Ecosystem
   export GEMINI_API_KEY="${GEMINI_API_KEY}"
   ```

2. **Run Comprehensive Subsystem Health Check**:
   ```bash
   python3 scripts/start_mega_ecosystem.py
   ```

3. **Autonomous Task Execution**:
   - For **Code Audits & Improvements**: Invoke the `Content` autonomous monitors.
   - For **Trading Strategy Execution**: Check `solana_quant_bot` and edge harvester logs.
   - For **Docker Deployment**: Run Docker Compose under `deploy/vps/`.

---
*Orion Mega-Ecosystem Tool & Skill Matrix - Fully Verified for Hermes Agent.*
