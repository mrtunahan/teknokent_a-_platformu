/**
 * Dosya depolama soyutlaması: yerel disk veya S3 uyumlu nesne deposu.
 * Dosyalar her zaman API üzerinden servis edilir (bucket'ın herkese açık olması gerekmez):
 *   logolar   -> GET /files/logos/:name           (herkese açık)
 *   belgeler  -> GET /api/v1/companies/:id/certificates/:certId/document  (yalnızca onaylı firmalar)
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

let s3 = null;
function s3Client() {
  if (!s3) {
    // eslint-disable-next-line global-require
    const { S3Client } = require('@aws-sdk/client-s3');
    const c = config.storage.s3;
    s3 = new S3Client({
      region: c.region,
      endpoint: c.endpoint,
      forcePathStyle: c.forcePathStyle,
      credentials: c.accessKeyId ? { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } : undefined,
    });
  }
  return s3;
}

const isS3 = () => config.storage.driver === 's3';

/** Anahtar yalnızca [a-z0-9/._-] içerebilir; dizin dışına çıkmayı engeller. */
function safeKey(key) {
  if (!/^[a-z0-9][a-z0-9/._-]*$/i.test(key) || key.includes('..')) throw new Error('Geçersiz dosya anahtarı.');
  return key;
}

const newKey = (prefix, ext) => `${prefix}/${Date.now().toString(36)}-${crypto.randomBytes(12).toString('hex')}.${ext}`;

async function put(key, buffer, contentType) {
  safeKey(key);
  if (isS3()) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3'); // eslint-disable-line global-require
    await s3Client().send(new PutObjectCommand({
      Bucket: config.storage.s3.bucket, Key: key, Body: buffer, ContentType: contentType,
    }));
  } else {
    const file = path.join(config.storage.localDir, key);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(file, buffer);
  }
  return key;
}

/** @returns {Promise<{stream: NodeJS.ReadableStream, contentType?: string, size?: number}|null>} */
async function get(key) {
  safeKey(key);
  if (isS3()) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3'); // eslint-disable-line global-require
    try {
      const r = await s3Client().send(new GetObjectCommand({ Bucket: config.storage.s3.bucket, Key: key }));
      return { stream: r.Body, contentType: r.ContentType, size: r.ContentLength };
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  }
  const file = path.join(config.storage.localDir, key);
  try {
    const st = await fsp.stat(file);
    return { stream: fs.createReadStream(file), size: st.size };
  } catch {
    return null;
  }
}

async function remove(key) {
  if (!key) return;
  safeKey(key);
  if (isS3()) {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3'); // eslint-disable-line global-require
    await s3Client().send(new DeleteObjectCommand({ Bucket: config.storage.s3.bucket, Key: key }));
  } else {
    await fsp.rm(path.join(config.storage.localDir, key), { force: true });
  }
}

/** İçerikten (magic bytes) dosya türü tespiti — istemcinin bildirdiği MIME türüne güvenilmez. */
function sniff(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { ext: 'png', mime: 'image/png' };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  if (buf.toString('ascii', 0, 5) === '%PDF-') return { ext: 'pdf', mime: 'application/pdf' };
  return null;
}

module.exports = {
  put, get, remove, sniff, newKey, safeKey,
};
