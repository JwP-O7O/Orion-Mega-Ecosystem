import json
import logging
from pathlib import Path
import httpx
import asyncio
from datetime import datetime, timezone

logger = logging.getLogger('QuantBot_S26.AlphaHunter')

ALPHA_WALLETS_FILE = Path(__file__).parent.parent / "data" / "alpha_wallets.json"

DEFAULT_RPC_ENDPOINTS = [
    "https://api.mainnet-beta.solana.com",
]

MAX_RETRIES = 3
INITIAL_BACKOFF_SEC = 1.0
REQUEST_TIMEOUT_SEC = 30.0


class AlphaHunter:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SEC)
        self._rpc_index = 0
        self._rpc_endpoints = self._load_rpc_endpoints()

    def _load_rpc_endpoints(self):
        try:
            from config import SOLANA_RPC_URLS
            endpoints = SOLANA_RPC_URLS if isinstance(SOLANA_RPC_URLS, list) and SOLANA_RPC_URLS else []
        except (ImportError, AttributeError):
            endpoints = []
        return endpoints or DEFAULT_RPC_ENDPOINTS

    @property
    def rpc_url(self):
        return self._rpc_endpoints[self._rpc_index % len(self._rpc_endpoints)]

    def _rotate_rpc(self):
        self._rpc_index = (self._rpc_index + 1) % len(self._rpc_endpoints)
        logger.info(f"RPC geroteerd naar: {self.rpc_url}")

    async def _rpc_post(self, payload):
        for attempt in range(MAX_RETRIES):
            try:
                response = await self.client.post(self.rpc_url, json=payload)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                backoff = INITIAL_BACKOFF_SEC * (2 ** attempt)
                logger.warning(f"RPC poging {attempt + 1}/{MAX_RETRIES} gefaald: {e}. Wacht {backoff:.1f}s")
                self._rotate_rpc()
                await asyncio.sleep(backoff)
        raise RuntimeError(f"RPC verzoek gefaald na {MAX_RETRIES} pogingen")

    async def fetch_recent_transactions(self, wallet_address: str, limit: int = 10) -> list:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getSignaturesForAddress",
            "params": [wallet_address, {"limit": limit}]
        }
        result = await self._rpc_post(payload)
        return result.get("result", [])

    async def parse_swap_transactions(self, signatures: list) -> list:
        token_mints = []
        for sig_info in signatures:
            sig = sig_info.get("signature") if isinstance(sig_info, dict) else sig_info
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getTransaction",
                "params": [sig, "jsonParsed"]
            }
            try:
                result = await self._rpc_post(payload)
                mint = self._extract_token_mint(result)
                if mint and mint not in token_mints:
                    token_mints.append(mint)
            except Exception as e:
                logger.error(f"Fout bij parsen tx {sig[:8]}...: {e}")
        return token_mints

    def _extract_token_mint(self, tx_data: dict) -> str | None:
        try:
            meta = tx_data["result"]["meta"]
            inner = meta.get("innerInstructions", [])
            for instruction_group in inner:
                for inner_ix in instruction_group.get("instructions", []):
                    parsed = inner_ix.get("parsed", {})
                    if parsed.get("type") == "transfer" and inner_ix.get("program") == "spl-token":
                        info = parsed.get("info", {})
                        if "tokenAmount" in info:
                            return info.get("mint")
            return None
        except (KeyError, TypeError):
            return None

    async def discover_tokens_for_wallet(self, wallet_address: str, tx_limit: int = 10) -> list:
        if "..." in wallet_address or len(wallet_address) < 32 or len(wallet_address) > 44:
            import random
            mock_tokens = [f"MOCK_TOKEN_{random.randint(100, 999)}" for _ in range(random.randint(1, 3))]
            logger.info(f"[SIMULATION] Mock tokens ontdekt voor wallet {wallet_address[:8]}: {mock_tokens}")
            return mock_tokens

        signatures = await self.fetch_recent_transactions(wallet_address, limit=tx_limit)
        if not signatures:
            logger.info(f"Geen transacties gevonden voor {wallet_address[:8]}...")
            return []
        token_mints = await self.parse_swap_transactions(signatures)
        return token_mints

    async def run(self):
        try:
            with open(ALPHA_WALLETS_FILE) as f:
                data = json.load(f)
            wallets = data.get('wallets', [])
        except Exception as e:
            logger.error(f"Fout bij laden alpha wallets: {e}")
            return []

        all_tokens = []
        sem = asyncio.Semaphore(3)
        for wallet in wallets:
            async with sem:
                tokens = await self.discover_tokens_for_wallet(wallet["address"])
                all_tokens.extend(tokens)
                logger.info(f"Wallet {wallet['label']}: {len(tokens)} tokens ontdekt")
        return list(dict.fromkeys(all_tokens))


if __name__ == "__main__":
    asyncio.run(AlphaHunter().run())
