describe('ragService core', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.OPENAI_API_KEY;
  });

  test('indexDocument stores chunk embeddings in Chroma and marks document indexed', async () => {
    process.env.OPENAI_API_KEY = 'real-openai-key';

    const add = jest.fn().mockResolvedValue(undefined);
    const getOrCreateCollection = jest.fn().mockResolvedValue({ add });
    const embeddingsCreate = jest.fn().mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
    const query = jest.fn().mockResolvedValue({ rows: [] });

    jest.doMock('openai', () => ({
      OpenAI: jest.fn().mockImplementation(() => ({
        embeddings: { create: embeddingsCreate },
      })),
    }));
    jest.doMock('chromadb', () => ({
      ChromaClient: jest.fn().mockImplementation(() => ({
        getOrCreateCollection,
      })),
    }));
    jest.doMock('pdf-parse', () => jest.fn().mockImplementation(async (_buffer, options) => {
      await options.pagerender({
        getTextContent: async () => ({ items: [{ str: 'Order issued.' }, { str: 'Witness statement due.' }] }),
      });
      return { text: 'Order issued. Witness statement due.' };
    }));
    jest.doMock('../src/db', () => ({ query }));

    const { indexDocument } = require('../src/services/ragService');
    const result = await indexDocument('handoff-1', 'doc-1', 'order.pdf', Buffer.from('%PDF mock'));

    expect(result).toEqual({ chunks_indexed: 1, status: 'indexed' });
    expect(embeddingsCreate).toHaveBeenCalledWith({ model: 'text-embedding-3-small', input: expect.any(String) });
    expect(getOrCreateCollection).toHaveBeenCalledWith({ name: 'handoff_handoff-1' });
    expect(add).toHaveBeenCalledWith(expect.objectContaining({
      ids: ['doc-1_chunk_0'],
      documents: [expect.any(String)],
      metadatas: [expect.objectContaining({ doc_name: 'order.pdf', chunk_index: 0 })],
    }));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE documents'), ['doc-1', 'indexed', 1, null]);
  });

  test('indexDocument marks document error when extraction fails', async () => {
    process.env.OPENAI_API_KEY = 'real-openai-key';

    const query = jest.fn().mockResolvedValue({ rows: [] });
    jest.doMock('openai', () => ({ OpenAI: jest.fn().mockImplementation(() => ({ embeddings: { create: jest.fn() } })) }));
    jest.doMock('chromadb', () => ({ ChromaClient: jest.fn().mockImplementation(() => ({ getOrCreateCollection: jest.fn() })) }));
    jest.doMock('pdf-parse', () => jest.fn().mockRejectedValue(new Error('parse failed')));
    jest.doMock('../src/db', () => ({ query }));

    const { indexDocument } = require('../src/services/ragService');

    await expect(indexDocument('handoff-2', 'doc-2', 'broken.pdf', Buffer.from('%PDF bad'))).rejects.toMatchObject({
      code: 'RAG_INDEX_FAILED',
      message: 'parse failed',
    });

    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE documents'), ['doc-2', 'error', 0, 'parse failed']);
  });

  test('searchChunks converts distances to scores and filters low relevance results', async () => {
    process.env.OPENAI_API_KEY = 'real-openai-key';

    const embeddingsCreate = jest.fn().mockResolvedValue({ data: [{ embedding: [0.9, 0.8] }] });
    const queryCollection = jest.fn().mockResolvedValue({
      documents: [['Chunk A', 'Chunk B']],
      metadatas: [[
        { doc_name: 'order.pdf', page: 2, chunk_index: 0 },
        { doc_name: 'bundle.pdf', page: 7, chunk_index: 1 },
      ]],
      distances: [[0.1, 0.7]],
    });
    const getOrCreateCollection = jest.fn().mockResolvedValue({ query: queryCollection });

    jest.doMock('openai', () => ({
      OpenAI: jest.fn().mockImplementation(() => ({
        embeddings: { create: embeddingsCreate },
      })),
    }));
    jest.doMock('chromadb', () => ({
      ChromaClient: jest.fn().mockImplementation(() => ({ getOrCreateCollection })),
    }));
    jest.doMock('pdf-parse', () => jest.fn());
    jest.doMock('../src/db', () => ({ query: jest.fn() }));

    const { searchChunks } = require('../src/services/ragService');
    const results = await searchChunks('deadline', 'handoff-3', 5);

    expect(embeddingsCreate).toHaveBeenCalledWith({ model: 'text-embedding-3-small', input: 'deadline' });
    expect(results).toEqual([
      {
        text: 'Chunk A',
        doc_name: 'order.pdf',
        page: 2,
        chunk_index: 0,
        score: 0.9,
      },
    ]);
  });

  test('indexDocument uses configurable embedding model and base URL for openai-compatible providers', async () => {
    process.env.AI_API_KEY = 'provider-key';
    process.env.AI_BASE_URL = 'https://api.totalgpt.ai';
    process.env.EMBEDDING_MODEL = 'intfloat-multilingual-e5-base';

    const add = jest.fn().mockResolvedValue(undefined);
    const getOrCreateCollection = jest.fn().mockResolvedValue({ add });
    const embeddingsCreate = jest.fn().mockResolvedValue({ data: [{ embedding: [0.5, 0.6] }] });
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const openAiCtor = jest.fn().mockImplementation(() => ({ embeddings: { create: embeddingsCreate } }));

    jest.doMock('openai', () => ({ OpenAI: openAiCtor }));
    jest.doMock('chromadb', () => ({ ChromaClient: jest.fn().mockImplementation(() => ({ getOrCreateCollection })) }));
    jest.doMock('pdf-parse', () => jest.fn().mockImplementation(async (_buffer, options) => {
      await options.pagerender({
        getTextContent: async () => ({ items: [{ str: 'County Court order text.' }] }),
      });
      return { text: 'County Court order text.' };
    }));
    jest.doMock('../src/db', () => ({ query }));

    const { indexDocument } = require('../src/services/ragService');
    await indexDocument('handoff-provider', 'doc-provider', 'provider.pdf', Buffer.from('%PDF provider'));

    expect(openAiCtor).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'provider-key',
      baseURL: 'https://api.totalgpt.ai/v1',
    }));
    expect(embeddingsCreate).toHaveBeenCalledWith({
      model: 'intfloat-multilingual-e5-base',
      input: expect.any(String),
    });

    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.EMBEDDING_MODEL;
  });

  test('indexDocument splits oversized extracted text into multiple embedding calls for e5 provider', async () => {
    process.env.AI_API_KEY = 'provider-key';
    process.env.AI_BASE_URL = 'https://api.totalgpt.ai';
    process.env.EMBEDDING_MODEL = 'intfloat-multilingual-e5-base';

    const add = jest.fn().mockResolvedValue(undefined);
    const getOrCreateCollection = jest.fn().mockResolvedValue({ add });
    const embeddingsCreate = jest.fn().mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] });

    jest.doMock('openai', () => ({
      OpenAI: jest.fn().mockImplementation(() => ({ embeddings: { create: embeddingsCreate } })),
    }));
    jest.doMock('chromadb', () => ({
      ChromaClient: jest.fn().mockImplementation(() => ({ getOrCreateCollection })),
    }));
    jest.doMock('pdf-parse', () => jest.fn().mockImplementation(async (_buffer, options) => {
      const longSentence = Array.from({ length: 700 }, (_, index) => `word${index}`).join(' ');
      await options.pagerender({
        getTextContent: async () => ({ items: [{ str: `${longSentence}.` }] }),
      });
      return { text: `${longSentence}.` };
    }));
    jest.doMock('../src/db', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));

    const { indexDocument } = require('../src/services/ragService');
    const result = await indexDocument('handoff-e5', 'doc-e5', 'oversized.pdf', Buffer.from('%PDF long'));

    expect(result.status).toBe('indexed');
    expect(embeddingsCreate.mock.calls.length).toBeGreaterThan(1);

    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.EMBEDDING_MODEL;
  });
});
