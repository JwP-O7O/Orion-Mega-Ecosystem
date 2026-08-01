import os
import json
import logging
from datetime import datetime
from pathlib import Path
import httpx
from dotenv import load_dotenv

# Laad de environment variables (zoek eerst in de map zelf, dan in home)
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
if not ENV_FILE.exists():
    ENV_FILE = Path.home() / ".env"
    
if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)

logger = logging.getLogger("SupabaseClient")

# Supabase configuratie uit .env
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
# Gebruik bij voorkeur de secret key (service_role) voor server-side operaties om RLS te omzeilen
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_KEY", "")

# Controleer of Supabase daadwerkelijk is geconfigureerd
IS_CONFIGURED = (
    SUPABASE_URL 
    and SUPABASE_KEY 
    and "YOUR_PROJECT_ID" not in SUPABASE_URL 
    and "YOUR_ANON_KEY" not in SUPABASE_KEY
)

class SupabaseClient:
    def __init__(self):
        self.url = SUPABASE_URL
        self.key = SUPABASE_KEY
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        } if IS_CONFIGURED else {}
        
        if not IS_CONFIGURED:
            logger.warning("[!] Supabase is niet (volledig) geconfigureerd in ~/.env. Fallback naar lokaal bestandssysteem is actief.")

    def _post(self, table: str, data: dict) -> dict:
        """Helper om een POST request te doen naar Supabase REST API."""
        if not IS_CONFIGURED:
            return {"error": "Supabase not configured"}
        
        endpoint = f"{self.url}/rest/v1/{table}"
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.post(endpoint, json=data, headers=self.headers)
                if r.status_code in [200, 201]:
                    return {"success": True, "data": r.json()}
                else:
                    logger.error(f"Supabase error ({r.status_code}): {r.text}")
                    return {"success": False, "error": r.text}
        except Exception as e:
            logger.error(f"Fout bij verbinden met Supabase: {e}")
            return {"success": False, "error": str(e)}

    def _get(self, table: str, params: dict = None) -> dict:
        """Helper om een GET request te doen naar Supabase REST API."""
        if not IS_CONFIGURED:
            return {"error": "Supabase not configured"}
        
        endpoint = f"{self.url}/rest/v1/{table}"
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.get(endpoint, params=params, headers=self.headers)
                if r.status_code == 200:
                    return {"success": True, "data": r.json()}
                else:
                    logger.error(f"Supabase error ({r.status_code}): {r.text}")
                    return {"success": False, "error": r.text}
        except Exception as e:
            logger.error(f"Fout bij verbinden met Supabase: {e}")
            return {"success": False, "error": str(e)}

    # --- EVENT LOGGING (Vervangt SSH Sync) ---
    def log_event(self, event_type: str, data: str, source: str = "Termux") -> bool:
        """Logt een event naar Supabase, of valt terug naar lokaal bestand."""
        timestamp = datetime.now().isoformat()
        event_obj = {
            "timestamp": timestamp,
            "type": event_type,
            "data": data,
            "source": source
        }

        # Altijd lokaal opslaan in events.json als backup/historie
        local_log = Path.home() / ".omni" / "events.json"
        try:
            events = []
            if local_log.exists():
                with open(local_log, "r") as f:
                    try:
                        events = json.load(f)
                    except json.JSONDecodeError:
                        events = []
            events.append(event_obj)
            # Houd het bestand compact (max 500 events)
            events = events[-500:]
            with open(local_log, "w") as f:
                json.dump(events, f, indent=2)
        except Exception as e:
            logger.error(f"Fout bij lokaal opslaan event: {e}")

        # Probeer te loggen naar Supabase
        if IS_CONFIGURED:
            res = self._post("events", event_obj)
            return res.get("success", False)
        
        return True

    # --- SOLANA BOT POSITIES ---
    def save_position(self, token_address: str, buy_price: float, size_sol: float, status: str = "open") -> bool:
        """Slaat een Solana positie op in Supabase."""
        if not IS_CONFIGURED:
            # Lokale fallback: alpha_wallets.json of posities bestand
            return False
        
        pos_data = {
            "token_address": token_address,
            "buy_price": buy_price,
            "size_sol": size_sol,
            "status": status,
            "updated_at": datetime.now().isoformat()
        }
        
        # Gebruik upsert gedrag via PostgREST headers of POST met 'on_conflict' query param
        endpoint = f"{self.url}/rest/v1/positions"
        headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.post(endpoint, json=pos_data, headers=headers)
                return r.status_code in [200, 201]
        except Exception as e:
            logger.error(f"Fout bij opslaan positie in Supabase: {e}")
            return False

    def get_active_positions(self) -> list:
        """Haalt alle open posities op uit Supabase."""
        if not IS_CONFIGURED:
            return []
        
        res = self._get("positions", params={"status": "eq.open"})
        if res.get("success"):
            return res["data"]
        return []

    # --- QUANTUM SNIPER VOORSPELLINGEN ---
    def save_prediction(self, match_name: str, prediction_data: dict, actual_result: str = None) -> bool:
        """Slaat een Quantum Sniper voorspelling op in Supabase."""
        if not IS_CONFIGURED:
            # Lokale fallback in predictions_log.json
            log_path = Path.home() / ".hermes" / "skills" / "bets" / "scripts" / "predictions_log.json"
            try:
                logs = []
                if log_path.exists():
                    with open(log_path, "r") as f:
                        try:
                            logs = json.load(f)
                        except json.JSONDecodeError:
                            logs = []
                logs.append({
                    "timestamp": datetime.now().isoformat(),
                    "match_name": match_name,
                    "prediction": prediction_data,
                    "actual_result": actual_result
                })
                with open(log_path, "w") as f:
                    json.dump(logs, f, indent=2)
                return True
            except Exception as e:
                logger.error(f"Fout bij lokaal opslaan van prediction: {e}")
                return False

        pred_obj = {
            "match_name": match_name,
            "prediction_data": prediction_data,
            "actual_result": actual_result,
            "created_at": datetime.now().isoformat()
        }
        res = self._post("predictions", pred_obj)
        return res.get("success", False)
