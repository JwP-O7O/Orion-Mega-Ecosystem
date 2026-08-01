"""
Orion Mega-Ecosystem Root Starter Script
Executes system health check, launches sub-orchestrators, and monitors live execution.
"""

import sys
import os

# Add core to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.orchestrator.main_orchestrator import OrionMegaOrchestrator
from core.llm.gemini_client import OrionGeminiClient

def main():
    print("============================================================")
    print("   Starting Orion Mega-Ecosystem Master Control System      ")
    print("============================================================")
    
    orchestrator = OrionMegaOrchestrator()
    report = orchestrator.print_status_report()
    
    if report["overall_status"] == "OPERATIONAL":
        print("\nAll 4 Subsystems are OPERATIONAL and READY!")
        print("Initializing Gemini LLM Client...")
        client = OrionGeminiClient()
        print("Master Control System initialized successfully.")
    else:
        print("\n[WARNING] Some subsystems require attention. Check logs for details.")

if __name__ == "__main__":
    main()
