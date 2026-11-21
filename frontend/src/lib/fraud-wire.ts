/*
 File: frontend/src/lib/fraud-wire.ts
 Description: پوشش NBZ1 فریم ضدتقلب روی سیم (هم‌تراز FraudFrameWireCodec بک)
 Parent Dependencies: none
 */

const MAGIC = new TextEncoder().encode("NBZ1");
const NONCE_LEN = 16;

function base64UrlToBytes(input: string): Uint8Array {
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

async function xorKeystream(
  data: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array
): Promise<Uint8Array> {
  const out = new Uint8Array(data.length);
  let offset = 0;
  let counter = 0;
  while (offset < data.length) {
    const material = new Uint8Array(key.length + nonce.length + 4);
    material.set(key, 0);
    material.set(nonce, key.length);
    const view = new DataView(material.buffer);
    // هم‌تراز BitConverter روی little-endian (ویندوز/لینوکس دات‌نت)
    view.setInt32(key.length + nonce.length, counter, true);
    const block = await sha256(material);
    const n = Math.min(32, data.length - offset);
    for (let i = 0; i < n; i++) out[offset + i] = data[offset + i]! ^ block[i]!;
    offset += n;
    counter++;
  }
  return out;
}

/** JPEG خام → envelope مبهم برای آپلود .bin */
export async function wrapFraudJpeg(jpeg: Uint8Array, wrapKeyBase64Url: string): Promise<Uint8Array> {
  if (jpeg.length < 3 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8 || jpeg[2] !== 0xff) {
    throw new Error("بدنه باید JPEG معتبر باشد.");
  }
  const key = base64UrlToBytes(wrapKeyBase64Url.trim());
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LEN));
  const body = await xorKeystream(jpeg, key, nonce);
  const result = new Uint8Array(MAGIC.length + NONCE_LEN + body.length);
  result.set(MAGIC, 0);
  result.set(nonce, MAGIC.length);
  result.set(body, MAGIC.length + NONCE_LEN);
  return result;
}

export function randomOpaqueBinName(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return `${hex}.bin`;
}
