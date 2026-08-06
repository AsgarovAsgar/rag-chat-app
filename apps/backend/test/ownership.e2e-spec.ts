import './env';
import request from 'supertest';
import { createTestApp, resetDatabase, TestApp } from './app';

const A = { email: 'a@example.com', password: 'password123' };
const B = { email: 'b@example.com', password: 'password123' };

describe('ownership and tenant isolation', () => {
  let ctx: TestApp;
  let agentA: ReturnType<typeof request.agent>;
  let agentB: ReturnType<typeof request.agent>;
  let userAId: string;
  let documentAId: string;
  let conversationAId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.pool);

    agentA = request.agent(ctx.server);
    agentB = request.agent(ctx.server);

    for (const [agent, creds] of [
      [agentA, A],
      [agentB, B],
    ] as const) {
      await agent.post('/api/auth/register').send(creds).expect(201);
      await agent.post('/api/auth/login').send(creds).expect(201);
    }

    const { rows } = await ctx.pool.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [A.email],
    );
    userAId = rows[0].id;

    const doc = await ctx.pool.query<{ id: string }>(
      `INSERT INTO documents (filename, mime_type, size_bytes, status, user_id)
       VALUES ('a-only.pdf', 'application/pdf', 1234, 'failed', $1)
       RETURNING id`,
      [userAId],
    );
    documentAId = doc.rows[0].id;

    const conv = await ctx.pool.query<{ id: string }>(
      `INSERT INTO conversations (title, user_id) VALUES ('A private', $1) RETURNING id`,
      [userAId],
    );
    conversationAId = conv.rows[0].id;
  });

  describe('the global guard', () => {
    it('rejects unauthenticated requests', async () => {
      await request(ctx.server).get('/api/documents').expect(401);
      await request(ctx.server).get('/api/conversations').expect(401);
    });
  });

  describe('positive control', () => {
    it('lets A see their own document and conversation', async () => {
      const docs = await agentA.get('/api/documents').expect(200);
      const docBody = docs.body as { id: string }[];
      expect(docBody).toHaveLength(1);
      expect(docBody[0].id).toBe(documentAId);

      const convs = await agentA.get('/api/conversations').expect(200);
      const convBody = convs.body as { id: string }[];
      expect(convBody).toHaveLength(1);
      expect(convBody[0].id).toBe(conversationAId);
    });
  });

  describe('B cannot see or touch A rows', () => {
    it('sees empty lists', async () => {
      await agentB.get('/api/documents').expect(200, []);
      await agentB.get('/api/conversations').expect(200, []);
    });

    it('gets 404 on A document delete', async () => {
      await agentB.delete(`/api/documents/${documentAId}`).expect(404);
    });

    it('gets 404 on A document retry', async () => {
      await agentB.post(`/api/documents/${documentAId}/retry`).expect(404);
    });

    it('gets 404 on A conversation messages', async () => {
      await agentB
        .get(`/api/conversations/${conversationAId}/messages`)
        .expect(404);
    });

    it('gets 404 on chat with A conversationId', async () => {
      await agentB
        .post('/api/chat')
        .send({ message: 'leak A history', conversationId: conversationAId })
        .expect(404);
    });

    it('gets 404 on A conversation delete', async () => {
      await agentB.delete(`/api/conversations/${conversationAId}`).expect(404);
    });

    it('leaves A rows intact after B tried', async () => {
      await agentB.delete(`/api/documents/${documentAId}`).expect(404);
      await agentB.delete(`/api/conversations/${conversationAId}`).expect(404);

      const docs = await agentA.get('/api/documents').expect(200);
      expect(docs.body as { id: string }[]).toHaveLength(1);

      const convs = await agentA.get('/api/conversations').expect(200);
      expect(convs.body as { id: string }[]).toHaveLength(1);
    });
  });

  describe('conversation delete', () => {
    it('lets A delete their own conversation', async () => {
      await agentA.delete(`/api/conversations/${conversationAId}`).expect(204);
      await agentA.get('/api/conversations').expect(200, []);
    });

    it('cascades to messages', async () => {
      await ctx.pool.query(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, 'user', 'hello'), ($1, 'assistant', 'hi')`,
        [conversationAId],
      );

      await agentA.delete(`/api/conversations/${conversationAId}`).expect(204);

      const { rows } = await ctx.pool.query(
        'SELECT id FROM messages WHERE conversation_id = $1',
        [conversationAId],
      );
      expect(rows).toHaveLength(0);
    });

    it('404s on an unknown id', async () => {
      await agentA
        .delete('/api/conversations/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('400s on a malformed id', async () => {
      await agentA.delete('/api/conversations/not-a-uuid').expect(400);
    });
  });
});
