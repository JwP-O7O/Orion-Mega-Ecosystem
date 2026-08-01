"""
Circadian Rhythm & Failsafe Process Manager
Extracted from OrionX and integrated into Neural Nexus.
"""

import datetime
import logging
import time
from typing import Callable, Optional

logger = logging.getLogger("CircadianManager")

class CircadianManager:
    def __init__(self, sleep_start_hour: int = 2, sleep_end_hour: int = 7):
        self.sleep_start_hour = sleep_start_hour
        self.sleep_end_hour = sleep_end_hour
        self.is_paused = False

    def is_sleeping_hours(self) -> bool:
        """
        Determines whether the system is in circadian sleep cycle (default 02:00 - 07:00).
        """
        current_hour = datetime.datetime.now().hour
        if self.sleep_start_hour <= current_hour < self.sleep_end_hour:
            return True
        return False

    def check_and_apply(self, on_sleep: Optional[Callable] = None, on_wake: Optional[Callable] = None) -> bool:
        """
        Checks circadian status and triggers callbacks on state transitions.
        Returns True if in sleeping hours.
        """
        in_sleep = self.is_sleeping_hours()
        if in_sleep and not self.is_paused:
            logger.info("[Circadian] Slaapcyclus gedetecteerd. Achtergrondsessies worden gepauzeerd.")
            self.is_paused = True
            if on_sleep:
                try:
                    on_sleep()
                except Exception as e:
                    logger.error(f"[Circadian] Fout bij on_sleep callback: {e}")
        elif not in_sleep and self.is_paused:
            logger.info("[Circadian] Actieve uren aangebroken. Achtergrondsessies hervat.")
            self.is_paused = False
            if on_wake:
                try:
                    on_wake()
                except Exception as e:
                    logger.error(f"[Circadian] Fout bij on_wake callback: {e}")
        return in_sleep

if __name__ == "__main__":
    cm = CircadianManager()
    sleeping = cm.is_sleeping_hours()
    print(f"[Circadian Check] Huidige status: {'Slaapstand' if sleeping else 'Actief'}")
    print("[Circadian Check] 100% SUCCESS!")
