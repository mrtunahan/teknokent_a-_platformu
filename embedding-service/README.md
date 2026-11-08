# TeknoOrtak Embedding Servisi

Firma "arıyorum" ve "sunuyorum" metinlerini vektöre çeviren küçük bir FastAPI servisi. Node.js API
`EMBEDDING_SERVICE_URL` ile buna bağlanır; profil değişince ve gece işinde firmaların vektörlerini günceller.
Uyum skorundaki "yetkinlik ↔ ihtiyaç" bileşeninin metin kısmı bu vektörlerin kosinüs benzerliğidir.

Varsayılan model: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (Türkçe dahil 50+ dil, 384 boyut,
CPU'da hızlı). Daha isabetli ama daha ağır bir alternatif: `intfloat/multilingual-e5-base` (768 boyut).
Model değişirse vektör boyutu değişir; ardından API tarafında `npm run reembed` çalıştırın.

## API

```
POST /embed   {"texts": ["...", "..."]}  ->  {"embeddings": [[...]], "model": "...", "dimension": 384}
GET  /health
```

`EMBEDDING_API_KEY` ayarlanırsa istekler `x-api-key` başlığı taşımalıdır (Node.js tarafında aynı değişken).

## Çalıştırma

Docker (önerilen; model imaja gömülür, ilk derleme birkaç dakika sürer):

```bash
docker build -t teknoortak-embedding .
docker run -p 8000:8000 teknoortak-embedding
```

Yerel:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Model indirmeden denemek için `EMBEDDING_BACKEND=hashing` (yalnızca geliştirme/test; anlamsal değildir).

## Testler

```bash
pip install -r requirements-dev.txt
pytest
```
