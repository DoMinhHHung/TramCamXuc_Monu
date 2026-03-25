import amqplib from 'amqplib';
import { uploadJsonl } from './minio';

const SONG_LISTEN_FANOUT = 'song.listen.fanout.exchange';
const FEED_CONTENT_FANOUT = 'feed.content.fanout.exchange';
const LISTEN_HISTORY_QUEUE = 'listen.history.queue';
const AI_DATALAKE_QUEUE = 'listen.ai.datalake.queue';
const FEED_SOCIAL_QUEUE = 'feed.social.queue';

const FLUSH_SIZE = 500;
const FLUSH_INTERVAL_MS = 60_000;

let aiBuffer: unknown[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function flushAiBuffer() {
  if (aiBuffer.length === 0) return;
  const batch = aiBuffer.splice(0, FLUSH_SIZE);
  try {
    const jsonl = batch.map((e) => JSON.stringify(e)).join('\n') + '\n';
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const prefix = `${now.getUTCFullYear()}/${pad(now.getUTCMonth() + 1)}/${pad(now.getUTCDate())}/${pad(now.getUTCHours())}/${pad(now.getUTCMinutes())}`;
    const objectKey = `listen-events/${prefix}/batch-${Date.now()}-${crypto.randomUUID()}.jsonl`;
    await uploadJsonl(objectKey, jsonl);
  } catch (err) {
    console.error('[ai-datalake] Flush failed, re-queuing', err);
    aiBuffer.unshift(...batch);
  }
}

export async function initRabbitMQ() {
  const host = process.env.RABBITMQ_HOST;
  if (!host) {
    console.warn('[rabbitmq] Not configured, skipping');
    return;
  }

  const vhost = encodeURIComponent(process.env.RABBITMQ_VHOST ?? '/');
  const url = `amqp://${process.env.RABBITMQ_USERNAME}:${process.env.RABBITMQ_PASSWORD}@${host}:${process.env.RABBITMQ_PORT ?? 5672}/${vhost}`;

  let conn: Awaited<ReturnType<typeof amqplib.connect>>;
  try {
    conn = await amqplib.connect(url);
  } catch (err) {
    console.error('[rabbitmq] Connect failed, retry in 10s', err);
    setTimeout(initRabbitMQ, 10_000);
    return;
  }

  try {
    const ch = await conn.createChannel();
    await ch.prefetch(10);

    await ch.assertExchange(SONG_LISTEN_FANOUT, 'fanout', { durable: true });
    await ch.assertExchange(FEED_CONTENT_FANOUT, 'fanout', { durable: true });

    await ch.assertQueue(LISTEN_HISTORY_QUEUE, { durable: true });
    await ch.assertQueue(AI_DATALAKE_QUEUE, { durable: true });
    await ch.assertQueue(FEED_SOCIAL_QUEUE, { durable: true });

    await ch.bindQueue(LISTEN_HISTORY_QUEUE, SONG_LISTEN_FANOUT, '');
    await ch.bindQueue(AI_DATALAKE_QUEUE, SONG_LISTEN_FANOUT, '');
    await ch.bindQueue(FEED_SOCIAL_QUEUE, FEED_CONTENT_FANOUT, '');

    const { recordListenFromEvent, createFeedPostFromEvent } = await import('./social/mutations');

    ch.consume(LISTEN_HISTORY_QUEUE, async (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString());
        await recordListenFromEvent(event);
        ch.ack(msg);
      } catch (err) {
        console.error('[rabbitmq] listen-history error', err);
        ch.nack(msg, false, false);
      }
    });

    ch.consume(AI_DATALAKE_QUEUE, async (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString());
        aiBuffer.push(event);
        if (aiBuffer.length >= FLUSH_SIZE) await flushAiBuffer();
        ch.ack(msg);
      } catch (err) {
        console.error('[rabbitmq] ai-datalake error', err);
        ch.nack(msg, false, false);
      }
    });

    ch.consume(FEED_SOCIAL_QUEUE, async (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString());
        await createFeedPostFromEvent(event);
        ch.ack(msg);
      } catch (err) {
        console.error('[rabbitmq] feed-social error', err);
        ch.nack(msg, false, false);
      }
    });

    flushTimer = setInterval(flushAiBuffer, FLUSH_INTERVAL_MS);
    console.log('[rabbitmq] Connected and consuming 3 queues');

    conn.on('error', (err) => console.error('[rabbitmq] Connection error', err));
    conn.on('close', () => {
      console.warn('[rabbitmq] Connection closed, reconnecting in 5s');
      if (flushTimer) clearInterval(flushTimer);
      flushTimer = null;
      setTimeout(initRabbitMQ, 5_000);
    });
  } catch (err) {
    console.error('[rabbitmq] Channel setup failed', err);
    try { conn.close(); } catch {}
    setTimeout(initRabbitMQ, 10_000);
  }
}
