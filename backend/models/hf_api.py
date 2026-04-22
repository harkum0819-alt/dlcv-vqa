"""
HuggingFace Inference API — runs a second VQA model via cloud.
Default: dandelin/vilt-b32-finetuned-vqa  (free tier, reliable, fast)
Requires a free HF token: https://huggingface.co/settings/tokens
"""
import os
import io
import base64
import time
import requests
from PIL import Image
import logging

logger = logging.getLogger(__name__)

HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
# ViLT is free-tier compatible and purpose-built for VQA
HF_MODEL_ID  = os.getenv("HF_MODEL_ID", "dandelin/vilt-b32-finetuned-vqa")
HF_API_URL   = f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}"


def _image_to_bytes(image: Image.Image) -> bytes:
    image = image.convert("RGB")
    w, h = image.size
    if max(w, h) > 384:
        ratio = 384 / max(w, h)
        image = image.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def is_configured() -> bool:
    return bool(HF_API_TOKEN and HF_API_TOKEN != "hf_your_token_here")


def predict(image: Image.Image, question: str) -> dict:
    if not is_configured():
        return _err("HuggingFace API token not set. Add HF_API_TOKEN in backend/.env", "token_missing")

    headers = {
        "Authorization": f"Bearer {HF_API_TOKEN}",
        "Content-Type":  "application/json",
    }

    import base64 as _b64
    img_b64 = _b64.b64encode(_image_to_bytes(image)).decode("utf-8")
    payload  = {"inputs": {"image": img_b64, "question": question}}

    # Retry once on connection reset or 503 (model cold-starting)
    for attempt in range(2):
        try:
            resp = requests.post(HF_API_URL, headers=headers, json=payload, timeout=45)

            if resp.status_code == 503:
                if attempt == 0:
                    time.sleep(8)   # wait for cold-start, then retry
                    continue
                return _err("Model is cold-starting on HuggingFace. Try again in ~20 seconds.", "model_loading")

            if resp.status_code == 401:
                return _err("Invalid HuggingFace token. Check HF_API_TOKEN in backend/.env", "invalid_token")

            if resp.status_code == 422:
                return _err("Model doesn't support this input format.", "unsupported_input")

            resp.raise_for_status()
            return _parse(resp.json())

        except requests.ConnectionError as e:
            if attempt == 0:
                time.sleep(3)
                continue
            return _err(f"Connection error: {e}", "connection_error")

        except requests.Timeout:
            return _err("Request timed out (45 s). HuggingFace may be busy.", "timeout")

        except Exception as e:
            logger.error(f"HF API error: {e}")
            return _err(str(e), "api_error")

    return _err("All retries failed.", "retry_exhausted")


def _parse(data) -> dict:
    """Parse the HF Inference API response into a standard dict."""
    try:
        if isinstance(data, list) and data:
            first  = data[0]
            answer = first.get("answer") or first.get("generated_text") or str(first)
            score  = float(first.get("score", 0.85))
        elif isinstance(data, dict):
            answer = data.get("answer") or data.get("generated_text") or str(data)
            score  = float(data.get("score", 0.85))
        else:
            answer = str(data)
            score  = 0.85
        return {
            "answer":       answer,
            "confidence":   round(score, 4),
            "attention_map": None,
            "model":        HF_MODEL_ID,
        }
    except Exception:
        return _err(f"Unexpected response format: {data}", "parse_error")


def _err(msg: str, code: str) -> dict:
    return {
        "answer":        msg,
        "confidence":    0.0,
        "attention_map": None,
        "model":         HF_MODEL_ID,
        "error":         code,
    }
