import math
import os

os.environ["EMBEDDING_BACKEND"] = "hashing"

import pytest
from fastapi.testclient import TestClient

from app.main import app


def cos(a, b):
    return sum(x * y for x, y in zip(a, b)) / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)) or 1)


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.delenv("EMBEDDING_API_KEY", raising=False)
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["dimension"] == 384


def test_embed_shape_and_normalization(client):
    r = client.post("/embed", json={"texts": ["Endüstriyel görüntü işleme", "saha testi"]})
    assert r.status_code == 200
    body = r.json()
    assert len(body["embeddings"]) == 2
    assert all(len(v) == body["dimension"] for v in body["embeddings"])
    assert math.isclose(math.sqrt(sum(x * x for x in body["embeddings"][0])), 1.0, rel_tol=1e-6)


def test_similar_texts_are_closer(client):
    texts = [
        "endüstriyel kalite kontrol için hata tespiti",
        "kalite kontrolünde hata tespit modeli",
        "mobil oyun geliştirme stüdyosu",
    ]
    a, b, c = client.post("/embed", json={"texts": texts}).json()["embeddings"]
    assert cos(a, b) > cos(a, c)


def test_turkish_normalization(client):
    a, b = client.post("/embed", json={"texts": ["GÖRÜNTÜ İŞLEME", "görüntü işleme"]}).json()["embeddings"]
    assert cos(a, b) > 0.99


def test_empty_text_returns_zero_vector(client):
    v = client.post("/embed", json={"texts": ["", "metin"]}).json()["embeddings"][0]
    assert all(x == 0 for x in v)


def test_validation_and_limits(client):
    assert client.post("/embed", json={"texts": []}).status_code == 422
    assert client.post("/embed", json={}).status_code == 422
    assert client.post("/embed", json={"texts": ["x"] * 65}).status_code == 413


def test_api_key(client, monkeypatch):
    monkeypatch.setenv("EMBEDDING_API_KEY", "gizli")
    assert client.post("/embed", json={"texts": ["x"]}).status_code == 401
    assert client.post("/embed", json={"texts": ["x"]}, headers={"x-api-key": "yanlis"}).status_code == 401
    assert client.post("/embed", json={"texts": ["x"]}, headers={"x-api-key": "gizli"}).status_code == 200
