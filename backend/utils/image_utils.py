import io
import base64
from PIL import Image


def bytes_to_pil(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGB")


def pil_to_b64(image: Image.Image, fmt: str = "JPEG") -> str:
    buf = io.BytesIO()
    image.save(buf, format=fmt, quality=88)
    return base64.b64encode(buf.getvalue()).decode("utf-8")
