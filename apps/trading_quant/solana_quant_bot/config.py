import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Mode: SIMULATION or LIVE
BOT_MODE = 'LIVE'

# Thresholds
MIN_WIN_RATE = 0.53  # Optimized by Auto-Research
MIN_AVG_ROI = 5.0
MAX_ENTRY_LATENCY_MINS = 10

# Risk Management
BASE_RISK_PCT = 0.146  # Optimized by Auto-Research (14.6% stake)
STOP_LOSS = 0.14       # Optimized by Auto-Research (14% stop-loss)
TAKE_PROFIT_MULTIPLIER = 3.35 # Optimized by Auto-Research (3.35x target)
MAX_CONCURRENT_POSITIONS = 5

# API Endpoints
# RPC_URL: Fallback to a default Solana mainnet URL if not set in environment
RPC_URL = os.getenv('RPC_URL', 'https://api.mainnet-beta.solana.com')

# Solana RPC URLs: A tuple of potential RPC endpoints for redundancy/failover.
# Tuples are memory-efficient and immutable, suitable for fixed collections.
SOLANA_RPC_URLS = (
    "https://api.mainnet-beta.solana.com",
    "https://rpc.ankr.com/solana"
)

# Telegram API credentials: These are critical for the bot's operation.
# We log a warning if they are missing, allowing local simulation/testing without Telegram alerts.
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
if not TELEGRAM_TOKEN:
    import sys
    print("[WAARSCHUWING] TELEGRAM_TOKEN environment variable is not set. Telegram alerts will be disabled.", file=sys.stderr)

TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')
if not TELEGRAM_CHAT_ID:
    import sys
    print("[WAARSCHUWING] TELEGRAM_CHAT_ID environment variable is not set. Telegram alerts will be disabled.", file=sys.stderr)