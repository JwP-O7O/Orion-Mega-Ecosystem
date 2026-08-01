"""
Super-Edge Synthesizer & Cross-Correlation Engine
Extracted from OrionX and integrated into Neural Nexus Solana Quant Bot.
"""

from collections import deque
import logging
import re
from typing import List, Tuple, Dict, Any, Optional

logger = logging.getLogger("EdgeSynthesizer")

class EdgeSynthesizer:
    def __init__(self, window_seconds: float = 60.0, min_super_edge_percent: float = 15.0):
        self.window_seconds = window_seconds
        self.min_super_edge_percent = min_super_edge_percent

    def analyze_lead_stream(self, events: List[Tuple[float, str, float, str]]) -> str:
        """
        Identifies which stream leads price/opportunity movements.
        Events format: (timestamp, message, edge_value, stream_name)
        """
        lead_counts: Dict[str, int] = {"sniper": 0, "solana": 0, "greenwheels": 0}
        window: deque = deque()
        
        for t, msg, edge_val, stream_name in events:
            while window and t - window[0][0] > self.window_seconds:
                window.popleft()
            window.append((t, msg, edge_val, stream_name))
            
            streams_in_window = set([w[3] for w in window if w[3]])
            if len(streams_in_window) >= 2:
                first_stream = window[0][3]
                if first_stream and first_stream in lead_counts:
                    lead_counts[first_stream] += 1
                window.clear()
                
        if sum(lead_counts.values()) == 0:
            return "solana"  # default fallback
        return max(lead_counts, key=lead_counts.get)

    def synthesize(self, events: List[Tuple[float, str, float, str]]) -> Dict[str, Any]:
        """
        Cross-correlates multi-stream signals to find high confidence Super-Edges.
        """
        events_sorted = sorted(events, key=lambda x: x[0])
        lead_stream = self.analyze_lead_stream(events_sorted)
        
        super_edges = []
        pre_connects = []
        window: deque = deque()
        last_edges: Dict[str, float] = {"sniper": 0.0, "solana": 0.0, "greenwheels": 0.0}
        
        for t, msg, edge_val, stream_name in events_sorted:
            while window and t - window[0][0] > self.window_seconds:
                window.popleft()
                
            window.append((t, msg, edge_val, stream_name))
            
            streams_in_window = set()
            deltas = {}
            for wt, wmsg, wedge, wstream in window:
                if wstream:
                    streams_in_window.add(wstream)
                    delta = wedge - last_edges.get(wstream, 0.0)
                    deltas[wstream] = delta
                    last_edges[wstream] = wedge
                    
            if stream_name == lead_stream and deltas.get(lead_stream, 0.0) > 1.0:
                pre_connect_msg = f"PREDICTIVE-LEAD-TRIGGER: Lead stream {lead_stream} spiking delta {deltas[lead_stream]:.2f}%"
                pre_connects.append(pre_connect_msg)
                    
            converging_streams = sum(1 for d in deltas.values() if d > 1.0)
            if converging_streams >= 2:
                pre_connect_msg = f"PREDICTIVE-TRIGGER: Converging streams {streams_in_window} with high delta"
                pre_connects.append(pre_connect_msg)

            if len(streams_in_window) >= 2 and edge_val >= self.min_super_edge_percent:
                edge_msg = f"SUPER-EDGE ({edge_val:.1f}%+) DETECTED at {t}: Streams {streams_in_window}"
                super_edges.append(edge_msg)
                window.clear()

        return {
            "lead_stream": lead_stream,
            "super_edges_count": len(super_edges),
            "super_edges": super_edges,
            "pre_connects_count": len(pre_connects),
            "pre_connects": pre_connects
        }

if __name__ == "__main__":
    # Test dataset
    import time
    now = time.time()
    test_events = [
        (now, "Solana token spike", 12.0, "solana"),
        (now + 5, "Sniper livescore goal", 18.0, "sniper"),
        (now + 10, "Greenwheels car booking", 16.5, "greenwheels")
    ]
    synthesizer = EdgeSynthesizer()
    res = synthesizer.synthesize(test_events)
    print(f"[Synthesizer Test] Lead stream: {res['lead_stream']}, Super edges found: {res['super_edges_count']}")
    assert res['super_edges_count'] > 0, "Test failed: Super edges should be detected."
    print("[Synthesizer Test] 100% SUCCESS!")
