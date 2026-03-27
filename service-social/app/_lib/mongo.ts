import { MongoClient, Db } from 'mongodb';

const globalForMongo = globalThis as unknown as { _mongoClient?: MongoClient };

function normalizeMongoUri(raw: string): string {
  let s = raw.trim();
  if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export async function getDb(): Promise<Db> {
  if (globalForMongo._mongoClient) return globalForMongo._mongoClient.db();

  const uri = normalizeMongoUri(process.env.MONGODB_URI ?? '');
  if (!uri) throw new Error('Missing MONGODB_URI');

  const client = new MongoClient(uri, { maxPoolSize: 20 });
  await client.connect();
  globalForMongo._mongoClient = client;
  return client.db();
}
