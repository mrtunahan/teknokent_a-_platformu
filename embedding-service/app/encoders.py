"""Metin kodlayıcılar.

- ``SentenceTransformerEncoder``: gerçek model (varsayılan: Türkçe destekli çok dilli MiniLM).
- ``HashingEncoder``: modelsiz, deterministik yedek (geliştirme ve testler için). Anlamsal değil,
  kelime/alt-kelime örtüşmesini yakalar; üretimde kullanılmamalıdır.
"""
from __future__ import annotations

import hashlib
import math
import re
import unicodedata
from typing import Protocol, Sequence


class Encoder(Protocol):
    model_name: str
    dimension: int

    def encode(self, texts: Sequence[str]) -> list[list[float]]: ...


class SentenceTransformerEncoder:
    def __init__(self, model_name: str, device: str | None = None, batch_size: int = 32) -> None:
        from sentence_transformers import SentenceTransformer  # ağır bağımlılık: yalnızca gerektiğinde

        self.model_name = model_name
        self.batch_size = batch_size
        self._model = SentenceTransformer(model_name, device=device)
        self.dimension = int(self._model.get_sentence_embedding_dimension())

    def encode(self, texts: Sequence[str]) -> list[list[float]]:
        vectors = self._model.encode(
            list(texts),
            batch_size=self.batch_size,
            normalize_embeddings=True,  # kosinüs benzerliği = iç çarpım
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        return [[float(x) for x in v] for v in vectors]


_TOKEN = re.compile(r"[a-z0-9]+")


def _normalize(text: str) -> str:
    text = text.replace("I", "ı").replace("İ", "i").lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return text.replace("ı", "i")


class HashingEncoder:
    """Kelime ve karakter 3-gram'larını sabit boyutlu vektöre hash'ler (L2 normalize)."""

    def __init__(self, dimension: int = 384) -> None:
        self.model_name = f"hashing-{dimension}"
        self.dimension = dimension

    def _features(self, text: str) -> list[str]:
        tokens = _TOKEN.findall(_normalize(text))
        feats = [f"w:{t[:6]}" for t in tokens]
        for t in tokens:
            padded = f"#{t}#"
            feats.extend(f"c:{padded[i:i + 3]}" for i in range(len(padded) - 2))
        return feats

    def encode(self, texts: Sequence[str]) -> list[list[float]]:
        out = []
        for text in texts:
            vec = [0.0] * self.dimension
            for f in self._features(text or ""):
                h = int.from_bytes(hashlib.blake2b(f.encode(), digest_size=8).digest(), "little")
                vec[h % self.dimension] += -1.0 if (h >> 63) & 1 else 1.0
            norm = math.sqrt(sum(x * x for x in vec))
            out.append([x / norm for x in vec] if norm else vec)
        return out
