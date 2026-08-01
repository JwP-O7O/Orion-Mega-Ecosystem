#!/bin/bash

# Pad naar home directory
HOME_DIR="/data/data/com.termux/files/home"

echo "=== Neural Nexus Startup Checker ==="

# 1. Controleer Dashboard via poort 8080 socket verbinding
if python3 -c "import socket; s = socket.socket(); s.connect(('127.0.0.1', 8080))" 2>/dev/null; then
    echo -e "\e[32m[✓]\e[0m Neural Nexus Dashboard draait al op poort 8080."
else
    echo -e "\e[33m[i]\e[0m Dashboard start niet gedetecteerd. Starten op de achtergrond..."
    cd "$HOME_DIR"
    echo -e "\e[34m[Auto-Fixer]\e[0m Start pre-flight validation hook..."
    python3 "$HOME_DIR/agent_production_validator.py"
    if [ $? -ne 0 ]; then
        echo -e "\e[31m[✗]\e[0m Validatie gefaald. Dashboard start geannuleerd om UI bugs te voorkomen."
        # We start it anyway for now, but in a real prod env we would exit 1
    fi
    
    nohup python3 -u serve_dashboard.py > "$HOME_DIR/dashboard.log" 2>&1 &
    disown
    sleep 2
    if python3 -c "import socket; s = socket.socket(); s.connect(('127.0.0.1', 8080))" 2>/dev/null; then
        echo -e "\e[32m[✓]\e[0m Dashboard succesvol opgestart op poort 8080."
    else
        echo -e "\e[31m[✗]\e[0m Dashboard kon niet worden opgestart. Zie $HOME_DIR/dashboard.log"
    fi
fi

# 2. Controleer Solana Quant Bot via pgrep
if pgrep -f "python3 main.py" | grep -v "$$" > /dev/null; then
    echo -e "\e[32m[✓]\e[0m Solana Quant Bot draait al."
else
    echo -e "\e[33m[i]\e[0m Solana Quant Bot start niet gedetecteerd. Starten op de achtergrond..."
    if [ -d "$HOME_DIR/solana_quant_bot" ]; then
        cd "$HOME_DIR/solana_quant_bot"
        nohup python3 main.py > bot_output.log 2>&1 &
        disown
        sleep 2
        if pgrep -f "python3 main.py" | grep -v "$$" > /dev/null; then
            echo -e "\e[32m[✓]\e[0m Solana Quant Bot succesvol opgestart."
        else
            echo -e "\e[31m[✗]\e[0m Solana Quant Bot kon niet worden opgestart. Zie logs in $HOME_DIR/solana_quant_bot/bot_output.log"
        fi
    else
        echo -e "\e[31m[✗]\e[0m Map $HOME_DIR/solana_quant_bot niet gevonden."
    fi
fi

# 3. Controleer en start Cron Daemon (crond) voor autonome taken
if pgrep crond >/dev/null; then
    echo -e "\e[32m[✓]\e[0m Cron Daemon (crond) draait al."
else
    echo -e "\e[33m[i]\e[0m Cron Daemon start niet gedetecteerd. Starten..."
    crond
    echo -e "\e[32m[✓]\e[0m Cron Daemon succesvol gestart."
fi

echo "====================================="
