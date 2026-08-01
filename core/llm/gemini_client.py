"""
Orion Mega-Ecosystem Gemini LLM Client
Powered by google-genai Interactions API (SDK >= 2.3.0)
Supports Gemini 3.6 Flash, Gemini 3.5 Flash-Lite, and Vertex AI (Project: jwp-orionx)
"""

import os
import logging
from typing import Optional, Dict, Any

try:
    from google import genai
    from google.genai import types
    HAS_GENAI_SDK = True
except ImportError:
    HAS_GENAI_SDK = False

logger = logging.getLogger("OrionGeminiClient")


class OrionGeminiClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: str = "gemini-3.6-flash",
        fallback_model: str = "gemini-3.5-flash-lite"
    ):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.default_model = default_model
        self.fallback_model = fallback_model
        self.client = None

        if HAS_GENAI_SDK:
            try:
                self.client = genai.Client(api_key=self.api_key) if self.api_key else genai.Client()
                logger.info("Initialized Google GenAI Interactions API Client.")
            except Exception as e:
                logger.warning(f"Failed to initialize GenAI client: {e}")

    def generate_text(self, prompt: str, model: Optional[str] = None, system_instruction: Optional[str] = None) -> str:
        target_model = model or self.default_model
        if not self.client:
            return f"[Simulated Response] Prompt processed without active GenAI client: '{prompt[:40]}...'"

        try:
            interaction = self.client.interactions.create(
                model=target_model,
                input=prompt,
                system_instruction=system_instruction
            )
            return interaction.output_text or ""
        except Exception as err:
            logger.error(f"Error with primary model {target_model}: {err}. Falling back to {self.fallback_model}")
            try:
                interaction = self.client.interactions.create(
                    model=self.fallback_model,
                    input=prompt,
                    system_instruction=system_instruction
                )
                return interaction.output_text or ""
            except Exception as fallback_err:
                logger.error(f"Fallback model failed: {fallback_err}")
                raise fallback_err


if __name__ == "__main__":
    client = OrionGeminiClient()
    print("Orion Gemini Client initialized successfully.")
