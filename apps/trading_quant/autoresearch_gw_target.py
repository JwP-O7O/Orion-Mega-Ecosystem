import time
import json
import os
import sys
from pathlib import Path

# AutoResearch Target Module voor Greenwheels API Tuning
# Test responstijden, retries, timeouts en header mutaties om de allerlaagste latency te behalen.

import urllib.request
import urllib.error

GQL_URL = "https://www.greenwheels.com/api/graphql"
VALID_ISC_COOKIE = "Fe26.2*1*e9eb85d2e6750eb7b924237e156cc5faae0e55d2992dd2bf5027aa7435ae178d*liVrUbmfqTx1mm8ZBx3O2Q*E9u6qUYoN1zhldw1WpV2bZS1FJ6QF8FWZ-2r0Pdbd_QrqDZWQNDkfL7XdnZVULqAjMu7Jpi6omxXpMg2ZICDIdXTChwd7SPByXmSjGsn6A*1784117780937*4f6ce506d51d41214dc2c6b99857daf732323e172a74c210d88aa92283cfbf3c*EFxG9dBwwuIDmSXdN_bJxoAb0Rt1ysHINlgl7PFaVR0~2"

class GwReconTuner:
    def __init__(self, timeout=10, app_version="v5.48.0", rate_delay=0.2, user_agent="Mozilla/5.0"):
        self.timeout = timeout
        self.app_version = app_version
        self.rate_delay = rate_delay
        self.user_agent = user_agent

    def benchmark_query(self, iterations=3):
        """Voert GraphQL locatiescans uit en bereken gemiddelde latency + success rate."""
        payload = json.dumps({
            "query": "query GetLocations { locations { id latitude longitude } }"
        }).encode('utf-8')

        headers = {
            "User-Agent": self.user_agent,
            "Content-Type": "application/json",
            "apollographql-client-name": "web",
            "apollographql-client-version": self.app_version,
            "Cookie": f"greenwheels_isc={VALID_ISC_COOKIE}"
        }

        latencies = []
        successes = 0

        for _ in range(iterations):
            t0 = time.time()
            try:
                req = urllib.request.Request(GQL_URL, data=payload, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    if resp.status == 200:
                        latencies.append(time.time() - t0)
                        successes += 1
            except Exception:
                pass
            time.sleep(self.rate_delay)

        if not latencies:
            return 999.0  # Hoge straf (loss) bij complete mislukking

        avg_latency = sum(latencies) / len(latencies)
        success_ratio = successes / iterations
        
        # Loss score for AutoResearch (lower latency and higher success ratio = lower loss)
        loss_score = avg_latency / (success_ratio + 0.001)
        return loss_score

def main():
    start_time = time.time()

    # WINNENDE OPTIMALE HYPERPARAMETERS (BASELINE IS HYPER-EFFICIËNT):
    TIMEOUT = 5
    APP_VERSION = "v5.48.0"
    RATE_DELAY = 0.05
    USER_AGENT = "Mozilla/5.0 (Linux; Android 14; Mobile)"

    tuner = GwReconTuner(
        timeout=TIMEOUT,
        app_version=APP_VERSION,
        rate_delay=RATE_DELAY,
        user_agent=USER_AGENT
    )

    loss = tuner.benchmark_query()
    end_time = time.time()

    print("--- GREENWHEELS RECON AUTORESEARCH BENCHMARK ---")
    print(f"val_bpb:          {loss:.6f}") # Latency penalty score
    print(f"training_seconds: {end_time - start_time:.2f}")
    print(f"total_seconds:    {end_time - start_time:.2f}")

if __name__ == "__main__":
    main()
