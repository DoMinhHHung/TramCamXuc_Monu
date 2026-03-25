import { MongoClient, Db } from 'mongodb';

const globalForMongo = globalThis as unknown as { _mongoClient?: MongoClient };

export async function getDb(): Promise<Db> {
  if (globalForMongo._mongoClient) return globalForMongo._mongoClient.db();

  const uri = process.env.MONGODB_URI ?? '';
  if (!uri) throw new Error('Missing MONGODB_URI');

  const client = new MongoClient(uri, { maxPoolSize: 20 });
  await client.connect();
  globalForMongo._mongoClient = client;
  return client.db();
}
