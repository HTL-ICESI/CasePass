describe('claudeService core', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ANTHROPIC_API_KEY = 'real-anthropic-key';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.CHAT_MODEL;
    jest.restoreAllMocks();
  });

  function loadServiceWithResponse(text) {
    const messagesCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text }],
      usage: { input_tokens: 123, output_tokens: 45 },
    });

    jest.doMock('@anthropic-ai/sdk', () => ({
      Anthropic: jest.fn().mockImplementation(() => ({
        messages: { create: messagesCreate },
      })),
    }));

    const service = require('../src/services/claudeService');
    return { service, messagesCreate };
  }

  test('chatWithSources maps inline citations back to source chunks', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { service, messagesCreate } = loadServiceWithResponse('The court listed the hearing. [Doc: order.pdf, p.3]');

    const chunks = [{ text: 'The court listed the hearing.', doc_name: 'order.pdf', page: 3, chunk_index: 0, score: 0.91 }];
    const result = await service.chatWithSources('What happened?', chunks, {
      handoff_id: 'handoff-10',
      case_title: 'Example matter',
      forum: 'county_court',
      claimant: 'Claimant Ltd',
      defendant: 'Defendant Ltd',
    });

    expect(messagesCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-sonnet-4-20250514',
      temperature: 0,
      max_tokens: 650,
    }));
    expect(result.answer).toContain('[Doc: order.pdf, p.3]');
    expect(result.sources[0]).toMatchObject({
      doc_name: 'order.pdf',
      page: 3,
      chunk_text: 'The court listed the hearing.',
      score: 0.91,
      chunk_index: 0,
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[CLAUDE] handoff=handoff-10'));
  });

  test('reviewMatter parses fenced JSON and returns structured sources', async () => {
    const responseText = '```json\n{"stage_of_proceedings":"Directions stage [Doc: order.pdf, p.2]","most_recent_operative_event":"Order made [Doc: order.pdf, p.2]","live_deadlines":["Witness statement due [Doc: order.pdf, p.2]"],"urgent_issues":["Bundle risk [Doc: order.pdf, p.2]"],"missing_documents":[],"next_procedural_step":"File evidence [Doc: order.pdf, p.2]","sources":[]}\n```';
    const { service } = loadServiceWithResponse(responseText);

    const chunks = [{ text: 'Order made. Witness statement due.', doc_name: 'order.pdf', page: 2, chunk_index: 0, score: 0.95 }];
    const result = await service.reviewMatter('handoff-11', chunks, {
      case_name: 'Review matter',
      court: 'County Court',
      parties: 'A v B',
      last_known_action: 'Order served',
      next_hearing_date: '2026-06-20',
    });

    expect(result.stage_of_proceedings).toContain('[Doc: order.pdf, p.2]');
    expect(result.sources[0]).toMatchObject({ doc_name: 'order.pdf', page: 2 });
  });

  test('mapCitationsToSources selects the closest chunk on the same page', () => {
    const { service } = loadServiceWithResponse('{"unused":true}');
    const chunks = [
      {
        text: 'Signature and address for service. Full name: Daniel Estrada.',
        doc_name: 'n170.pdf',
        page: 2,
        chunk_index: 0,
        score: 0.9,
      },
      {
        text: 'Expert cross-examination requires additional trial time and a longer timetable.',
        doc_name: 'n170.pdf',
        page: 2,
        chunk_index: 1,
        score: 0.88,
      },
    ];

    const sources = service.__test__.mapCitationsToSources([
      'Expert cross-examination requires additional trial time. [Doc: n170.pdf, p.2]',
    ], chunks);

    expect(sources[0]).toMatchObject({
      doc_name: 'n170.pdf',
      page: 2,
      chunk_index: 1,
      chunk_text: 'Expert cross-examination requires additional trial time and a longer timetable.',
    });
  });

  test('reviewMatter falls back to local cited review when JSON is invalid', async () => {
    const { service } = loadServiceWithResponse('not valid json');
    const chunks = [{ text: 'Order made.', doc_name: 'order.pdf', page: 2, chunk_index: 0, score: 0.95 }];

    const result = await service.reviewMatter('handoff-12', chunks, {
      case_name: 'Broken JSON matter',
      court: 'County Court',
      parties: 'A v B',
      last_known_action: 'Order served',
      next_hearing_date: '2026-06-20',
    });

    expect(result.stage_of_proceedings).toContain('[Doc: order.pdf, p.2]');
    expect(result.sources[0]).toMatchObject({ doc_name: 'order.pdf', page: 2, chunk_index: 0 });
  });

  test('stripMarkdownFences helper also strips qwen think blocks', () => {
    const { service } = loadServiceWithResponse('{"unused":true}');
    const cleaned = service.__test__.stripMarkdownFences('<think>internal reasoning</think>\n```json\n{"value":1}\n```');
    expect(cleaned).toBe('{"value":1}');
  });

  test('generateHandoverNote and generateUpdateDraft return structured cited payloads', async () => {
    const noteJson = JSON.stringify({
      executive_summary: 'Summary [Doc: order.pdf, p.1]',
      current_procedural_status: 'Status [Doc: order.pdf, p.1]',
      next_required_step: 'Next step [Doc: order.pdf, p.1]',
      live_deadlines: ['Deadline [Doc: order.pdf, p.1]'],
      risk_flags: ['Risk [Doc: order.pdf, p.1]'],
      task_scope: 'Prepare hearing',
      file_based_facts: ['Fact [Doc: order.pdf, p.1]'],
      strategic_notes: ['Strategic note: limited brief'],
      sources: [],
    });
    const updateJson = JSON.stringify({
      what_was_done: 'Done [Doc: order.pdf, p.1]',
      outcome: 'Outcome [Doc: order.pdf, p.1]',
      new_procedural_status: 'Adjourned [Doc: order.pdf, p.1]',
      what_follows: 'Follow-up [Doc: order.pdf, p.1]',
      updated_deadlines: ['Deadline [Doc: order.pdf, p.1]'],
      sources: [],
    });

    const messagesCreate = jest.fn()
      .mockResolvedValueOnce({ content: [{ type: 'text', text: noteJson }], usage: { input_tokens: 120, output_tokens: 80 } })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: updateJson }], usage: { input_tokens: 110, output_tokens: 70 } });

    jest.doMock('@anthropic-ai/sdk', () => ({
      Anthropic: jest.fn().mockImplementation(() => ({
        messages: { create: messagesCreate },
      })),
    }));

    const service = require('../src/services/claudeService');
    const chunks = [{ text: 'Order made and hearing adjourned.', doc_name: 'order.pdf', page: 1, chunk_index: 0, score: 0.9 }];

    const handover = await service.generateHandoverNote('handoff-13', chunks, {
      case_name: 'Matter',
      court: 'County Court',
      parties: 'A v B',
      intended_task: 'Prepare hearing',
    }, {
      stage_of_proceedings: 'Directions [Doc: order.pdf, p.1]',
      most_recent_operative_event: 'Order [Doc: order.pdf, p.1]',
      live_deadlines: ['Deadline [Doc: order.pdf, p.1]'],
      urgent_issues: ['Risk [Doc: order.pdf, p.1]'],
      next_procedural_step: 'Next [Doc: order.pdf, p.1]',
    });

    const update = await service.generateUpdateDraft('handoff-14', chunks, {
      what_was_done: 'Prepared note',
      what_happened: 'Adjourned',
      what_follows: 'Prepare evidence',
      new_doc_names: ['order.pdf'],
      hearing_date: '2026-06-20',
    });

    expect(handover.executive_summary).toContain('[Doc: order.pdf, p.1]');
    expect(handover.sources[0]).toMatchObject({ doc_name: 'order.pdf', page: 1 });
    expect(update.new_procedural_status).toContain('[Doc: order.pdf, p.1]');
    expect(update.sources[0]).toMatchObject({ doc_name: 'order.pdf', page: 1 });
  });

  test('chatWithSources can use an OpenAI-compatible chat provider when configured', async () => {
    jest.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
    process.env.AI_API_KEY = 'provider-key';
    process.env.AI_BASE_URL = 'https://api.totalgpt.ai';
    process.env.CHAT_MODEL = 'Qwen/Qwen3.6-35B-A3B';

    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'The next step is to file witness evidence. [Doc: order.pdf, p.3]' } }],
      usage: { prompt_tokens: 77, completion_tokens: 21 },
    });
    const openAiCtor = jest.fn().mockImplementation(() => ({
      chat: { completions: { create } },
    }));

    jest.doMock('openai', () => ({ OpenAI: openAiCtor }));
    jest.doMock('@anthropic-ai/sdk', () => ({
      Anthropic: jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } })),
    }));

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const service = require('../src/services/claudeService');
    const chunks = [{ text: 'File witness evidence.', doc_name: 'order.pdf', page: 3, chunk_index: 0, score: 0.9 }];

    const result = await service.chatWithSources('What is the next step?', chunks, {
      handoff_id: 'handoff-provider',
      case_title: 'Provider matter',
      forum: 'county_court',
      claimant: 'Claimant Ltd',
      defendant: 'Defendant Ltd',
    });

    expect(openAiCtor).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'provider-key',
      baseURL: 'https://api.totalgpt.ai/v1',
    }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'Qwen/Qwen3.6-35B-A3B',
      temperature: 0,
      max_tokens: 650,
    }));
    expect(result.answer).toContain('[Doc: order.pdf, p.3]');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[CLAUDE] handoff=handoff-provider'));

    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.CHAT_MODEL;
  });

  test('streamChatWithSources streams OpenAI-compatible deltas and maps final citations', async () => {
    jest.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
    process.env.AI_API_KEY = 'provider-key';
    process.env.AI_BASE_URL = 'https://api.totalgpt.ai';
    process.env.CHAT_MODEL = 'Qwen-Qwen3.6-35B-A3B';

    async function* responseStream() {
      yield { choices: [{ delta: { content: 'The next step ' } }] };
      yield { choices: [{ delta: { content: 'is to file evidence. ' } }] };
      yield { choices: [{ delta: { content: '[Doc: order.pdf, p.3]' } }] };
    }

    const create = jest.fn().mockResolvedValue(responseStream());

    jest.doMock('openai', () => ({
      OpenAI: jest.fn().mockImplementation(() => ({
        chat: { completions: { create } },
      })),
    }));
    jest.doMock('@anthropic-ai/sdk', () => ({
      Anthropic: jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } })),
    }));

    const service = require('../src/services/claudeService');
    const chunks = [{ text: 'File evidence.', doc_name: 'order.pdf', page: 3, chunk_index: 0, score: 0.9 }];
    const deltas = [];

    const result = await service.streamChatWithSources('What do I do?', chunks, {
      handoff_id: 'handoff-stream',
      case_title: 'Provider matter',
      forum: 'county_court',
      claimant: 'Claimant Ltd',
      defendant: 'Defendant Ltd',
      conversation_history: [{ role: 'assistant', text: 'There is a hearing listed. [Doc: order.pdf, p.3]' }],
    }, (delta) => deltas.push(delta));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'Qwen-Qwen3.6-35B-A3B',
      stream: true,
      max_tokens: 650,
    }));
    expect(deltas.join('')).toBe('The next step is to file evidence. [Doc: order.pdf, p.3]');
    expect(result.sources[0]).toMatchObject({ doc_name: 'order.pdf', page: 3 });
  });

  test('chatWithSources strips qwen think blocks from provider answers', async () => {
    jest.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
    process.env.AI_API_KEY = 'provider-key';
    process.env.AI_BASE_URL = 'https://api.totalgpt.ai';
    process.env.CHAT_MODEL = 'Qwen-Qwen3.6-35B-A3B';

    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: '<think>internal reasoning</think>\nThe next step is to file witness evidence. [Doc: order.pdf, p.3]' } }],
      usage: { prompt_tokens: 77, completion_tokens: 21 },
    });

    jest.doMock('openai', () => ({
      OpenAI: jest.fn().mockImplementation(() => ({
        chat: { completions: { create } },
      })),
    }));
    jest.doMock('@anthropic-ai/sdk', () => ({
      Anthropic: jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } })),
    }));

    const service = require('../src/services/claudeService');
    const chunks = [{ text: 'File witness evidence.', doc_name: 'order.pdf', page: 3, chunk_index: 0, score: 0.9 }];
    const result = await service.chatWithSources('What is the next step?', chunks, {
      handoff_id: 'handoff-provider-think',
      case_title: 'Provider matter',
      forum: 'county_court',
      claimant: 'Claimant Ltd',
      defendant: 'Defendant Ltd',
    });

    expect(result.answer).toBe('The next step is to file witness evidence. [Doc: order.pdf, p.3]');

    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.CHAT_MODEL;
  });

  test('chatWithSources falls back to grounded chunk sentences when provider returns reasoning-heavy text', async () => {
    jest.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
    process.env.AI_API_KEY = 'provider-key';
    process.env.AI_BASE_URL = 'https://api.totalgpt.ai';
    process.env.CHAT_MODEL = 'Qwen-Qwen3.6-35B-A3B';

    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Here is a thinking process:\n1. analyse\n2. answer' } }],
      usage: { prompt_tokens: 77, completion_tokens: 21 },
    });

    jest.doMock('openai', () => ({
      OpenAI: jest.fn().mockImplementation(() => ({
        chat: { completions: { create } },
      })),
    }));
    jest.doMock('@anthropic-ai/sdk', () => ({
      Anthropic: jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } })),
    }));

    const service = require('../src/services/claudeService');
    const chunks = [{ text: 'The next procedural step is to file witness evidence before the hearing.', doc_name: 'order.pdf', page: 3, chunk_index: 0, score: 0.9 }];
    const result = await service.chatWithSources('What is the next procedural step?', chunks, {
      handoff_id: 'handoff-provider-fallback',
      case_title: 'Provider matter',
      forum: 'county_court',
      claimant: 'Claimant Ltd',
      defendant: 'Defendant Ltd',
    });

    expect(result.answer).toContain('[Doc: order.pdf, p.3]');

    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.CHAT_MODEL;
  });

  test('reviewMatter uses json_object response format with OpenAI-compatible provider', async () => {
    jest.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
    process.env.AI_API_KEY = 'provider-key';
    process.env.AI_BASE_URL = 'https://api.totalgpt.ai';
    process.env.CHAT_MODEL = 'Qwen-Qwen3.6-35B-A3B';

    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: '{"stage_of_proceedings":"Directions [Doc: order.pdf, p.2]","most_recent_operative_event":"Order made [Doc: order.pdf, p.2]","live_deadlines":["Witness statement due [Doc: order.pdf, p.2]"],"urgent_issues":["Bundle risk [Doc: order.pdf, p.2]"],"missing_documents":[],"next_procedural_step":"File evidence [Doc: order.pdf, p.2]","sources":[]}' } }],
      usage: { prompt_tokens: 90, completion_tokens: 50 },
    });

    jest.doMock('openai', () => ({
      OpenAI: jest.fn().mockImplementation(() => ({
        chat: { completions: { create } },
      })),
    }));
    jest.doMock('@anthropic-ai/sdk', () => ({
      Anthropic: jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } })),
    }));

    const service = require('../src/services/claudeService');
    const chunks = [{ text: 'Order made. Witness statement due.', doc_name: 'order.pdf', page: 2, chunk_index: 0, score: 0.95 }];
    await service.reviewMatter('handoff-provider-json', chunks, {
      case_name: 'Provider matter',
      court: 'County Court',
      parties: 'A v B',
      last_known_action: 'Order served',
      next_hearing_date: '2026-06-20',
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      response_format: { type: 'json_object' },
    }));

    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.CHAT_MODEL;
  });
});
