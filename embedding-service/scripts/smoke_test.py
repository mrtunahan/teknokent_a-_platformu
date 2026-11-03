"""Çalışan servise karşı duman testi: anlamca yakın Türkçe cümleler, ilgisizlerden daha benzer olmalı.

Kullanım: python3 scripts/smoke_test.py http://127.0.0.1:8000
"""
import json
import math
import sys
import urllib.request

url = sys.argv[1].rstrip("/")
texts = [
    "Üretim hattında görüntü işleme ile otomatik kalite kontrol ve hata tespiti",
    "Kamera tabanlı yapay zekâ ile fabrikada kusurlu ürünlerin tespit edilmesi",
    "Restoranlar için online sipariş ve paket servis mobil uygulaması",
]
req = urllib.request.Request(
    f"{url}/embed", data=json.dumps({"texts": texts}).encode(), headers={"content-type": "application/json"}
)
body = json.load(urllib.request.urlopen(req, timeout=60))
a, b, c = body["embeddings"]


def cos(x, y):
    return sum(i * j for i, j in zip(x, y)) / (math.sqrt(sum(i * i for i in x)) * math.sqrt(sum(j * j for j in y)))


ab, ac = cos(a, b), cos(a, c)
print(f"model={body['model']} dim={body['dimension']} yakın={ab:.3f} ilgisiz={ac:.3f}")
assert body["dimension"] == len(a) > 0
assert ab > ac + 0.15, "Anlamca yakın cümleler yeterince benzer bulunmadı"
print("OK")
