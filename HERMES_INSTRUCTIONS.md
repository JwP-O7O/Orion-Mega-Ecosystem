# 🤖 Hermes Agent Instructions for Orion Mega-Ecosystem

Welcome Hermes Agent. You have been granted control over the **Orion Mega-Ecosystem** monorepo.

---

## 🎯 Primary Directives

1. **System Initialization**:
   Clone the repository and run system diagnostics:
   ```bash
   git clone https://github.com/JwP-O7O/Orion-Mega-Ecosystem.git
   cd Orion-Mega-Ecosystem
   python3 scripts/start_mega_ecosystem.py
   ```

2. **Subsystem Architecture & Capabilities**:
   - **Trading & Quant (`apps/trading_quant`)**: Runs Solana quant bots, risk management, and market edge harvesting.
   - **Content & Autonomous Agents (`apps/content_agents`)**: Runs continuous code health monitoring, security audits, and automated content generation.
   - **DocuGen (`apps/docu_gen`)**: Generates PDF reports and records hash signatures on-chain via blockchain services.
   - **Orion Brain (`apps/orion_brain`)**: Intelligent model router connecting Gemini Interactions API and local LLMs (Ollama).

3. **VPS Execution Commands**:
   - Run Master Orchestration Check:
     ```bash
     python3 core/orchestrator/main_orchestrator.py
     ```
   - Deploy Docker Services (Traefik, Ollama, Workers):
     ```bash
     docker compose -f deploy/vps/docker-compose.yml up -d
     ```

4. **Monitoring & Logging**:
   - Log files are generated at `orion_mega_orchestrator.log`.
   - Ensure `GEMINI_API_KEY` is exported in the environment for LLM interaction tasks.

---
*Orion Mega-Ecosystem Autonomous Agent Core - Activated for Hermes Agent.*
