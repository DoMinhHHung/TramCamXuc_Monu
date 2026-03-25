import { Client } from 'minio';

const globalForMinio = globalThis as unknown as { _minioClient?: Client };

function getMinioClient(): Client | null {
  const endpoint = process.env.MINIO_ENDPOINT;
  if (!endpoint) return null;
  if (globalForMinio._minioClient) return globalForMinio._minioClient;

  try {
    const url = new URL(endpoint);
    const client = new Client({
      endPoint: url.hostname,
      port: Number(url.port) || (url.protocol === 'https:' ? 443 : 9000),
      useSSL: url.protocol === 'https:',
      accessKey: process.env.MINIO_ACCESS_KEY ?? '',
      secretKey: process.env.MINIO_SECRET ?? '',
    });
    globalForMinio._minioClient = client;
    return client;
  } catch {
    return null;
  }
}

export async function uploadJsonl(objectKey: string, payload: string): Promise<void> {
  const client = getMinioClient();
  if (!client) return;

  const bucket = process.env.MINIO_AI_BUCKET ?? 'ai-training-data';

  try {
    const exists = await client.bucketExists(bucket);
    if (!exists) await client.makeBucket(bucket, '');
  } catch {}

  const buffer = Buffer.from(payload, 'utf-8');
  await client.putObject(bucket, objectKey, buffer, buffer.length, {
    'Content-Type': 'application/x-ndjson',
  });
  console.log(`[minio] Uploaded ${bucket}/${objectKey} (${buffer.length} bytes)`);
}
