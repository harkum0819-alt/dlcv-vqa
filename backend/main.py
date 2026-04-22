"""
VQA-Insight FastAPI Backend
Endpoints:
  POST /api/predict          — local BLIP model
  POST /api/predict-advanced — HF Inference API (large model)
  POST /api/compare          — run both models simultaneously
  POST /api/chat             — conversational VQA (context-grounded multi-turn)
  GET  /api/chat/{chat_id}   — get conversation history for a chat session
  DELETE /api/chat/{chat_id} — clear a conversation
  GET  /api/status           — health + model status
"""
import os
import uuid
import time
import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from utils.image_utils import bytes_to_pil, pil_to_b64
from models import blip_local, hf_api

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="VQA-Insight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session history (keyed by session_id)
_history: dict[str, list] = {}

# Conversational chat sessions: chat_id → {messages, image_b64}
_chats: dict[str, dict] = {}


@app.get("/api/status")
async def status():
    """Health check + model availability."""
    return {
        "status": "ok",
        "local_model": os.getenv("LOCAL_MODEL_ID", "Salesforce/blip-vqa-base"),
        "advanced_model": os.getenv("HF_MODEL_ID", "Salesforce/blip2-opt-2.7b"),
        "advanced_available": hf_api.is_configured(),
        "device": "cuda" if _cuda_available() else "cpu",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/predict")
async def predict(
    image: UploadFile = File(...),
    question: str = Form(...),
    session_id: str = Form(default="default"),
):
    """Run local BLIP model — fast, no API token needed."""
    _validate_question(question)
    img_bytes = await image.read()
    pil_img = bytes_to_pil(img_bytes)

    start = time.time()
    result = await asyncio.to_thread(blip_local.predict, pil_img, question)
    elapsed = round(time.time() - start, 2)

    entry = _make_entry(question, result, elapsed, pil_img, "local")
    _push_history(session_id, entry)

    return JSONResponse(content={**entry, "elapsed_seconds": elapsed})


@app.post("/api/predict-advanced")
async def predict_advanced(
    image: UploadFile = File(...),
    question: str = Form(...),
    session_id: str = Form(default="default"),
):
    """Run advanced model via HuggingFace Inference API."""
    _validate_question(question)
    img_bytes = await image.read()
    pil_img = bytes_to_pil(img_bytes)

    start = time.time()
    result = await asyncio.to_thread(hf_api.predict, pil_img, question)
    elapsed = round(time.time() - start, 2)

    entry = _make_entry(question, result, elapsed, pil_img, "advanced")
    _push_history(session_id, entry)

    return JSONResponse(content={**entry, "elapsed_seconds": elapsed})


@app.post("/api/compare")
async def compare(
    image: UploadFile = File(...),
    question: str = Form(...),
    session_id: str = Form(default="default"),
):
    """Run both models in parallel and return side-by-side results."""
    _validate_question(question)
    img_bytes = await image.read()
    pil_img = bytes_to_pil(img_bytes)

    start = time.time()
    local_task = asyncio.to_thread(blip_local.predict, pil_img, question)
    api_task = asyncio.to_thread(hf_api.predict, pil_img, question)
    local_result, api_result = await asyncio.gather(local_task, api_task)
    elapsed = round(time.time() - start, 2)

    img_b64 = pil_to_b64(pil_img)
    response = {
        "question": question,
        "image_b64": img_b64,
        "local": {
            "answer": local_result["answer"],
            "confidence": local_result["confidence"],
            "attention_map": local_result.get("attention_map"),
            "model": local_result["model"],
        },
        "advanced": {
            "answer": api_result["answer"],
            "confidence": api_result["confidence"],
            "attention_map": api_result.get("attention_map"),
            "model": api_result["model"],
            "error": api_result.get("error"),
        },
        "elapsed_seconds": elapsed,
    }

    _push_history(session_id, {**response, "mode": "compare", "id": str(uuid.uuid4())})
    return JSONResponse(content=response)


@app.post("/api/chat")
async def chat(
    image: UploadFile = File(None),
    question: str = Form(...),
    chat_id: str = Form(default=""),
):
    """
    Conversational VQA — multi-turn Q&A about a single image.
    - First turn: send image + question → get chat_id back
    - Follow-up turns: send chat_id + question (no image needed)
    Context from previous turns is injected into the BLIP prompt.
    """
    _validate_question(question)

    if chat_id and chat_id in _chats:
        # Follow-up turn — reuse stored image
        session = _chats[chat_id]
        pil_img = bytes_to_pil(
            __import__("base64").b64decode(session["image_b64_raw"])
        )
    elif image:
        # First turn — store image
        img_bytes = await image.read()
        pil_img = bytes_to_pil(img_bytes)
        chat_id = str(uuid.uuid4())
        _chats[chat_id] = {
            "image_b64": pil_to_b64(pil_img),
            "image_b64_raw": __import__("base64").b64encode(
                img_bytes
            ).decode(),
            "messages": [],
        }
    else:
        raise HTTPException(status_code=400, detail="Provide image on first turn or valid chat_id for follow-up.")

    session  = _chats[chat_id]
    history  = session["messages"]

    start  = time.time()
    result = await asyncio.to_thread(
        blip_local.predict_with_context, pil_img, question, history
    )
    elapsed = round(time.time() - start, 2)

    # Build the attention map only on first turn (saves time on follow-ups)
    msg = {
        "id":           str(uuid.uuid4()),
        "role":         "user",
        "content":      question,
        "timestamp":    datetime.utcnow().isoformat(),
    }
    ai_msg = {
        "id":            str(uuid.uuid4()),
        "role":          "assistant",
        "content":       result["answer"],
        "confidence":    result["confidence"],
        "attention_map": result.get("attention_map"),
        "elapsed":       elapsed,
        "timestamp":     datetime.utcnow().isoformat(),
    }

    session["messages"].append({"question": question, "answer": result["answer"]})

    return JSONResponse(content={
        "chat_id":      chat_id,
        "image_b64":    session["image_b64"],
        "user_msg":     msg,
        "ai_msg":       ai_msg,
        "turn":         len(session["messages"]),
        "model":        result["model"],
    })


@app.get("/api/chat/{chat_id}")
async def get_chat(chat_id: str):
    """Return full conversation history for a chat session."""
    if chat_id not in _chats:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    session = _chats[chat_id]
    return JSONResponse(content={
        "chat_id":   chat_id,
        "image_b64": session["image_b64"],
        "messages":  session["messages"],
        "turns":     len(session["messages"]),
    })


@app.delete("/api/chat/{chat_id}")
async def clear_chat(chat_id: str):
    """Delete a conversation session."""
    _chats.pop(chat_id, None)
    return {"cleared": True}


@app.get("/api/history/{session_id}")
async def history(session_id: str):
    """Return Q&A history for a session."""
    return JSONResponse(content={"history": _history.get(session_id, [])})


@app.delete("/api/history/{session_id}")
async def clear_history(session_id: str):
    """Clear session history."""
    _history.pop(session_id, None)
    return {"cleared": True}


# ── helpers ──────────────────────────────────────────────────────────────────

def _validate_question(q: str):
    q = q.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if len(q) > 500:
        raise HTTPException(status_code=400, detail="Question too long (max 500 chars).")


def _make_entry(question: str, result: dict, elapsed: float, pil_img, mode: str) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "question": question,
        "answer": result["answer"],
        "confidence": result["confidence"],
        "attention_map": result.get("attention_map"),
        "model": result["model"],
        "device": result.get("device", "api"),
        "mode": mode,
        "image_b64": pil_to_b64(pil_img),
        "timestamp": datetime.utcnow().isoformat(),
        "error": result.get("error"),
    }


def _push_history(session_id: str, entry: dict):
    if session_id not in _history:
        _history[session_id] = []
    _history[session_id].insert(0, entry)
    _history[session_id] = _history[session_id][:50]  # keep last 50


def _cuda_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
