"""
Local BLIP VQA model — runs on RTX 3050 (4 GB VRAM).
Model: Salesforce/blip-vqa-base (~385 MB, fine-tuned on VQA v2)
Falls back to CPU if CUDA fails to load (pagefile/RAM issue on 8 GB systems).
"""
import os
import io
import base64
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger(__name__)

MODEL_ID = os.getenv("LOCAL_MODEL_ID", "Salesforce/blip-vqa-base")
MAX_SIZE = int(os.getenv("MAX_IMAGE_SIZE", "480"))

_processor = None
_model = None
_device = "cpu"


def _get_device() -> str:
    """Try CUDA, fall back to CPU if pagefile/memory is too small."""
    try:
        import torch
        if torch.cuda.is_available():
            # Quick test — loading CUDA can fail on low-pagefile systems
            torch.zeros(1).cuda()
            return "cuda"
    except Exception as e:
        logger.warning(f"CUDA unavailable ({e}), using CPU.")
    return "cpu"


def _load():
    global _processor, _model, _device
    if _model is not None:
        return

    import torch
    from transformers import BlipProcessor, BlipForQuestionAnswering

    logger.info(f"Loading local model: {MODEL_ID}")
    _device = _get_device()

    _processor = BlipProcessor.from_pretrained(MODEL_ID)
    _model = BlipForQuestionAnswering.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16 if _device == "cuda" else torch.float32,
    ).to(_device)
    _model.eval()
    logger.info(f"Model loaded on {_device}")


def _resize(image: Image.Image) -> Image.Image:
    w, h = image.size
    if max(w, h) > MAX_SIZE:
        ratio = MAX_SIZE / max(w, h)
        image = image.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    return image


def predict_with_context(image: Image.Image, question: str, history: list[dict]) -> dict:
    """
    Conversational VQA for chat mode.

    BLIP-vqa-base is a discriminative model trained on clean (image, question) pairs.
    Injecting long text context into the question string hurts accuracy — the model
    fixates on previous answer words instead of answering the new question.

    Strategy: pass the clean question directly to BLIP (the image IS the context).
    Skip GradCAM on follow-up turns to keep response time under 3 s.
    The conversation history is displayed in the chat UI for the user.
    """
    is_first_turn = len(history) == 0
    return predict(image, question, run_gradcam=is_first_turn)


def predict(image: Image.Image, question: str, run_gradcam: bool = True) -> dict:
    import torch
    _load()

    image = image.convert("RGB")
    image = _resize(image)

    inputs = _processor(image, question, return_tensors="pt").to(_device)

    with torch.no_grad():
        out = _model.generate(
            **inputs,
            max_new_tokens=30,
            num_beams=5,
            output_scores=True,
            return_dict_in_generate=True,
        )

    answer = _processor.decode(out.sequences[0], skip_special_tokens=True)
    confidence = _compute_confidence(out)
    attention_b64 = _gradcam(image, inputs) if run_gradcam else None

    return {
        "answer": answer,
        "confidence": confidence,
        "attention_map": attention_b64,
        "model": MODEL_ID,
        "device": _device,
    }


def _compute_confidence(out) -> float:
    try:
        import torch
        scores = out.scores
        if not scores:
            return 0.0
        probs = [torch.softmax(s, dim=-1).max().item() for s in scores]
        return round(float(np.mean(probs)), 4)
    except Exception:
        return 0.0


def _gradcam(image: Image.Image, inputs: dict) -> str:
    """GradCAM heatmap overlaid on image. Falls back to plain image on any error."""
    try:
        import torch
        import torch.nn as nn
        import math
        import cv2
        from pytorch_grad_cam import GradCAM
        from pytorch_grad_cam.utils.image import show_cam_on_image

        # BLIP uses a ViT backbone → encoder output is (batch, seq_len, hidden_dim).
        # GradCAM requires 4D spatial tensors (batch, C, H, W).
        # reshape_transform converts ViT patch tokens to a spatial grid,
        # which GradCAM can then pool to produce the 2D heatmap.
        def reshape_transform(tensor):
            # tensor: (batch, seq_len, hidden_dim)
            # seq_len = 1 CLS token + num_patches
            patches = tensor[:, 1:, :]                        # drop CLS → (B, P, D)
            n = patches.shape[1]
            h = w = int(math.sqrt(n))                         # assume square patch grid
            patches = patches.reshape(patches.size(0), h, w, patches.size(2))
            return patches.permute(0, 3, 1, 2)                # → (B, D, h, w) ✓

        # Wrapper returns full hidden state (all tokens) so reshape_transform works.
        class _VisionWrapper(nn.Module):
            def __init__(self, vm):
                super().__init__()
                self.vm = vm
            def forward(self, pixel_values):
                return self.vm(pixel_values=pixel_values).last_hidden_state

        # Target: mean of the CLS token features → scalar per sample.
        class _CLSTarget:
            def __call__(self, output):
                return output[:, 0, :].mean(dim=-1)

        wrapper = _VisionWrapper(_model.vision_model)
        target_layer = _model.vision_model.encoder.layers[-1].layer_norm2

        cam = GradCAM(
            model=wrapper,
            target_layers=[target_layer],
            reshape_transform=reshape_transform,
        )

        pixel_values = inputs["pixel_values"].to(_device).float()
        grayscale_cam = cam(input_tensor=pixel_values, targets=[_CLSTarget()])[0]

        cam_resized = cv2.resize(grayscale_cam, (image.width, image.height))
        img_np = np.array(image).astype(np.float32) / 255.0
        visualization = show_cam_on_image(img_np, cam_resized, use_rgb=True)

        pil_out = Image.fromarray(visualization)
        buf = io.BytesIO()
        pil_out.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        logger.warning(f"GradCAM failed: {e}")
        return _image_to_b64(image)


def _image_to_b64(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")
