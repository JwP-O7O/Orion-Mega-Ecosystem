import httpx
import logging

logger = logging.getLogger('PriceFetcher')

class PriceFetcher:
    def __init__(self):
        self.jup_api = "https://api.jup.ag/price/v2"

    async def get_price_sol(self, mint):
        # We halen de prijs van het token en van SOL op bij Jupiter
        sol_mint = "So11111111111111111111111111111111111111112"
        async with httpx.AsyncClient() as client:
            try:
                # Vraag prijzen voor token en SOL in USD
                url = f"{self.jup_api}?ids={mint},{sol_mint}"
                r = await client.get(url)
                data = r.json().get("data", {})
                
                token_usd = float(data.get(mint, {}).get("price", 0))
                sol_usd = float(data.get(sol_mint, {}).get("price", 1)) # 1 as fallback
                
                if token_usd == 0: return 0
                return token_usd / sol_usd # Prijs in SOL
            except Exception as e:
                logger.error(f"Price error for {mint}: {e}")
                return 0
