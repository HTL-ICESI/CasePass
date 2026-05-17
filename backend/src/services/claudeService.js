const { Anthropic } = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'missing-anthropic-key' });
const MODEL = 'claude-sonnet-4-20250514';
const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY) && process.env.ANTHROPIC_API_KEY !== 'sk-ant-test';

function normaliseBaseUrl(url) {
  if (!url) {
    return undefined;
  }

  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

const openAiCompatibleApiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || 'missing-provider-key';
const openAiCompatibleBaseUrl = normaliseBaseUrl(process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL);
const chatModel = process.env.CHAT_MODEL || MODEL;
const hasOpenAiCompatibleChat = Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.CHAT_MODEL);
const openAiCompatibleClient = hasOpenAiCompatibleChat
  ? new OpenAI({ apiKey: openAiCompatibleApiKey, baseURL: openAiCompatibleBaseUrl })
  : null;

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
  const trimmed = String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
    .replace(/```$/, '')
    .trim();
}

function extractJsonObject(text) {
  const stripped = stripMarkdownFences(text);
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return stripped.slice(firstBrace, lastBrace + 1).trim();
  }

  return stripped;
}

function stripJsonResponseText(text) {
  let result = String(text || '');

  const lastClose = result.lastIndexOf('</think>');
  if (lastClose !== -1) {
    result = result.slice(lastClose + '</think>'.length);
  }

  result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
  return extractJsonObject(result);
}

function stripReasoningBlocks(text) {
  let result = String(text || '');

  const lastClose = result.lastIndexOf('</think>');
  if (lastClose !== -1) {
    result = result.slice(lastClose + '</think>'.length);
  }

  result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');

  if (/Analyze User Input|Mental Refinement|Formulate Response|Key Discrepancies|Matter metadata:|Retrieved chunks:|I must|Draft:/i.test(result)) {
    const finalMatch = result.match(/(?:Final Answer|Final Response|Answer|Draft)\s*:\s*([\s\S]+)$/i);
    const finalText = finalMatch ? finalMatch[1].trim() : '';
    return finalText.length >= 80 ? finalText : '';
  }

  const lines = result.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^[•\-*]\s+/.test(trimmed)) return true;
    return /^(Yes\b|No\b|The\b|A\b|An\b|It\b|There\b|This\b|That\b|These\b|Those\b|£|\$|€|\d)/.test(trimmed);
  });
  if (startIndex > 0) {
    result = lines.slice(startIndex).join('\n');
  }

  return result
    .replace(/\n+(Check constraints|Constraints check|Prompt constraints|Draft|Analysis|Reasoning)\s*:[\s\S]*$/i, '')
    .replace(/\n+(Done\.?|Proceeds?\.?|Output[^\n]*|Final Answer[^\n]*|Self-?Correction[^\n]*|\(Self[^\n]*)\s*$/gim, '')
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
    .map((chunk, index) => {
      const score = typeof chunk.score === 'number' ? chunk.score.toFixed(2) : 'n/a';
      return `[${index + 1}] (Doc: ${chunk.doc_name}, p.${chunk.page}, relevance: ${score})\n${chunk.text}`;
    })
    .join('\n\n');
}

function trimToSentence(text, maxSentences = 1, maxLength = 240) {
  const normalised = String(text || '').replace(/\s+/g, ' ').trim();
  const sentences = normalised
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const result = (sentences.length ? sentences.slice(0, maxSentences).join(' ') : normalised).trim();

  return result.length > maxLength ? `${result.slice(0, maxLength - 3).trim()}...` : result;
}

function extractAfter(text, pattern) {
  const match = pattern.exec(text);
  if (!match || typeof match.index !== 'number') {
    return '';
  }

  return text.slice(match.index + match[0].length).trim();
}

function cleanLegalSnippet(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) {
    return 'Not found in file.';
  }

  const claim = extractAfter(text, /Brief details of claim\s+/i);
  if (claim) {
    return trimToSentence(claim, 1);
  }

  const directions = extractAfter(text, /Proposed directions:\s*/i);
  if (directions) {
    return trimToSentence(`Proposed directions: ${directions}`, 1);
  }

  const notice = extractAfter(text, /I \(We\) give notice that:\s*/i);
  if (notice) {
    return trimToSentence(notice.replace(/^n\s+/i, ''), 1);
  }

  const questionnaire = text.match(
    /N181 Directions Questionnaire[\s\S]*?Completed on behalf of:\s*([^.]+?)(?:\s+A\.|\.)/i,
  );
  if (questionnaire) {
    return `Directions questionnaire completed on behalf of ${questionnaire[1].trim()}.`;
  }

  const claimNumber = text.match(/Claim No\.?:\s*([A-Z0-9]+)/i)?.[1];
  const issueDate = text.match(/Issue date:\s*([^F]+?)\s+Fee Account/i)?.[1];
  if (/N1 Claim Form|Claim Form CPR Part 7/i.test(text) && (claimNumber || issueDate)) {
    return `Claim form issued${issueDate ? ` on ${issueDate.trim()}` : ''}${claimNumber ? ` under claim ${claimNumber.trim()}` : ''}.`;
  }

  return trimToSentence(text, 1);
}

function normaliseConversationHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message?.text === 'string')
    .slice(-6)
    .map((message) => ({
      role: message.role,
      text: message.text.trim().replace(/\s+/g, ' ').slice(0, 900),
    }))
    .filter((message) => message.text);
}

function buildConversationBlock(history = []) {
  const normalised = normaliseConversationHistory(history);
  if (normalised.length === 0) {
    return 'No earlier chat turns.';
  }

  return normalised
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.text}`)
    .join('\n');
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

