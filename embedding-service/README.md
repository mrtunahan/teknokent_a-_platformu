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

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu   # yalnızca CPU sürümü (çok daha küçük)
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

İlk açılışta model (~470 MB) internetten indirilir ve önbelleğe alınır; servis ~1 GB bellek kullanır.
Sunucuda kalıcı çalıştırmak için `pm2 start ".venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000" --name teknoortak-embedding`
veya bir systemd servisi kullanın. Servis isteğe bağlıdır: çalışmıyorsa API yerleşik metin benzerliğine düşer.

Model indirmeden denemek için `EMBEDDING_BACKEND=hashing` (yalnızca geliştirme/test; anlamsal değildir).

## Testler

```bash
pip install -r requirements-dev.txt
pytest
```
