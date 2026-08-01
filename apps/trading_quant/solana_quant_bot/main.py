import asyncio
import logging
import os
import config
from core.discovery import AlphaDiscovery
from core.auditor import TokenAuditor
from core.risk_manager import RiskManager
from core.telegram_bot import TelegramBot
from utils.price_fetcher import PriceFetcher
from modules.sim_executor import SimExecutor
from modules.edge_synthesizer import EdgeSynthesizer
import async_timeout

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('QuantBot_S26')

API_TIMEOUT_DEFAULT = getattr(config, 'API_TIMEOUT_DEFAULT', 30)
TELEGRAM_TIMEOUT = getattr(config, 'TELEGRAM_TIMEOUT', 10)
DISCOVERY_TIMEOUT = getattr(config, 'DISCOVERY_TIMEOUT', 60)
AUDIT_TIMEOUT = getattr(config, 'AUDIT_TIMEOUT', 45)
EXECUTION_TIMEOUT = getattr(config, 'EXECUTION_TIMEOUT', 60)
PRICE_FETCH_TIMEOUT = getattr(config, 'PRICE_FETCH_TIMEOUT', 15)
LOOP_SLEEP_SECONDS = getattr(config, 'LOOP_SLEEP_SECONDS', 60)
ERROR_SLEEP_SECONDS = getattr(config, 'ERROR_SLEEP_SECONDS', 10)

