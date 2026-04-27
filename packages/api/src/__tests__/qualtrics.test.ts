import Fastify from 'fastify';
import { afterAll, describe, expect, it } from 'vitest';

import { testPrisma } from './setup.js';

describe('qualtrics webhook route', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalWebhookOnly = process.env.WEBHOOK_ONLY;

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.WEBHOOK_ONLY = originalWebhookOnly;
  });

  it('persists participant config when WEBHOOK_ONLY is false', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || originalDatabaseUrl;
    process.env.WEBHOOK_ONLY = 'false';

    const { default: qualtricsRoutes } = await import('../routes/qualtrics.js');
    const app = Fastify();

    await app.register(qualtricsRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/qualtrics-webhook',
      payload: {
        ExternalID: 'participant-123',
        responses: {
          party: 'Generally speaking, do you usually think of yourself as a Republican, a Democrat, an Independent, or what?',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      participantId: 'participant-123',
      persisted: true,
    });

    const config = await testPrisma.participantConfig.findUnique({
      where: { externalId: 'participant-123' },
    });

    expect(config).not.toBeNull();
    expect(config?.externalId).toBe('participant-123');
    expect(config?.personaLean).toBeTypeOf('string');

    await app.close();
  });
});
