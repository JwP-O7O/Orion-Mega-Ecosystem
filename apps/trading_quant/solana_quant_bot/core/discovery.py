import json
import logging
from pathlib import Path
from datetime import datetime, timezone

logger = logging.getLogger('QuantBot_S26.Discovery')

ALPHA_WALLETS_FILE = Path(__file__).parent.parent / "data" / "alpha_wallets.json"

SPECIALTY_PRIORITY = {
    "insider_alpha": 1.5,
    "memecoin_early": 1.3,
    "low_mcap_sniper": 1.1,
    "ultra_micro": 1.0,
    "curated_picks": 1.2,
}

RECENCY_DECAY_HOURS = 48
RPC_MAX_CONCURRENT = 3


class AlphaWallet:
    def __init__(self, address, label, pnl_30d, win_rate, avg_entry_mcap, tokens_bought_7d, specialty, last_active):
        self.address = address
        self.label = label
        self.pnl_30d = pnl_30d
        self.win_rate = win_rate
        self.avg_entry_mcap = avg_entry_mcap
        self.tokens_bought_7d = tokens_bought_7d
        self.specialty = specialty
        self.last_active = last_active

    @property
    def alpha_score(self):
        base_score = self.pnl_30d * self.win_rate

        specialty_mult = SPECIALTY_PRIORITY.get(self.specialty, 1.0)

        try:
            last = datetime.fromisoformat(self.last_active.replace("Z", "+00:00"))
            hours_inactive = (datetime.now(timezone.utc) - last).total_seconds() / 3600
        except (ValueError, AttributeError):
            hours_inactive = RECENCY_DECAY_HOURS

        if hours_inactive > RECENCY_DECAY_HOURS:
            recency_mult = 0.0
        elif hours_inactive <= 0:
            recency_mult = 1.0
        else:
            recency_mult = 1.0 - (hours_inactive / RECENCY_DECAY_HOURS) * 0.8

        activity_mult = min(self.tokens_bought_7d / 20.0, 2.0)

        return base_score * specialty_mult * recency_mult * activity_mult

    @property
    def is_active(self):
        try:
            last = datetime.fromisoformat(self.last_active.replace("Z", "+00:00"))
            hours_inactive = (datetime.now(timezone.utc) - last).total_seconds() / 3600
        except (ValueError, AttributeError):
            return False
        return hours_inactive <= RECENCY_DECAY_HOURS


class AlphaDiscovery:
    def __init__(self):
        self.wallets = self._load_wallets()
        self._hunter = None

    def _load_wallets(self):
        try:
            with open(ALPHA_WALLETS_FILE, 'r') as f:
                data = json.load(f)
            
            wallets = []
            if isinstance(data, list):
                for w in data:
                    if not isinstance(w, str):
                        continue
                    if "(" in w:
                        address, comment = w.split("(", 1)
                        address = address.strip()
                        label = comment.replace(")", "").strip()
                    else:
                        address = w.strip()
                        label = w.strip()
                    
                    wallets.append(AlphaWallet(
                        address=address,
                        label=label,
                        pnl_30d=1.0,
                        win_rate=0.70,
                        avg_entry_mcap=100000.0,
                        tokens_bought_7d=10,
                        specialty="insider_alpha",
                        last_active=datetime.now(timezone.utc).isoformat()
                    ))
            elif isinstance(data, dict):
                wallet_list = data.get('wallets', [])
                for w in wallet_list:
                    wallets.append(AlphaWallet(**w))
            return wallets
        except Exception as e:
            logger.error(f"Kan alpha wallets niet laden: {e}")
            return []

    async def scan_alpha_wallets(self):
        active_wallets = [w for w in self.wallets if w.is_active]
        scored = sorted(active_wallets, key=lambda w: w.alpha_score, reverse=True)
        logger.info(f"Alpha scan - {len(self.wallets)} geladen, {len(active_wallets)} actief")
        for w in scored:
            logger.info(f"  {w.label}: score={w.alpha_score:.0f}, specialty={w.specialty}")
        return scored

    async def refresh_wallets(self):
        self.wallets = self._load_wallets()
        logger.info("Alpha wallets herladen")

    @property
    def hunter(self):
        if self._hunter is None:
            from core.alpha_hunter import AlphaHunter
            self._hunter = AlphaHunter()
        return self._hunter

    async def discover_new_tokens(self):
        scored_wallets = await self.scan_alpha_wallets()
        all_tokens = []
        for w in scored_wallets:
            try:
                tokens = await self.hunter.discover_tokens_for_wallet(w.address)
                all_tokens.extend(tokens)
                logger.info(f"{w.label}: {len(tokens)} tokens via on-chain scan")
            except Exception as e:
                logger.error(f"On-chain scan mislukt voor {w.label}: {e}")
        unique_tokens = list(dict.fromkeys(all_tokens))
        logger.info(f"Totaal {len(unique_tokens)} unieke tokens ontdekt")
        return unique_tokens


if __name__ == "__main__":
    import asyncio

    async def main():
        discovery = AlphaDiscovery()
        tokens = await discovery.scan_alpha_wallets()
        for t in tokens:
            print(t.label, t.alpha_score)

    asyncio.run(main())
