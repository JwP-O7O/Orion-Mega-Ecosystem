import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Union

class SolanaBacktester:
    def __init__(self, initial_balance: Union[int, float] = 10.0):
        if not isinstance(initial_balance, (int, float)) or initial_balance <= 0:
            raise ValueError("Initial balance must be a positive number.")
        
        self.balance: float = float(initial_balance)
        self.history: List[Dict[str, Any]] = []
        self.wallets: List[Dict[str, Union[str, float]]] = [
            {"label": "Insider Alpha 1", "win_rate": 0.75, "avg_roi": 2.5, "specialty": "insider_alpha"},
            {"label": "Memecoin Early", "win_rate": 0.45, "avg_roi": 8.0, "specialty": "memecoin_early"},
            {"label": "Low Mcap Sniper", "win_rate": 0.60, "avg_roi": 1.8, "specialty": "low_mcap_sniper"}
        ]

    def run_simulation(self, days: int = 30) -> List[Dict[str, Union[int, float]]]:
        if not isinstance(days, int) or days <= 0:
            raise ValueError("Number of days must be a positive integer.")

        current_balance: float = self.balance
        daily_stats: List[Dict[str, Union[int, float]]] = []

        for day in range(days):
            daily_profit: float = 0.0
            # Simuleer 1-3 trades per dag gebaseerd op alpha wallets
            num_trades: int = random.randint(1, 3)
            
            for _ in range(num_trades):
                wallet: Dict[str, Union[str, float]] = random.choice(self.wallets)
                stake: float = current_balance * 0.05 # 5% per trade (Fractional Kelly)
                
                # Slaagkans bepalen
                if random.random() < wallet["win_rate"]:
                    # Winst! ROI varieert
                    avg_roi_val = float(wallet["avg_roi"])
                    roi: float = random.uniform(avg_roi_val * 0.5, avg_roi_val * 1.5)
                    profit: float = stake * roi
                    daily_profit += profit
                else:
                    # Verlies (meestal 100% van de inzet bij memecoins)
                    daily_profit -= stake
            
            current_balance += daily_profit
            daily_stats.append({
                "day": day + 1,
                "balance": current_balance,
                "daily_profit": daily_profit
            })

        return daily_stats

    def report(self, stats: List[Dict[str, Union[int, float]]]) -> None:
        if not stats:
            raise ValueError("Simulation statistics cannot be empty for reporting.")

        print(f"--- SOLANA MEMECOIN BACKTEST REPORT ({len(stats)} DAGEN) ---")
        print(f"Start Balans: {self.balance} SOL")
        
        final_balance: float = stats[-1]['balance']
        print(f"Eind Balans: {final_balance:.2f} SOL")
        
        total_profit: float = final_balance - self.balance
        roi: float = (total_profit / self.balance) * 100 if self.balance != 0 else 0.0
        print(f"Totaal Rendement: {roi:.2f}%")
        
        max_drawdown: float = 0.0
        peak: float = self.balance
        
        min_daily_profit: float = stats[0]['daily_profit']
        max_daily_profit: float = stats[0]['daily_profit']

        for s in stats:
            current_balance_s: float = s['balance']
            current_daily_profit_s: float = s['daily_profit']

            if current_balance_s > peak:
                peak = current_balance_s
            
            if peak > 0: # Prevent division by zero if peak somehow becomes zero
                drawdown: float = (peak - current_balance_s) / peak
                if drawdown > max_drawdown:
                    max_drawdown = drawdown
            
            if current_daily_profit_s > max_daily_profit:
                max_daily_profit = current_daily_profit_s
            
            if current_daily_profit_s < min_daily_profit:
                min_daily_profit = current_daily_profit_s
        
        print(f"Maximum Drawdown: {max_drawdown*100:.2f}%")
        print(f"Best Day: {max_daily_profit:.2f} SOL")
        print(f"Worst Day: {min_daily_profit:.2f} SOL")

if __name__ == "__main__":
    try:
        backtester = SolanaBacktester()
        stats = backtester.run_simulation()
        backtester.report(stats)
    except ValueError as e:
        print(f"Configuratie- of invoerfout: {e}")
    except Exception as e:
        print(f"Een onverwachte fout is opgetreden: {e}")