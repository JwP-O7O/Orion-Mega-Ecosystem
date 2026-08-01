import logging
from config import BASE_RISK_PCT

logger = logging.getLogger('RiskManager')

class RiskManager:
    def __init__(self, portfolio_value=10.0):
        self.portfolio_value = portfolio_value

    def calculate_kelly_size(self, token_mint):
        # Fractional Kelly berekening (simpel maar doeltreffend)
        size = self.portfolio_value * BASE_RISK_PCT
        return size
