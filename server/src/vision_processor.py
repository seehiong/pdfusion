# server/src/vision_processor.py
import os
import base64
from typing import Dict, Any
import litellm
import ssl

# Globally disable SSL verification for local homelab connections (self-signed certs)
ssl._create_default_https_context = ssl._create_unverified_context
os.environ["LITELLM_VERIFY_SSL"] = "False"


class VisionProcessor:
    """Handles local OCR processing using LiteLLM/Ollama"""

    def __init__(self, context=None):
        self.context = context
        self.model = os.environ.get(
            "VISION_MODEL_ID", "openai/ollama/gemma4"
        )  # Use openai provider format for a LiteLLM proxy
        self.api_base = os.environ.get("LITELLM_API_BASE", "https://litellm.local")
        self.api_key = os.environ.get("LITELLM_API_KEY", "sk-local-proxy")

        # Initialize an explicit OpenAI client securely bypassing SSL
        import httpx
        from openai import OpenAI

        self.openai_client = OpenAI(
            api_key=self.api_key,
            base_url=self.api_base,
            http_client=httpx.Client(verify=False),
        )

    def _log(self, message: str):
        if self.context:
            self.context.log(message)
        print(f"LOG: {message}")

    def _error(self, message: str):
        if self.context:
            self.context.error(message)
        print(f"ERROR: {message}")

    def process_images_with_ocr(self, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process images with LiteLLM (Ollama) OCR
        """
        self._log(
            f"Processing {len(extracted_data.get('images', []))} images with LiteLLM model {self.model}"
        )

        for image in extracted_data.get("images", []):
            try:
                # Convert image binary data to base64 for LiteLLM
                image_base64 = base64.b64encode(image["data"]).decode("utf-8")

                # Call LiteLLM completion with vision support
                response = litellm.completion(
                    model=self.model,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Extract all text from this image precisely. Do not summarize.",
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/{image.get('ext', 'png')};base64,{image_base64}"
                                    },
                                },
                            ],
                        }
                    ],
                    api_base=self.api_base,
                    api_key=self.api_key,
                    client=self.openai_client,
                    custom_llm_provider="openai",
                )

                if response and response.choices:
                    image["ocr_text"] = response.choices[0].message.content.strip()
                else:
                    image["ocr_text"] = ""

                self._log(f"OCR result for image {image.get('index')}: Success")

            except Exception as e:
                self._error(f"OCR failed for image: {str(e)}")
                image["ocr_text"] = ""

        return extracted_data
