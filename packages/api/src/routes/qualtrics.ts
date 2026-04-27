import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

function extractExternalId(body: any): string | null {
  // Match the Qualtrics key name first, then fall back to common variants.
  if (!body) return null;
  if (typeof body === 'string') return body;
  if (body.ExternalID) return body.ExternalID;
  if (body.externalId) return body.externalId;
  if (body.ExternalDataReference) return body.ExternalDataReference;
  if (body.payload?.ExternalID) return body.payload.ExternalID;
  if (body.data?.ExternalID) return body.data.ExternalID;
  return null;
}

function findPartyIdentification(body: any): string | null {
  if (!body) return null;

  const searchIn = (obj: unknown): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    for (const key of Object.keys(obj)) {
      const lower = String(key).toLowerCase();
      if (lower.includes('generally') && lower.includes('think of yourself')) {
        const value = (obj as Record<string, unknown>)[key];
        return typeof value === 'string' ? value : null;
      }
      // Some payloads include question text as values inside arrays
      const val = (obj as Record<string, unknown>)[key];
      if (typeof val === 'string') {
        if (val.includes('Generally speaking') && val.includes('think of yourself')) {
          return val;
        }
      }
      if (typeof val === 'object') {
        const nested = searchIn(val);
        if (nested) return nested;
      }
    }
    return null;
  };

  // First try top-level
  const top = searchIn(body);
  if (top) return top;

  // Try common payload containers
  if (body.payload) return searchIn(body.payload);
  if (body.data) return searchIn(body.data);
  if (body.responses) return searchIn(body.responses);

  return null;
}

function mapAnswerToPersonaLean(answer: string | null): 'liberal' | 'conservative' {
  if (!answer) return Math.random() < 0.5 ? 'liberal' : 'conservative';
  const lower = answer.toLowerCase();
  if (lower.includes('democrat')) return 'conservative';
  if (lower.includes('republican')) return 'liberal';
  if (lower.includes('independent') || lower.includes('other')) return Math.random() < 0.5 ? 'liberal' : 'conservative';
  return Math.random() < 0.5 ? 'liberal' : 'conservative';
}

async function qualtricsRoutes(fastify: FastifyInstance) {
  const webhookOnly = process.env.WEBHOOK_ONLY === 'true';

  // Accept webhook POSTs from Qualtrics
  fastify.post('/qualtrics-webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    const participantId = extractExternalId(body);
    if (!participantId) {
      fastify.log.warn({ body }, 'Qualtrics webhook missing ExternalID');
      return reply.status(400).send({ error: 'missing ExternalID' });
    }

    try {
      const answer = findPartyIdentification(body);
      const personaLean = mapAnswerToPersonaLean(answer);
      const metadata = {
        answer,
        payload: body,
        receivedAt: new Date().toISOString(),
      };

      if (!webhookOnly) {
        const { prisma } = await import('@workspace/database');
        await prisma.participantConfig.upsert({
          where: { externalId: participantId },
          create: {
            externalId: participantId,
            personaLean,
            metadata,
          },
          update: {
            personaLean,
            metadata,
          },
        });
      }

      fastify.log.info(
        { participantId, payload: body.payload ?? null, answer, personaLean, persisted: !webhookOnly },
        'Received Qualtrics webhook payload'
      );

      return reply.status(200).send({
        success: true,
        participantId,
        personaLean,
        persisted: !webhookOnly,
        message: webhookOnly
          ? 'Qualtrics payload received'
          : 'Qualtrics payload received and participant config saved',
      });
    } catch (err) {
      fastify.log.error({ err, participantId }, 'Failed to process Qualtrics webhook');
      return reply.status(500).send({ error: 'webhook_error' });
    }
  });
}

export default qualtricsRoutes;
