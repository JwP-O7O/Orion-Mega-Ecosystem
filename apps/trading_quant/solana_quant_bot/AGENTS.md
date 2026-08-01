# Solana Quant Bot - Agent Instructions

## Commands
- **Start (Local):** `./start_bot.sh`
- **Start (Docker):** `docker-compose up -d`
- **Dependencies:** `venv/` virtual environment, requirements in `requirements.txt`

## Architecture
- `main.py`: Orchestrates the bot loop and Telegram command handling.
- `core/`: Core logic flow: `AlphaDiscovery` $\rightarrow$ `TokenAuditor` $\rightarrow$ `RiskManager` $\rightarrow$ `SimExecutor`.
- `utils/`: Utility services, notably `price_fetcher.py`.
- `data/`: Persistent state and configuration (e.g., `alpha_wallets.json`).

## Conventions & Quirks
- **Environment:** Uses `.env` via `python-dotenv`.
- **Telegram Interface:** Bot responds to `/status`, `/balans`, and `/stop`.
- **Logging:** Local logs are saved to `bot_activity.log`.

## Verification
- No automated test suite; verify logic by running `main.py` within the `venv`.
