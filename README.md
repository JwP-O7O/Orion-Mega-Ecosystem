# 🌌 Orion Mega-Ecosystem

> **Unified Autonomous AI, Quant Trading & Document Intelligence Engine**

---

## 🏛️ Master Architecture

The **Orion Mega-Ecosystem** consolidates multiple autonomous repositories into a single unified monorepo architecture:

```
Orion-Mega-Ecosystem/
├── apps/
│   ├── trading_quant/    # Solana Quant Trading Engine & OrionX Harvester
│   ├── content_agents/   # Autonomous Code Monitors & Content Creation Pipeline
│   ├── docu_gen/         # Document Generation & Blockchain Verification Service
│   └── orion_brain/      # Intelligence Router & Model Controller
├── core/
│   ├── orchestrator/     # Central Master Orchestrator (main_orchestrator.py)
│   ├── llm/              # Gemini Interactions API & Vertex AI Integration
│   └── security/         # API Key & Vault Management
├── deploy/
│   ├── vps/              # Hostinger VPS Docker Compose & Deployment Setup
│   └── gcp/              # Google Cloud Platform (jwp-orionx) Manifests
├── scripts/              # Master Scripts & Tools
├── tests/                # Automated Test Suite
└── docs/                 # Ecosystem Documentation
```

---

## 🚀 Key Features

1. **Quant & Solana Trading Subsystem**:
   - Automated memecoin strategy execution, alpha discovery, risk management, and market edge harvesting.
2. **Autonomous Improvement & Content Agents**:
   - Continuous code health monitoring, dependency scanning, security auditing, and automated content generation pipelines.
3. **DocuGen & Blockchain Verification**:
   - Automated PDF document synthesis validated on-chain via custom blockchain microservices.
4. **Orion Brain & LLM Router**:
   - Powered by Google Gemini Interactions API (`gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-pro-preview`) and GCP Vertex AI (`jwp-orionx`).
5. **Hybrid Cloud Execution**:
   - Production workers running 24/7 on **Hostinger VPS (`2.24.0.36`)** managed via Docker Compose, Traefik, and Ollama.

---

## ⚡ Quickstart

### Diagnostics & Status Check
Run the master orchestrator to verify all subsystems:

```bash
python scripts/start_mega_ecosystem.py
```

### Direct Subsystem Run
```bash
python core/orchestrator/main_orchestrator.py
```

---

## 🔒 Security & Credentials
- All API keys and environment variables are managed via local `.env` files and `core/security/`.
- Secret files and node modules are strictly ignored in `.gitignore`.

---

## 📜 License
Internal & Proprietary - Developed for JwP-O7O / Orion Empire.
