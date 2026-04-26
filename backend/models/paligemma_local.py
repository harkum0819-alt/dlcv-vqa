"""
Fine-tuned PaliGemma-3B + LoRA adapters — local inference.
GPU : 4-bit NF4 quantization via bitsandbytes (~1.5 GB VRAM, fits RTX 3050 4 GB)
CPU : bfloat16 fallback (~6 GB RAM)
Base model (~3 GB) is downloaded once and cached by HuggingFace.
"""
import os
import threading
import logging
from PIL import Image

logger = logging.getLogger(__name__)

_BASE_MODEL_ID = 'google/paligemma-3b-pt-224'
_ADAPTER_DIR   = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', 'dlcv_results', 'lora_adapters')
)
_HF_TOKEN = os.getenv('HF_API_TOKEN', '')
_MAX_LEN  = 192
_MAX_NEW  = 60

_model     = None
_processor = None
_device    = 'cpu'
_lock      = threading.Lock()
_ready     = False
_loading   = False
_load_err  = None


def status() -> dict:
    return {
        'ready':   _ready,
        'loading': _loading,
        'error':   _load_err,
        'device':  _device,
    }


def load_in_background():
    """Kick off model loading in a daemon thread so the server starts immediately."""
    t = threading.Thread(target=_load, daemon=True, name='paligemma-loader')
    t.start()


def _load():
    global _model, _processor, _device, _ready, _loading, _load_err

    with _lock:
        if _ready or _loading:
            return
        _loading = True

    try:
        import torch
        from transformers import PaliGemmaForConditionalGeneration, PaliGemmaProcessor
        from peft import PeftModel

        logger.info('PaliGemma: loading processor from local adapter dir...')
        proc = PaliGemmaProcessor.from_pretrained(_ADAPTER_DIR, token=_HF_TOKEN)

        model        = None
        chosen_device = 'cpu'

        # ── Try 4-bit GPU first ───────────────────────────────────────────────
        if torch.cuda.is_available():
            try:
                from transformers import BitsAndBytesConfig
                bnb = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_quant_type='nf4',
                )
                logger.info('PaliGemma: loading base model 4-bit on GPU...')
                model = PaliGemmaForConditionalGeneration.from_pretrained(
                    _BASE_MODEL_ID,
                    quantization_config=bnb,
                    device_map='auto',
                    token=_HF_TOKEN,
                )
                chosen_device = 'cuda'
                logger.info('PaliGemma: base model loaded (4-bit GPU)')
            except Exception as e:
                logger.warning(f'PaliGemma: 4-bit GPU failed ({e}) — falling back to CPU')
                model = None

        # ── CPU bfloat16 fallback ─────────────────────────────────────────────
        if model is None:
            logger.info('PaliGemma: loading base model bfloat16 on CPU (~6 GB RAM)...')
            model = PaliGemmaForConditionalGeneration.from_pretrained(
                _BASE_MODEL_ID,
                torch_dtype=torch.bfloat16,
                device_map='cpu',
                token=_HF_TOKEN,
            )
            chosen_device = 'cpu'
            logger.info('PaliGemma: base model loaded (bfloat16 CPU)')

        logger.info('PaliGemma: applying LoRA adapters...')
        model = PeftModel.from_pretrained(model, _ADAPTER_DIR)
        model.eval()

        with _lock:
            _model        = model
            _processor    = proc
            _device       = chosen_device
            _ready        = True
            _loading      = False

        logger.info(f'PaliGemma: ready on {chosen_device}')

    except Exception as e:
        with _lock:
            _loading  = False
            _load_err = str(e)
        logger.error(f'PaliGemma load error: {e}')


def _ensure_loaded():
    if not _ready and not _loading:
        _load()
    # If it was loading in background, wait for it
    while _loading:
        import time
        time.sleep(0.5)
    if _load_err:
        raise RuntimeError(f'PaliGemma failed to load: {_load_err}')


def predict(image: Image.Image, question: str, history: list | None = None) -> dict:
    """Single-turn or multi-turn VQA with the fine-tuned PaliGemma model."""
    import torch
    _ensure_loaded()

    image = image.convert('RGB')

    # Build prompt matching training format: "Q: ... A: Q: ... A:"
    parts = []
    for turn in (history or []):
        parts.append(f"Q: {turn['question']} A: {turn['answer']}")
    parts.append(f'Q: {question} A:')
    prompt = ' '.join(parts)

    inputs = _processor(
        images=image,
        text=prompt,
        return_tensors='pt',
        padding='longest',
        truncation=True,
        max_length=_MAX_LEN,
    )
    if _device == 'cuda':
        inputs = {k: v.to('cuda') for k, v in inputs.items()}

    input_len = inputs['input_ids'].shape[1]
    with torch.no_grad():
        out = _model.generate(
            **inputs,
            max_new_tokens=_MAX_NEW,
            do_sample=False,
            num_beams=3,
        )

    answer = _processor.decode(out[0][input_len:], skip_special_tokens=True).strip()

    return {
        'answer':        answer or '(no answer generated)',
        'confidence':    0.9,
        'attention_map': None,
        'model':         f'PaliGemma-3B-LoRA ({_device})',
        'device':        _device,
    }
