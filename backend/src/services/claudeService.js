const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'missing-anthropic-key' });
const MODEL = 'claude-sonnet-4-20250514';
const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY) && process.env.ANTHROPIC_API_KEY !== 'sk-ant-test';

function createClaudeError(message, code, cause) {
  const error = Object.assign(new Error(message), { code });
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function estimateTokenCount(text) {
  return Math.ceil(String(text || '').length / 4);
}

function stripMarkdownFences(text) {
  const trimmed = String(text || '').trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
    .replace(/```$/, '')
    .trim();
}

function extractResponseText(response) {
  return (response.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function resolveHandoffId(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    return value.handoff_id || value.handoffId || value.id || 'unknown';
  }

  return 'unknown';
}

function ensureRelevantChunks(chunks) {
  const filtered = (chunks || []).filter((chunk) => typeof chunk?.score === 'number' ? chunk.score >= 0.5 : true);

  if (filtered.length === 0) {
    throw createClaudeError('No relevant chunks were found for Claude analysis.', 'NO_CHUNKS_FOUND');
  }

  return filtered;
}

function buildChunkBlock(chunks) {
  return chunks
    .slice(0, 5)
    .map((chunk, index) => `[${index + 1}] (Doc: ${chunk.doc_name}, p.${chunk.page}, relevance: ${chunk.score.toFixed(2)})\n${chunk.text}`)
    .join('\n\n');
}

function collectStrings(value, collector = []) {
  if (typeof value === 'string') {
    collector.push(value);
    return collector;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, collector));
    return collector;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectStrings(entry, collector));
  }

  return collector;
}

function extractDocCitations(text) {
  const pattern = /\[Doc:\s*([^,\]]+),\s*p\.(\d+)\]/g;
  const citations = [];
  let match;

  while ((match = pattern.exec(String(text || ''))) !== null) {
    citations.push({
      doc_name: match[1].trim(),
      page: Number(match[2]),
    });
  }

  return citations;
}

function mapCitationsToSources(strings, chunks) {
  const uniqueSources = new Map();

  for (const text of strings) {
    const citations = extractDocCitations(text);

    for (const citation of citations) {
      const sourceChunk = chunks.find((chunk) => chunk.doc_name === citation.doc_name && Number(chunk.page) === Number(citation.page));

      if (!sourceChunk) {
        continue;
      }

      const key = `${citation.doc_name}:${citation.page}`;
      if (!uniqueSources.has(key)) {
        uniqueSources.set(key, {
          doc_name: sourceChunk.doc_name,
          page: Number(sourceChunk.page),
          chunk_text: sourceChunk.text,
          score: sourceChunk.score,
        });
      }
    }
  }

  return Array.from(uniqueSources.values());
}

function parseStructuredJson(responseText) {
  return JSON.parse(stripMarkdownFences(responseText));
}

async function callClaude(handoffId, system, userMessage, maxTokens) {
  const startedAt = Date.now();

  if (!hasAnthropicKey) {
    const latency = Date.now() - startedAt;
    const inputTokens = estimateTokenCount(`${system}\n${userMessage}`);
    console.log(`[CLAUDE] handoff=${handoffId} tokens_in=${inputTokens} tokens_out=0 latency=${latency}ms`);
    throw createClaudeError('Anthropic API key is not configured for remote Claude calls.', 'CLAUDE_KEY_MISSING');
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });

    const latency = Date.now() - startedAt;
    const inputTokens = response.usage?.input_tokens ?? estimateTokenCount(`${system}\n${userMessage}`);
    const outputTokens = response.usage?.output_tokens ?? estimateTokenCount(extractResponseText(response));
    console.log(`[CLAUDE] handoff=${handoffId} tokens_in=${inputTokens} tokens_out=${outputTokens} latency=${latency}ms`);

    return extractResponseText(response);
  } catch (error) {
    throw createClaudeError(error.message || 'Claude request failed.', error.code || 'CLAUDE_REQUEST_FAILED', error);
  }
}

function localFactFromChunk(chunk, fallback = 'Not found in file.') {
  if (!chunk) {
    return fallback;
  }

  const sentence = String(chunk.text || '').split(/(?<=[.!?])\s+/)[0]?.trim() || fallback;
  return `${sentence} [Doc: ${chunk.doc_name}, p.${chunk.page}]`;
}

function findChunkSentence(chunk, pattern, fallback = 'Not found in file.') {
  if (!chunk) {
    return fallback;
  }

  const sentences = String(chunk.text || '').split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const matched = sentences.find((sentence) => pattern.test(sentence));

  if (!matched) {
    return fallback;
  }

  return `${matched} [Doc: ${chunk.doc_name}, p.${chunk.page}]`;
}

function localClaudeLog(handoffId, payload) {
  const outputTokens = estimateTokenCount(JSON.stringify(payload));
  console.log(`[CLAUDE] handoff=${handoffId} tokens_in=0 tokens_out=${outputTokens} latency=0ms`);
}

async function chatWithSources(question, chunks, handoffContext = {}) {
  const relevantChunks = ensureRelevantChunks(chunks);
  const handoffId = resolveHandoffId(handoffContext);
  if (!hasAnthropicKey) {
    const hasDirectMatch = relevantChunks.some((chunk) => question.toLowerCase().split(/\s+/).some((term) => term.length > 3 && chunk.text.toLowerCase().includes(term.toLowerCase())));

    if (!hasDirectMatch) {
      localClaudeLog(handoffId, { answer: 'Insufficient evidence in the file to answer this question.' });
      return {
        answer: 'Insufficient evidence in the file to answer this question.',
        sources: [],
      };
    }

    const answer = relevantChunks
      .slice(0, 2)
      .map((chunk) => localFactFromChunk(chunk))
      .join(' ');
    const sources = mapCitationsToSources([answer], relevantChunks);
    localClaudeLog(handoffId, { answer, sources });
    return { answer, sources };
  }

  const systemPrompt = `You are a legal analysis assistant for CasePass, supporting solicitors 
and advocates in England and Wales. You have been given a set of numbered 
source chunks from the matter file.

STRICT RULES:
1. Answer only using information present in the provided source chunks.
2. For every factual statement, cite the source inline using this exact 
   format: [Doc: {doc_name}, p.{page}]
3. If the answer cannot be found in the chunks, respond exactly with:
   "Insufficient evidence in the file to answer this question."
4. Never infer, extrapolate, or add legal knowledge not present in the chunks.
5. Do not refer to yourself or explain your reasoning process.
6. Use formal English legal register. Use: solicitor, counsel, claimant, 
   defendant, proceedings, hearing, order. Avoid: attorney, lawsuit, posture.`;
  const parties = handoffContext.parties || `${handoffContext.client_name || ''} v ${handoffContext.opponent_name || ''}`.trim();
  const userMessage = `Matter: ${handoffContext.case_name || handoffContext.name || 'Unknown matter'} | Court: ${handoffContext.court || handoffContext.court_or_tribunal || 'Unknown court'} | Parties: ${parties}

SOURCE CHUNKS:
${buildChunkBlock(relevantChunks)}

QUESTION: ${question}`;
  const answer = await callClaude(handoffId, systemPrompt, userMessage, 1000);

  if (answer === 'Insufficient evidence in the file to answer this question.') {
    return { answer, sources: [] };
  }

  const sources = mapCitationsToSources([answer], relevantChunks);
  return { answer, sources };
}

async function reviewMatter(handoffId, chunks, handoffData) {
  const relevantChunks = ensureRelevantChunks(chunks);
  if (!hasAnthropicKey) {
    const firstChunk = relevantChunks[0];
    const secondChunk = relevantChunks[1] || firstChunk;
    const response = {
      stage_of_proceedings: localFactFromChunk(firstChunk),
      most_recent_operative_event: findChunkSentence(firstChunk, /most recent operative event|order dated|latest/i, localFactFromChunk(firstChunk)),
      live_deadlines: [
        findChunkSentence(firstChunk, /live deadline|deadline|due by/i, handoffData.next_hearing_date ? `Next hearing date noted as ${handoffData.next_hearing_date}. [Doc: ${firstChunk.doc_name}, p.${firstChunk.page}]` : 'Not found in file.'),
      ],
      urgent_issues: [findChunkSentence(secondChunk, /urgent issue|risk|missing/i, localFactFromChunk(secondChunk))],
      missing_documents: [],
      next_procedural_step: findChunkSentence(secondChunk, /next procedural step|next step|prepare|file/i, localFactFromChunk(secondChunk)),
      sources: mapCitationsToSources([
        localFactFromChunk(firstChunk),
        findChunkSentence(firstChunk, /live deadline|deadline|due by/i, localFactFromChunk(firstChunk)),
        findChunkSentence(secondChunk, /next procedural step|next step|prepare|file/i, localFactFromChunk(secondChunk)),
      ], relevantChunks),
    };
    localClaudeLog(handoffId, response);
    return response;
  }

  const systemPrompt = `You are a legal case analyst for CasePass. You will analyse the provided 
matter file chunks and produce a structured matter review.

STRICT RULES:
1. Every field in your output must cite its source: [Doc: {name}, p.{page}]
2. If a field cannot be determined from the file, write "Not found in file."
3. Never infer deadlines or dates not explicitly stated in the documents.
4. Output must be valid JSON only. No preamble, no explanation, no markdown.`;
  const userMessage = `Matter: ${handoffData.case_name} | Court: ${handoffData.court} | Parties: ${handoffData.parties}

SOURCE CHUNKS:
${buildChunkBlock(relevantChunks)}

Last known action: ${handoffData.last_known_action || 'Not found in file.'}
Next hearing date: ${handoffData.next_hearing_date || 'Not found in file.'}

Produce a JSON object with exactly these fields:
{
  "stage_of_proceedings": "string with citation",
  "most_recent_operative_event": "string with citation",
  "live_deadlines": ["string with citation", ...],
  "urgent_issues": ["string with citation", ...],
  "missing_documents": ["string — inferred gap only if explicitly referenced in file but not present"],
  "next_procedural_step": "string with citation",
  "sources": [{ "doc_name", "page", "chunk_text", "score" }]
}`;
  const responseText = await callClaude(handoffId, systemPrompt, userMessage, 2000);

  try {
    const parsed = parseStructuredJson(responseText);
    parsed.sources = mapCitationsToSources(collectStrings(parsed), relevantChunks);
    return parsed;
  } catch (_error) {
    return {
      error: 'AI review failed to produce valid structured output',
      raw: responseText,
    };
  }
}

async function generateHandoverNote(handoffId, chunks, handoffData, matterReview) {
  const relevantChunks = ensureRelevantChunks(chunks);
  if (!hasAnthropicKey) {
    const firstChunk = relevantChunks[0];
    const secondChunk = relevantChunks[1] || firstChunk;
    const response = {
      executive_summary: `${localFactFromChunk(firstChunk)} ${localFactFromChunk(secondChunk)}`.trim(),
      current_procedural_status: matterReview.stage_of_proceedings || localFactFromChunk(firstChunk),
      next_required_step: matterReview.next_procedural_step || localFactFromChunk(secondChunk),
      live_deadlines: (matterReview.live_deadlines || []).filter(Boolean),
      risk_flags: (matterReview.urgent_issues || []).filter(Boolean),
      task_scope: handoffData.intended_task || 'No task scope recorded.',
      file_based_facts: [localFactFromChunk(firstChunk), localFactFromChunk(secondChunk)],
      strategic_notes: [`Strategic note: ${handoffData.intended_task || 'Review the released handoff pack.'}`],
      sources: mapCitationsToSources([localFactFromChunk(firstChunk), localFactFromChunk(secondChunk)], relevantChunks),
    };
    localClaudeLog(handoffId, response);
    return response;
  }

  const systemPrompt = `You are drafting an executive handover note for a CasePass matter transfer 
between legal professionals in England and Wales.

STRICT RULES:
1. Every sentence that states a fact must end with a citation: 
   [Doc: {name}, p.{page}]
2. Separate file-based facts from strategic notes using clear headings.
3. Write in formal English legal register.
4. Do not include information not present in the source chunks.
5. Output must be valid JSON only. No preamble, no markdown fences.`;
  const userMessage = `Matter: ${handoffData.case_name} | Court: ${handoffData.court} | Parties: ${handoffData.parties}

Matter review summary:
${JSON.stringify(matterReview)}

SOURCE CHUNKS:
${buildChunkBlock(relevantChunks)}

Output JSON:
{
  "executive_summary": "2-3 sentence matter overview with citations",
  "current_procedural_status": "string with citation",
  "next_required_step": "string with citation",
  "live_deadlines": ["string with citation"],
  "risk_flags": ["string with citation or 'Strategic note: ...' if no doc source"],
  "task_scope": "string — what the receiving lawyer is being asked to do",
  "file_based_facts": ["string with citation"],
  "strategic_notes": ["string — clearly marked as solicitor instruction, no citation required"],
  "sources": [{ "doc_name", "page", "chunk_text", "score" }]
}`;
  const responseText = await callClaude(handoffId, systemPrompt, userMessage, 2000);

  try {
    const parsed = parseStructuredJson(responseText);
    parsed.sources = mapCitationsToSources(collectStrings(parsed), relevantChunks);
    return parsed;
  } catch (error) {
    throw createClaudeError('AI handover note failed to produce valid JSON output.', 'CLAUDE_HANDOVER_NOTE_INVALID', error);
  }
}

async function generateUpdateDraft(handoffId, chunks, postActionData) {
  const relevantChunks = ensureRelevantChunks(chunks);
  if (!hasAnthropicKey) {
    const firstChunk = relevantChunks[0];
    const secondChunk = relevantChunks[1] || firstChunk;
    const response = {
      what_was_done: localFactFromChunk(firstChunk),
      outcome: localFactFromChunk(secondChunk),
      new_procedural_status: localFactFromChunk(firstChunk),
      what_follows: localFactFromChunk(secondChunk),
      updated_deadlines: postActionData.hearing_date ? [`Next hearing date remains ${postActionData.hearing_date}. [Doc: ${firstChunk.doc_name}, p.${firstChunk.page}]`] : ['Not found in file.'],
      sources: mapCitationsToSources([localFactFromChunk(firstChunk), localFactFromChunk(secondChunk)], relevantChunks),
    };
    localClaudeLog(handoffId, response);
    return response;
  }

  const systemPrompt = `You are generating a post-action update note for a CasePass matter record.

STRICT RULES:
1. Cite every factual statement from the uploaded post-action documents.
2. Preserve chronological order.
3. Clearly separate: what was done, what the outcome was, and what follows.
4. Output valid JSON only.`;
  const userMessage = `Post-action context:
${JSON.stringify(postActionData)}

SOURCE CHUNKS:
${buildChunkBlock(relevantChunks)}

Output JSON:
{
  "what_was_done": "string with citation",
  "outcome": "string with citation",
  "new_procedural_status": "string with citation",
  "what_follows": "string with citation",
  "updated_deadlines": ["string with citation"],
  "sources": [{ "doc_name", "page", "chunk_text", "score" }]
}`;
  const responseText = await callClaude(handoffId, systemPrompt, userMessage, 2000);

  try {
    const parsed = parseStructuredJson(responseText);
    parsed.sources = mapCitationsToSources(collectStrings(parsed), relevantChunks);
    return parsed;
  } catch (error) {
    throw createClaudeError('AI update draft failed to produce valid JSON output.', 'CLAUDE_UPDATE_INVALID', error);
  }
}

async function generateCaseSummary(caseData) {
  const sourceRegister = (caseData.documents || []).map((document) => `| ${document.original_name} | ${document.page_count || '-'} | ${document.privilege_flag ? 'Yes' : 'No'} | ${document.status || 'unknown'} |`).join('\n');
  const summary = [
    '# Matter Identification',
    `- Case title: ${caseData.case_title || 'Unknown matter'}`,
    `- Claim number: ${caseData.claim_number || 'Unknown reference'}`,
    `- Forum: ${caseData.forum || 'Unknown forum'}`,
    `- Claimant: ${caseData.claimant || 'Unknown claimant'}`,
    `- Defendant: ${caseData.defendant || 'Unknown defendant'}`,
    '',
    '# Last Operative Event',
    caseData.most_recent_operative_event || 'Not found in file.',
    '',
    '# Next Required Step',
    caseData.next_procedural_step || 'Not found in file.',
    '',
    '# Live Deadlines',
    `- AOS due: ${caseData.aos_due || 'Not recorded'}`,
    `- Defence due: ${caseData.defence_due || 'Not recorded'}`,
    `- Bundle due: ${caseData.bundle_due || 'Not recorded'}`,
    `- Skeleton due: ${caseData.skeleton_due || 'Not recorded'}`,
    `- Next hearing date: ${caseData.next_hearing_date || 'Not recorded'}`,
    '',
    '# Alerts and Risk Flags',
    ...(caseData.alerts || []).map((alert) => `- ${alert.content}`),
    `- Forum uncertain: ${caseData.forum_uncertain ? 'Yes' : 'No'}`,
    `- Bundle noncompliance risk: ${caseData.bundle_noncompliance_risk ? 'Yes' : 'No'}`,
    `- Recording risk flag: ${caseData.recording_risk_flag ? 'Yes' : 'No'}`,
    '',
    '# Checklist',
    ...(caseData.checklist_items || []).map((item) => `- [${item.completed ? 'x' : ' '}] ${item.label}`),
    '',
    '# Instructed Solicitor Notes',
    caseData.solicitor_notes || 'No solicitor notes recorded.',
    '',
    '# Updates',
    ...(caseData.updates || []).map((update) => `- ${update.created_at}: ${update.content}`),
    '',
    '# Source Register',
    '| Document | Pages Referenced | Privilege Flag | Status |',
    '| --- | --- | --- | --- |',
    sourceRegister || '| None | - | - | - |',
  ].join('\n');

  return summary;
}

module.exports = {
  chatWithSources,
  reviewMatter,
  generateHandoverNote,
  generateUpdateDraft,
  generateCaseSummary,
  __test__: {
    stripMarkdownFences,
    mapCitationsToSources,
    extractDocCitations,
  },
};
