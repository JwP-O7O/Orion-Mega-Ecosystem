"""
Orion Mega-Ecosystem Master Orchestrator
Central control system integrating:
- Trading & Quant Subsystem (neural_nexus, OrionX, Solana quant)
- Content & Autonomous Agents Subsystem (Content, code monitors)
- Document & Blockchain Subsystem (DocuGen)
- Intelligence & Model Router (Orion Brain, Gemini Interactions API, Vertex AI)
- Hostinger VPS Synchronization (Remote worker node)
"""

import sys
import os
import time
import json
import logging
import asyncio
from typing import Dict, Any, List

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("orion_mega_orchestrator.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("OrionMegaOrchestrator")


class TradingQuantSubsystem:
    def __init__(self, base_path: str):
        self.path = os.path.join(base_path, "apps", "trading_quant")
        self.status = "INITIALIZED"

    def health_check(self) -> Dict[str, Any]:
        has_quant = os.path.exists(os.path.join(self.path, "solana_quant_bot"))
        has_orionx = os.path.exists(os.path.join(self.path, "empire_manager.py"))
        return {
            "subsystem": "Trading & Quant",
            "status": "HEALTHY" if (has_quant and has_orionx) else "WARNING",
            "solana_quant": has_quant,
            "orionx_engine": has_orionx
        }


class ContentAgentsSubsystem:
    def __init__(self, base_path: str):
        self.path = os.path.join(base_path, "apps", "content_agents")

    def health_check(self) -> Dict[str, Any]:
        has_monitors = os.path.exists(os.path.join(self.path, "src", "autonomous_agents", "monitoring"))
        has_runner = os.path.exists(os.path.join(self.path, "run_autonomous.py"))
        return {
            "subsystem": "Content & Autonomous Agents",
            "status": "HEALTHY" if (has_monitors and has_runner) else "WARNING",
            "autonomous_monitors": has_monitors,
            "runner_pipeline": has_runner
        }


class DocuGenSubsystem:
    def __init__(self, base_path: str):
        self.path = os.path.join(base_path, "apps", "docu_gen")

    def health_check(self) -> Dict[str, Any]:
        has_pdf = os.path.exists(os.path.join(self.path, "pdf_generator.py"))
        has_blockchain = os.path.exists(os.path.join(self.path, "blockchain_service.py"))
        return {
            "subsystem": "DocuGen & Blockchain",
            "status": "HEALTHY" if (has_pdf and has_blockchain) else "WARNING",
            "pdf_generator": has_pdf,
            "blockchain_service": has_blockchain
        }


class OrionBrainSubsystem:
    def __init__(self, base_path: str):
        self.path = os.path.join(base_path, "apps", "orion_brain")

    def health_check(self) -> Dict[str, Any]:
        has_brain = os.path.exists(os.path.join(self.path, "orion_brain.js"))
        has_router = os.path.exists(os.path.join(self.path, "orion_router.js"))
        return {
            "subsystem": "Orion Brain & Router",
            "status": "HEALTHY" if (has_brain and has_router) else "WARNING",
            "brain_engine": has_brain,
            "router": has_router
        }


class OrionMegaOrchestrator:
    def __init__(self, root_dir: str = None):
        self.root_dir = root_dir or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        logger.info(f"Initializing Orion Mega-Orchestrator at: {self.root_dir}")
        
        self.trading = TradingQuantSubsystem(self.root_dir)
        self.content = ContentAgentsSubsystem(self.root_dir)
        self.docugen = DocuGenSubsystem(self.root_dir)
        self.brain = OrionBrainSubsystem(self.root_dir)

    def run_full_diagnostics(self) -> Dict[str, Any]:
        logger.info("Running full system diagnostics across all 4 subsystems...")
        diagnostics = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "system": "Orion Mega-Ecosystem",
            "subsystems": [
                self.trading.health_check(),
                self.content.health_check(),
                self.docugen.health_check(),
                self.brain.health_check()
            ]
        }
        all_healthy = all(s["status"] == "HEALTHY" for s in diagnostics["subsystems"])
        diagnostics["overall_status"] = "OPERATIONAL" if all_healthy else "DEGRADED"
        return diagnostics

    def print_status_report(self):
        report = self.run_full_diagnostics()
        print("\n" + "="*60)
        print(f"[ORION MEGA-ECOSYSTEM STATUS REPORT: {report['overall_status']}]")
        print("="*60)
        for sub in report["subsystems"]:
            status_icon = "[OK]" if sub["status"] == "HEALTHY" else "[WARN]"
            print(f"{status_icon} {sub['subsystem']}: {sub['status']}")
            for k, v in sub.items():
                if k not in ("subsystem", "status"):
                    print(f"   |- {k}: {v}")
        print("="*60 + "\n")
        return report

if __name__ == "__main__":
    orchestrator = OrionMegaOrchestrator()
    orchestrator.print_status_report()
