"""TeknoOrtak embedding servisi.

Sözleşme (Node.js API tarafından kullanılır):
    POST /embed   {"texts": ["...", ...]}  ->  {"embeddings": [[...], ...], "model": "...", "dimension": N}
    GET  /health  ->  {"status": "ok", "model": "...", "dimension": N}

Ortam değişkenleri:
    EMBEDDING_BACKEND   sentence-transformers (varsayılan) | hashing
    EMBEDDING_MODEL     varsayılan: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
    EMBEDDING_DEVICE    cpu | cuda (boşsa otomatik)
    EMBEDDING_API_KEY   ayarlanırsa istekler "x-api-key" başlığı ile gelmelidir
    MAX_TEXTS           tek istekteki en fazla metin (varsayılan 64)
    MAX_CHARS           metin başına en fazla karakter; fazlası kırpılır (varsayılan 4000)
"""
from __future__ import annotations

import hmac
import logging
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from .encoders import Encoder, HashingEncoder, SentenceTransformerEncoder

log = logging.getLogger("embedding-service")

DEFAULT_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
MAX_TEXTS = int(os.getenv("MAX_TEXTS", "64"))
MAX_CHARS = int(os.getenv("MAX_CHARS", "4000"))


def build_encoder() -> Encoder:
    backend = os.getenv("EMBEDDING_BACKEND", "sentence-transformers")
    if backend == "hashing":
        return HashingEncoder(int(os.getenv("HASHING_DIMENSION", "384")))
    return SentenceTransformerEncoder(
        os.getenv("EMBEDDING_MODEL", DEFAULT_MODEL),
        device=os.getenv("EMBEDDING_DEVICE") or None,
    )


state: dict[str, Encoder] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if "encoder" not in state:
        state["encoder"] = build_encoder()
        log.info("Model yüklendi: %s (%d boyut)", state["encoder"].model_name, state["encoder"].dimension)
    yield


app = FastAPI(title="TeknoOrtak Embedding Service", version="1.0.0", lifespan=lifespan)


def check_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.getenv("EMBEDDING_API_KEY", "")
    if expected and not hmac.compare_digest(x_api_key or "", expected):
        raise HTTPException(status_code=401, detail="Geçersiz API anahtarı.")


class EmbedRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimension: int


@app.get("/health")
def health():
    enc = state.get("encoder")
    if enc is None:
        raise HTTPException(status_code=503, detail="Model yükleniyor.")
    return {"status": "ok", "model": enc.model_name, "dimension": enc.dimension}


@app.post("/embed", response_model=EmbedResponse, dependencies=[Depends(check_api_key)])
async def embed(req: EmbedRequest) -> EmbedResponse:
    if len(req.texts) > MAX_TEXTS:
        raise HTTPException(status_code=413, detail=f"Tek istekte en fazla {MAX_TEXTS} metin gönderilebilir.")
    enc = state["encoder"]
    texts = [(t or "").strip()[:MAX_CHARS] for t in req.texts]
    # Model çağrısı CPU yoğun; olay döngüsünü bloklamamak için iş parçacığında çalıştır
    vectors = await run_in_threadpool(enc.encode, texts)
    # Boş metin için sıfır vektör (benzerlik hesabında 0 sayılır)
    vectors = [v if t else [0.0] * enc.dimension for v, t in zip(vectors, texts)]
    return EmbedResponse(embeddings=vectors, model=enc.model_name, dimension=enc.dimension)
