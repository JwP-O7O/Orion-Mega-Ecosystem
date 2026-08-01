import httpx
import logging
from config import TELEGRAM_TOKEN, TELEGRAM_CHAT_ID

logger = logging.getLogger('TelegramBot')

class TelegramBot:
    def __init__(self):
        self.token = TELEGRAM_TOKEN
        self.chat_id = TELEGRAM_CHAT_ID
        self.last_update_id = 0

    async def send_alert(self, message):
        if not self.token or not self.chat_id: return
        url = f"https://api.telegram.org/bot{self.token}/sendMessage"
        payload = {"chat_id": self.chat_id, "text": message, "parse_mode": "Markdown"}
        async with httpx.AsyncClient() as client:
            try:
                await client.post(url, json=payload)
            except:
                pass

    async def check_for_commands(self):
        """Kijkt of de gebruiker een commando heeft gestuurd via Telegram."""
        if not self.token: return None
        url = f"https://api.telegram.org/bot{self.token}/getUpdates"
        params = {"offset": self.last_update_id + 1, "timeout": 0}
        
        async with httpx.AsyncClient() as client:
            try:
                r = await client.get(url, params=params)
                updates = r.json().get("result", [])
                for update in updates:
                    self.last_update_id = update["update_id"]
                    message = update.get("message", {})
                    # Controleer of het bericht van jou (de juiste Chat ID) komt
                    if str(message.get("chat", {}).get("id")) == str(self.chat_id):
                        return message.get("text")
            except Exception as e:
                logger.error(f"Telegram polling error: {e}")
        return None
