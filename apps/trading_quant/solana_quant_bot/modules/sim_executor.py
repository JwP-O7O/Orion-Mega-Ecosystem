import logging

logger = logging.getLogger('SimExecutor')

class SimExecutor:
    def __init__(self, initial_balance=10.0):
        self.balance = initial_balance
        logger.info(f"Simulation started with balance: {self.balance} SOL")

    async def execute_buy(self, token, size):
        logger.info(f"PAPER BUY: {size} SOL of {token}")
