export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { rebuildFamousArtistsCache } = await import('./app/_lib/social/mutations');
      await rebuildFamousArtistsCache();
    } catch (err) {
      console.warn('[instrumentation] Famous cache rebuild failed:', err);
    }

    try {
      const { initRabbitMQ } = await import('./app/_lib/rabbitmq');
      await initRabbitMQ();
    } catch (err) {
      console.warn('[instrumentation] RabbitMQ init failed:', err);
    }
  }
}