function buildGroundedChatAnswer(question, chunks) {
  const queryTerms = new Set(String(question || '').toLowerCase().split(/[^a-z0-9]+/i).filter((term) => term.length > 3));
  const questionText = String(question || '').toLowerCase();

  if (/deadline|date|hearing/i.test(questionText)) {
    ['due', 'date', 'hearing', 'issue', 'delivery', 'issued'].forEach((term) => queryTerms.add(term));
  }

  if (/step|procedural|next/i.test(questionText)) {
    [
      'step',
      'prepare',
      'file',
      'issued',
      'allocated',
      'review',
      'application',
      'directions',
      'proposes',
      'disclosure',
      'inspection',
      'witness',
      'expert',
      'reports',
      'consent',
      'order',
    ].forEach((term) => queryTerms.add(term));
  }

  const sentences = chunks.flatMap((chunk) => String(chunk.text || '')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => ({
      sentence,
      doc_name: chunk.doc_name,
      page: chunk.page,
      score: chunk.score,
      overlap: Array.from(queryTerms).filter((term) => sentence.toLowerCase().includes(term)).length,
      dateLike: /\b\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\b|\bdue\b|\bissue date\b|\bhearing\b/i.test(sentence),
    })));

  const dedupeRanked = (items) => {
    const seen = new Set();
    return items.filter((entry) => {
      const key = entry.sentence.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 220);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  let ranked = sentences
    .filter((entry) => entry.overlap > 0)
    .sort((left, right) => (right.overlap - left.overlap) || (right.score - left.score))
    .slice(0, 3);
  ranked = dedupeRanked(ranked);

  if (ranked.length === 0) {
    ranked = sentences
      .filter((entry) => entry.dateLike)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
    ranked = dedupeRanked(ranked);
  }

  if (ranked.length === 0) {
    ranked = sentences
      .sort((left, right) => right.score - left.score)
      .slice(0, 2);
    ranked = dedupeRanked(ranked);
  }

  if (ranked.length === 0) {
    return {
      answer: 'Insufficient evidence in the file to answer this question.',
      sources: [],
    };
  }

  const hasTopicalMatch = ranked.some((entry) => entry.overlap > 0 || entry.dateLike);
  const prefix = hasTopicalMatch
    ? ''
    : 'The file does not directly state the answer, but the closest indexed facts are: ';
  const answer = `${prefix}${ranked
    .map((entry) => `${entry.sentence} [Doc: ${entry.doc_name}, p.${entry.page}]`)
    .join(' ')}`;

  return {
    answer,
    sources: mapCitationsToSources([answer], chunks),
  };
}

function appendFallbackCitations(answer, chunks) {
  const cleaned = String(answer || '').trim();
  const sources = mapCitationsToSources([cleaned], chunks);
  if (sources.length > 0) {
    return { answer: cleaned, sources };
  }

  const uniqueChunks = [];
  const seen = new Set();
  for (const chunk of chunks || []) {
    const key = `${chunk.doc_name}:${chunk.page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueChunks.push(chunk);
    if (uniqueChunks.length >= 2) break;
  }

  if (uniqueChunks.length === 0) {
    return buildGroundedChatAnswer('', chunks);
  }

  const citationText = uniqueChunks
    .map((chunk) => `[Doc: ${chunk.doc_name}, p.${chunk.page}]`)
    .join(' ');
  return {
    answer: `${cleaned} ${citationText}`,
    sources: uniqueChunks.map((chunk) => ({
      doc_name: chunk.doc_name,
      page: Number(chunk.page),
      chunk_text: chunk.text,
      score: chunk.score,
    })),
  };
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
  return JSON.parse(extractJsonObject(responseText));
}

async function callClaude(handoffId, system, userMessage, maxTokens, options = {}) {
  const startedAt = Date.now();

  if (hasOpenAiCompatibleChat && openAiCompatibleClient) {
    try {
      const response = await openAiCompatibleClient.chat.completions.create({
        model: chatModel,
        temperature: 0,
        max_tokens: maxTokens,
        ...(options.expectJson ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content || '';
      const content = options.expectJson ? stripJsonResponseText(rawContent) : stripReasoningBlocks(rawContent);
      const latency = Date.now() - startedAt;
      const inputTokens = response.usage?.prompt_tokens ?? estimateTokenCount(`${system}\n${userMessage}`);
      const outputTokens = response.usage?.completion_tokens ?? estimateTokenCount(content);
      console.log(`[CLAUDE] handoff=${handoffId} tokens_in=${inputTokens} tokens_out=${outputTokens} latency=${latency}ms`);
      return String(content).trim();
    } catch (error) {
      throw createClaudeError(error.message || 'OpenAI-compatible chat request failed.', error.code || 'CLAUDE_REQUEST_FAILED', error);
    }
  }

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

    const rawContent = extractResponseText(response);
    return options.expectJson ? stripJsonResponseText(rawContent) : rawContent;
  } catch (error) {
    throw createClaudeError(error.message || 'Claude request failed.', error.code || 'CLAUDE_REQUEST_FAILED', error);
  }
}

function createReasoningStripper() {
  let buffer = '';
  let insideThinkBlock = false;
  const tagLookbehind = 8;

  function push(delta) {
    buffer += String(delta || '');
    let output = '';

    while (buffer.length > 0) {
      if (insideThinkBlock) {
        const endMatch = buffer.match(/<\/think>/i);
        if (!endMatch || typeof endMatch.index !== 'number') {
          buffer = buffer.slice(-tagLookbehind);
          return output;
        }

        buffer = buffer.slice(endMatch.index + endMatch[0].length);
        insideThinkBlock = false;
        continue;
      }

      const startMatch = buffer.match(/<think>/i);
      if (!startMatch || typeof startMatch.index !== 'number') {
        if (buffer.length <= tagLookbehind) {
          return output;
        }

        output += buffer.slice(0, -tagLookbehind);
        buffer = buffer.slice(-tagLookbehind);
        return output;
      }

      output += buffer.slice(0, startMatch.index);
      buffer = buffer.slice(startMatch.index + startMatch[0].length);
      insideThinkBlock = true;
    }

    return output;
  }

  function flush() {
    if (insideThinkBlock) {
      buffer = '';
      insideThinkBlock = false;
      return '';
    }

    const output = buffer;
    buffer = '';
    return output;
  }

  return { push, flush };
}

async function callClaudeStream(handoffId, system, userMessage, maxTokens, options = {}, onToken = () => {}) {
  const startedAt = Date.now();
  let content = '';
  const stripper = createReasoningStripper();
  const emit = (delta) => {
    content += String(delta || '');
    const visible = stripper.push(delta);
    if (visible) {
      onToken(visible);
    }
  };

  if (hasOpenAiCompatibleChat && openAiCompatibleClient) {
    try {
      const stream = await openAiCompatibleClient.chat.completions.create({
        model: chatModel,
        temperature: 0,
        max_tokens: maxTokens,
        stream: true,
        ...(options.expectJson ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
      });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          emit(delta);
        }
      }

      const tail = stripper.flush();
      if (tail) {
        onToken(tail);
      }

      const cleaned = stripReasoningBlocks(content);
      const latency = Date.now() - startedAt;
      const inputTokens = estimateTokenCount(`${system}\n${userMessage}`);
      const outputTokens = estimateTokenCount(cleaned);
      console.log(`[CLAUDE] handoff=${handoffId} tokens_in=${inputTokens} tokens_out=${outputTokens} latency=${latency}ms stream=true`);
      return cleaned.trim();
    } catch (error) {
      throw createClaudeError(error.message || 'OpenAI-compatible chat stream failed.', error.code || 'CLAUDE_STREAM_FAILED', error);
    }
  }

  if (!hasAnthropicKey) {
    const latency = Date.now() - startedAt;
    const inputTokens = estimateTokenCount(`${system}\n${userMessage}`);
    console.log(`[CLAUDE] handoff=${handoffId} tokens_in=${inputTokens} tokens_out=0 latency=${latency}ms stream=true`);
    throw createClaudeError('Anthropic API key is not configured for remote Claude calls.', 'CLAUDE_KEY_MISSING');
  }

  try {
    const stream = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: userMessage }],
      stream: true,
    });

    for await (const event of stream) {
      const delta = event?.type === 'content_block_delta' && event.delta?.type === 'text_delta'
        ? event.delta.text
        : '';
      if (delta) {
        emit(delta);
      }
    }

    const tail = stripper.flush();
    if (tail) {
      onToken(tail);
    }

    const cleaned = stripReasoningBlocks(content);
    const latency = Date.now() - startedAt;
    const inputTokens = estimateTokenCount(`${system}\n${userMessage}`);
    const outputTokens = estimateTokenCount(cleaned);
    console.log(`[CLAUDE] handoff=${handoffId} tokens_in=${inputTokens} tokens_out=${outputTokens} latency=${latency}ms stream=true`);
    return cleaned.trim();
  } catch (error) {
    throw createClaudeError(error.message || 'Claude stream failed.', error.code || 'CLAUDE_STREAM_FAILED', error);
  }
}

function localFactFromChunk(chunk, fallback = 'Not found in file.') {
  if (!chunk) {
    return fallback;
  }

  const sentence = cleanLegalSnippet(chunk.text);
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

  return `${cleanLegalSnippet(matched)} [Doc: ${chunk.doc_name}, p.${chunk.page}]`;
}

function localClaudeLog(handoffId, payload) {
  const outputTokens = estimateTokenCount(JSON.stringify(payload));
  console.log(`[CLAUDE] handoff=${handoffId} tokens_in=0 tokens_out=${outputTokens} latency=0ms`);
}

const INSUFFICIENT_EVIDENCE = 'Insufficient evidence in the file to answer this question.';

function buildChatFormatHint(question) {
  const q = String(question || '').toLowerCase();
  if (/\b(summary|overview|recap|tldr|resumen|sintetiza|panoramica|panorámica|que piensas|qué piensas|what do you think)\b/.test(q)) {
    return 'Treat this as a factual case brief. Use 5-7 short bullets covering parties, claim type/amount, procedural stage, deadlines/hearing, key risks, and next step. Every bullet needs a citation.';
  }
  if (/\b(what are|which are|list|enumerate|cuales|cuáles|enumera|menciona|deadlines|risks|documents|missing)\b/.test(q)) {
    return 'Use a short bulleted list. Only include items the chunks actually state.';
  }
  return 'Reply in 1-3 short sentences. Start with the practical answer. Cite the source sentence that supports it.';
}

function buildChatPromptParts(question, chunks, handoffContext = {}) {
  const parties = handoffContext.parties
    || [handoffContext.claimant, handoffContext.defendant].filter(Boolean).join(' v ')
    || `${handoffContext.client_name || ''} v ${handoffContext.opponent_name || ''}`.trim()
    || 'Unknown parties';
  const matterName = handoffContext.case_title || handoffContext.case_name || handoffContext.name || 'Unknown matter';
  const court = handoffContext.court || handoffContext.forum || handoffContext.court_or_tribunal || 'Unknown court';
  const conversation = buildConversationBlock(handoffContext.conversation_history);

  const systemPrompt = `You are CasePass Chat, a fast legal file assistant for solicitors, counsel, and receiving advocates in England and Wales.

CRITICAL OUTPUT RULE:
- Start directly with the user-facing answer.
- Do not write analysis, planning, "Analyze user input", "mental refinement", "final answer", chain-of-thought, or reasoning steps.
- Never mention the prompt, retrieval, metadata, chunks, or your internal process.
- If there is a mismatch between matter metadata and source chunks, say that plainly in one sentence and cite the source chunks.

Use the retrieved matter-file chunks as your evidence base, and use the matter metadata plus recent conversation only to understand context and follow-up questions.

RESPONSE STYLE:
- Be concise, direct, and helpful. Prefer 2-5 short bullets when the user asks what to do next.
- Start with the answer, then add the key file evidence.
- Write in plain English legal register. Use solicitor, counsel, claimant, defendant, proceedings, hearing, order.
- Match the language of the user's question. Keep document names, party names, amounts, and citation format unchanged.
- Do not expose chain-of-thought or describe your reasoning process.

GROUNDING RULES:
1. Every factual statement taken from the file must include an inline citation exactly as: [Doc: {doc_name}, p.{page}]
2. Do not invent dates, orders, deadlines, parties, filings, or procedural history.
3. You may give cautious practical next steps when they naturally follow from the cited file facts, but make clear if the file itself does not expressly say the step.
4. For follow-up questions, resolve pronouns such as "it", "that", "next", or "what do I do" using the recent conversation.
5. If the file contains related facts but not a complete answer, say what the file shows and what is missing. Ask for the missing document or instruction.
6. Use exactly "${INSUFFICIENT_EVIDENCE}" only when the provided chunks and conversation contain no relevant file fact at all.`;

  const userMessage = `Matter metadata:
- Matter: ${matterName}
- Court/forum: ${court}
- Parties: ${parties}

Recent conversation:
${conversation}

Retrieved source chunks:
${buildChunkBlock(chunks)}

Format hint:
${buildChatFormatHint(question)}

Current user question: ${question}

/no_think`;

  return { systemPrompt, userMessage };
}

function finaliseChatAnswer(question, answer, chunks) {
  const cleaned = stripReasoningBlocks(answer).trim();

  if (!cleaned) {
    return buildGroundedChatAnswer(question, chunks);
  }

  if (cleaned === INSUFFICIENT_EVIDENCE) {
    return buildGroundedChatAnswer(question, chunks);
  }

  if (/thinking process/i.test(cleaned)) {
    return buildGroundedChatAnswer(question, chunks);
  }

  if (extractDocCitations(cleaned).length === 0) {
    return appendFallbackCitations(cleaned, chunks);
  }

  const sources = mapCitationsToSources([cleaned], chunks);
  if (sources.length === 0) {
    return appendFallbackCitations(cleaned, chunks);
  }

  return { answer: cleaned, sources };
}

async function chatWithSources(question, chunks, handoffContext = {}) {
  const relevantChunks = ensureRelevantChunks(chunks);
  const handoffId = resolveHandoffId(handoffContext);
  if (!hasAnthropicKey && !hasOpenAiCompatibleChat) {
    const grounded = buildGroundedChatAnswer(question, relevantChunks);
    localClaudeLog(handoffId, grounded);
    return grounded;
  }

  const { systemPrompt, userMessage } = buildChatPromptParts(question, relevantChunks, handoffContext);
  const answer = await callClaude(handoffId, systemPrompt, userMessage, 650);

  return finaliseChatAnswer(question, answer, relevantChunks);
}

async function streamChatWithSources(question, chunks, handoffContext = {}, onToken = () => {}) {
  const relevantChunks = ensureRelevantChunks(chunks);
  const handoffId = resolveHandoffId(handoffContext);

  if (!hasAnthropicKey && !hasOpenAiCompatibleChat) {
    const response = await chatWithSources(question, relevantChunks, handoffContext);
    onToken(response.answer);
    return response;
  }

  const { systemPrompt, userMessage } = buildChatPromptParts(question, relevantChunks, handoffContext);
  const answer = await callClaudeStream(handoffId, systemPrompt, userMessage, 650, {}, onToken);
  return finaliseChatAnswer(question, answer, relevantChunks);
}

async function reviewMatter(handoffId, chunks, handoffData) {
  const relevantChunks = ensureRelevantChunks(chunks);
  if (!hasAnthropicKey && !hasOpenAiCompatibleChat) {
    const response = buildLocalMatterReview(relevantChunks, handoffData);
    localClaudeLog(handoffId, response);
    return response;
  }

  const systemPrompt = `You are a legal case analyst for CasePass. You will analyse the provided 
matter file chunks and produce a structured matter review.

STRICT RULES:
1. Every field in your output must cite its source: [Doc: {name}, p.{page}]
2. If a field cannot be determined from the file, write "Not found in file."
3. Never infer deadlines or dates not explicitly stated in the documents.
4. Summarise each string field in 35 words or fewer. Do not paste raw OCR, form headers, addresses, or whole chunks.
5. Make stage, event, urgent issues, and next step distinct. Do not repeat the same sentence in multiple fields.
6. Output must be valid JSON only. No preamble, no explanation, no markdown.`;
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
}

/no_think`;
  const responseText = await callClaude(handoffId, systemPrompt, userMessage, 2000, { expectJson: true });

  try {
    const parsed = parseStructuredJson(responseText);
    parsed.sources = mapCitationsToSources(collectStrings(parsed), relevantChunks);
    return parsed;
  } catch (_error) {
    return buildLocalMatterReview(relevantChunks, handoffData);
  }
}

function buildLocalMatterReview(relevantChunks, handoffData = {}) {
  const firstChunk = relevantChunks[0];
  const secondChunk = relevantChunks[1] || firstChunk;
  const stage = localFactFromChunk(firstChunk);
  const deadline =
    findChunkSentence(firstChunk, /live deadline|deadline|due by|defence due|hearing/i, 'Not found in file.') ||
    'Not found in file.';
  const nextStep = findChunkSentence(
    secondChunk,
    /next procedural step|next step|prepare|file|serve|proposed directions|directions/i,
    handoffData.next_hearing_date
      ? `Prepare for the next hearing on ${handoffData.next_hearing_date}. [Doc: ${firstChunk.doc_name}, p.${firstChunk.page}]`
      : localFactFromChunk(secondChunk),
  );
  const urgentIssue = findChunkSentence(
    secondChunk,
    /urgent issue|risk|missing|breach|failure|deadline|due|hearing/i,
    'Not found in file.',
  );

  return {
    stage_of_proceedings: stage,
    most_recent_operative_event: findChunkSentence(
      firstChunk,
      /most recent operative event|order dated|latest|issued|completed|served/i,
      stage,
    ),
    live_deadlines: [deadline],
    urgent_issues: [urgentIssue],
    missing_documents: [],
    next_procedural_step: nextStep,
    sources: mapCitationsToSources([stage, deadline, urgentIssue, nextStep], relevantChunks),
  };
}

async function generateHandoverNote(handoffId, chunks, handoffData, matterReview) {
  const relevantChunks = ensureRelevantChunks(chunks);
  if (!hasAnthropicKey && !hasOpenAiCompatibleChat) {
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
5. Keep each field concise. Do not paste raw OCR, form headers, addresses, or whole chunks.
6. Do not duplicate the same source sentence across current_procedural_status, next_required_step, and risk_flags.
7. Output must be valid JSON only. No preamble, no markdown fences.`;
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
}

/no_think`;
  const responseText = await callClaude(handoffId, systemPrompt, userMessage, 2000, { expectJson: true });

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
  if (!hasAnthropicKey && !hasOpenAiCompatibleChat) {
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
  const responseText = await callClaude(handoffId, systemPrompt, userMessage, 2000, { expectJson: true });

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
  streamChatWithSources,
  reviewMatter,
  generateHandoverNote,
  generateUpdateDraft,
  generateCaseSummary,
  __test__: {
    stripMarkdownFences,
    mapCitationsToSources,
    extractDocCitations,
    normaliseConversationHistory,
  },
};