class AutonomousBot:
    def __init__(self):
        from utils.supabase_client import SupabaseClient
        self.supabase = SupabaseClient()
        self.discovery = AlphaDiscovery()
        self.auditor = TokenAuditor()
        self.risk_mgr = RiskManager()
        self.telegram = TelegramBot()
        self.price_fetcher = PriceFetcher()
        self.executor = SimExecutor()
        self.synthesizer = EdgeSynthesizer()
        self.active_positions = {}

        
        # Laad open posities van Supabase indien geconfigureerd
        try:
            active_from_db = self.supabase.get_active_positions()
            for pos in active_from_db:
                self.active_positions[pos["token_address"]] = float(pos["buy_price"])
            if active_from_db:
                logger.info(f"Geladen {len(active_from_db)} open posities uit Supabase.")
        except Exception as e:
            logger.error(f"Fout bij inladen posities uit Supabase: {e}")

        self.cycle_count = 0
        self.running = True

    async def _send_telegram_alert_robust(self, message: str):
        try:
            async with async_timeout.timeout(TELEGRAM_TIMEOUT):
                await self.telegram.send_alert(message)
        except asyncio.TimeoutError:
            logger.warning(f"Telegram alert getimed out na {TELEGRAM_TIMEOUT}s: {message[:100]}...")
        except Exception as e:
            logger.error(f"Fout bij versturen Telegram alert: {e} - Bericht: {message[:100]}...")

    async def handle_commands(self):
        command = None
        try:
            async with async_timeout.timeout(TELEGRAM_TIMEOUT):
                command = await self.telegram.check_for_commands()
        except asyncio.TimeoutError:
            logger.warning(f"Telegram commando controle getimed out na {TELEGRAM_TIMEOUT}s.")
            return
        except Exception as e:
            logger.error(f"Fout bij controleren Telegram commando's: {e}")
            return

        if not command: return

        logger.info(f"Ontvangen commando via Telegram: {command}")
        
        if command == "/status":
            await self._send_telegram_alert_robust(f"📊 *Status Update*\nCycli gedraaid: {self.cycle_count}\nOpen posities: {len(self.active_positions)}")
        elif command == "/balans":
            await self._send_telegram_alert_robust(f"💰 *Balans Update*\nBalans: {self.executor.balance} SOL\nActieve posities: {list(self.active_positions.keys())}")
        elif command == "/stop":
            await self._send_telegram_alert_robust("🛑 *Bot wordt gestopt per commando...*")
            self.running = False
        else:
            await self._send_telegram_alert_robust("❓ *Onbekend commando.* Probeer /status, /balans of /stop")

    async def run(self):
        logger.info("🚀 Solana Quant Bot (S26 Ultra Light Edition) - ONLINE")
        self.supabase.log_event("bot_online", "Solana Quant Bot (S26 Ultra Light Edition) is nu online.")
        await self._send_telegram_alert_robust("🤖 *Bot is nu ONLINE en luistert naar commando's!*\nProbeer /status, /balans of /stop")

        while self.running:
            try:
                self.cycle_count += 1
                # Update real-time state for dashboard
                try:
                    state = {
                        "cycle_count": self.cycle_count,
                        "balance_sol": self.executor.balance,
                        "last_updated": os.path.getmtime("bot_output.log") if os.path.exists("bot_output.log") else 0,
                        "running": True,
                        "active_positions_count": len(self.active_positions)
                    }
                    with open("data/state.json", "w") as sf:
                        import json
                        json.dump(state, sf)
                except Exception as e:
                    logger.error(f"State save failed: {e}")
                logger.info(f"Start cyclus {self.cycle_count}")
                logger.info(f"Balans: {self.executor.balance} SOL")

                await self.handle_commands()
                if not self.running:
                    logger.info("Bot gestopt door commando.")
                    break

                tokens = []
                try:
                    async with async_timeout.timeout(DISCOVERY_TIMEOUT):
                        tokens = await self.discovery.discover_new_tokens()
                    logger.debug(f"Discovered {len(tokens)} potentiële alpha tokens.")
                except asyncio.TimeoutError:
                    logger.warning(f"Alpha wallet discovery getimed out na {DISCOVERY_TIMEOUT}s.")
                except Exception as e:
                    logger.error(f"Fout bij scannen alpha wallets: {e}", exc_info=True)
                
                new_tokens_to_audit = [token for token in tokens if token not in self.active_positions]
                
                if new_tokens_to_audit:
                    logger.debug(f"Start audit voor {len(new_tokens_to_audit)} potentiële tokens.")
                    audit_tasks = []
                    for token in new_tokens_to_audit:
                        async def audit_single_token(t):
                            try:
                                async with async_timeout.timeout(AUDIT_TIMEOUT):
                                    return t, await self.auditor.audit_token(t)
                            except asyncio.TimeoutError:
                                logger.warning(f"Audit voor token {t} getimed out na {AUDIT_TIMEOUT}s.")
                                return t, False
                            except Exception as e:
                                logger.error(f"Fout bij audit van token {t}: {e}", exc_info=True)
                                return t, False
                        audit_tasks.append(audit_single_token(token))

                    audit_results = await asyncio.gather(*audit_tasks)

                    for token, audit_passed in audit_results:
                        if not self.running: break
                        
                        if audit_passed:
                            logger.info(f"Token {token} audit: PASS. Bereken positiegrootte.")
                            size = self.risk_mgr.calculate_kelly_size(token)
                            if size <= 0:
                                logger.warning(f"Berekende grootte voor {token} is {size}, overslaan koop.")
                                continue

                            try:
                                async with async_timeout.timeout(EXECUTION_TIMEOUT):
                                    await self.executor.execute_buy(token, size)
                                logger.info(f"Kooporder uitgevoerd voor {token} met grootte {size} SOL.")
                            except asyncio.TimeoutError:
                                logger.warning(f"Koopuitvoering voor token {token} getimed out na {EXECUTION_TIMEOUT}s.")
                                continue
                            except Exception as e:
                                logger.error(f"Fout bij uitvoeren kooporder voor token {token}: {e}", exc_info=True)
                                continue

                            current_price = None
                            try:
                                async with async_timeout.timeout(PRICE_FETCH_TIMEOUT):
                                    current_price = await self.price_fetcher.get_price_sol(token)
                                self.active_positions[token] = current_price
                                logger.info(f"Prijs opgehaald voor {token}: {current_price} SOL. Toegevoegd aan actieve posities.")
                            except asyncio.TimeoutError:
                                logger.warning(f"Prijs ophalen voor token {token} getimed out na {PRICE_FETCH_TIMEOUT}s. Positie toegevoegd zonder prijs.")
                                self.active_positions[token] = None
                            except Exception as e:
                                logger.error(f"Fout bij ophalen prijs voor token {token}: {e}. Positie toegevoegd zonder prijs.", exc_info=True)
                                self.active_positions[token] = None

                            # Sla op in Supabase en log event
                            try:
                                buy_price_val = current_price if current_price is not None else 0.0
                                self.supabase.save_position(token, float(buy_price_val), float(size), "open")
                                self.supabase.log_event("solana_buy", f"Token {token} gekocht voor {buy_price_val} SOL (Grootte: {size} SOL)")
                            except Exception as e:
                                logger.error(f"Fout bij opslaan positie in Supabase: {e}")

                            await self._send_telegram_alert_robust(f"✅ *Nieuwe Alpha Gevonden!*\nToken: `{token}`\nAudit: PASS\nPositie: {size} SOL")
                        else:
                            logger.debug(f"Token {token} audit: FAIL of getimed out. Overslaan.")
                else:
                    logger.debug("Geen nieuwe tokens om te auditen.")
                
                await asyncio.sleep(LOOP_SLEEP_SECONDS)
            except Exception as e:
                logger.error(f"Onverwachte fout in de hoofdloop: {e}", exc_info=True)
                await asyncio.sleep(ERROR_SLEEP_SECONDS)

if __name__ == "__main__":
    bot = AutonomousBot()
    try:
        asyncio.run(bot.run())
    except KeyboardInterrupt:
        logger.info("Bot gestopt door KeyboardInterrupt.")
    except Exception as e:
        logger.critical(f"Kritieke fout bij opstarten of uitvoeren van de bot: {e}", exc_info=True)