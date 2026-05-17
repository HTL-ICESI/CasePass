const express = require('express');
const { searchChunks, getIndexedChunksForHandoff, getTopicSearchChunks } = require('../services/ragService');
const { chatWithSources, streamChatWithSources } = require('../services/claudeService');
const { query } = require('../db');

const router = express.Router();
const RECEIVER_CHAT_READY_STATUSES = ['pack_released', 'accepted', 'task_in_progress', 'post_action_pending', 'update_draft', 'update_verified', 'routed', 'completed', 'escalated'];
const SENDER_CHAT_BLOCKED_STATUSES = ['clearance_failed'];
const INSUFFICIENT_EVIDENCE = 'Insufficient evidence in the file to answer this question.';
const DEMO_CLAIM_NUMBER = 'E00DP123';
const DEMO_CASE_TITLE = 'Tech Solutions Ltd v Retail Dynamics Corp';
const DEMO_DOC_NAME = 'N1 Claim Form - Tech Solutions v Retail Dynamics.pdf';
const DEMO_SOURCE_PREVIEW = 'N1 claim form issued in the County Court Business Centre under claim E00DP123 on 1 March 2026. Tech Solutions Ltd claims GBP 87,500 in damages from Retail Dynamics Corp for alleged breach of a 1 January 2026 software development agreement.';
const SUMMARY_QUERY_PATTERNS = [
  /\b(summar(y|ise|ize)|overview|recap|brief\s+me|tldr|tl;dr|in\s+summary|give\s+me\s+(a|the)?\s*(summary|overview|recap|resume))\b/i,
  /(?:^|[^a-z])(resumen|resume|resumeme|resumelo|sintetizame|panoramica|panorama|resumir|sintetizar)(?:$|[^a-z])/i,
  /\b(que\s+(piensas|opinas)\s+(de|del)\s+(este\s+)?caso)\b/i,
  /\bwhat\s+do\s+you\s+think\s+of\s+(this|the)\s+(case|matter)\b/i,
];

function normaliseDiacritics(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isSummaryQuery(text) {
  const normalised = normaliseDiacritics(text);
  return SUMMARY_QUERY_PATTERNS.some((pattern) => pattern.test(normalised));
}

function isCaseGuidanceQuery(text) {
  const normalised = normaliseDiacritics(text);
  return /\b(next\s+step|what\s+(do|should)\s+i\s+do|deadline|hearing|directions?|prepare|file|serve|due|que\s+(hago|debo\s+hacer)|proximo\s+paso)\b/i.test(normalised);
}

function normaliseConversationHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message?.text === 'string')
    .slice(-6)
    .map((message) => ({
      role: message.role,
      text: message.text.trim().slice(0, 1200),
    }))
    .filter((message) => message.text);
}

function buildRetrievalQuery(question, history) {
  const recent = normaliseConversationHistory(history)
    .slice(-3)
    .map((message) => message.text)
    .join('\n');

  return [recent, question].filter(Boolean).join('\n');
}

function writeSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function isDemoCase(caseRow) {
  return caseRow?.claim_number === DEMO_CLAIM_NUMBER && caseRow?.case_title === DEMO_CASE_TITLE;
}

function buildDemoChatAnswer(question) {
  const q = normaliseDiacritics(question).toLowerCase();
  const source = {
    doc_name: DEMO_DOC_NAME,
    page: 1,
    chunk_text: DEMO_SOURCE_PREVIEW,
    score: 0.99,
  };

  if (/\b(next|step|what do|should i|deadline|hearing|due|que hago|debo|proximo|pr[oó]ximo)\b/i.test(q)) {
    return {
      answer: [
        `The immediate step is to confirm service of the N1, calculate the acknowledgement of service and defence dates, and prepare the defendant response strategy. [Doc: ${DEMO_DOC_NAME}, p.1]`,
        `The claim was issued on 1 March 2026 in the County Court Business Centre under claim E00DP123, so the response timetable should be checked from that date and the service evidence. [Doc: ${DEMO_DOC_NAME}, p.1]`,
      ].join('\n\n'),
      sources: [source],
    };
  }

  if (/\b(amount|value|damages|money|cuanto|cu[aá]nto|claim)\b/i.test(q)) {
    return {
      answer: `The N1 pleads GBP 87,500 in damages, plus interest, costs, and any further relief the court considers appropriate. [Doc: ${DEMO_DOC_NAME}, p.1]`,
      sources: [source],
    };
  }

  return {
    answer: [
      `This is a Part 7 commercial contract claim by Tech Solutions Ltd against Retail Dynamics Corp in the County Court Business Centre. [Doc: ${DEMO_DOC_NAME}, p.1]`,
      `The core allegation is that Retail Dynamics failed to support delivery of a bespoke inventory-management system under the 1 January 2026 software agreement, causing claimed losses of GBP 87,500 plus interest and costs. [Doc: ${DEMO_DOC_NAME}, p.1]`,
    ].join('\n\n'),
    sources: [source],
  };
}

function canChatWithHandoff(handoff, user) {
  if (user.role === 'admin') {
    return true;
  }

  if (handoff.sending_solicitor_id === user.id) {
    return !SENDER_CHAT_BLOCKED_STATUSES.includes(handoff.status);
  }

  if (handoff.receiving_solicitor_id === user.id) {
    return RECEIVER_CHAT_READY_STATUSES.includes(handoff.status);
  }

  return false;
}

function chatAccessError(handoff, user) {
  if (handoff.receiving_solicitor_id === user.id && !RECEIVER_CHAT_READY_STATUSES.includes(handoff.status)) {
    return {
      status: 403,
      body: {
        error: 'Chat will be available to the receiving solicitor once the handover pack has been released.',
        code: 'PACK_NOT_RELEASED',
      },
    };
  }

  return {
    status: 403,
    body: { error: 'You do not have access to chat for this handoff.' },
  };
}

async function getAccessibleCase(caseId, userId, role) {
  const result = await query(
    `
      SELECT *
      FROM cases
      WHERE id = $1
        AND (
          $3 = 'admin'
          OR created_by = $2
          OR solicitor_on_record_id = $2
          OR EXISTS (
            SELECT 1 FROM handoffs h
            WHERE h.case_id = cases.id
              AND h.receiving_solicitor_id = $2
          )
        )
    `,
    [caseId, userId, role],
  );

  return result.rows[0] || null;
}

async function prepareChatRequest(req) {
  const { question, handoff_id: handoffId = null, conversation_history: conversationHistory = [] } = req.body;

  if (!question || !String(question).trim()) {
    return { status: 422, body: { error: 'A question is required.' } };
  }

  const caseRow = await getAccessibleCase(req.params.id, req.user.id, req.user.role);
  if (!caseRow) {
    return { status: 403, body: { error: 'You do not have access to this case.' } };
  }

  let resolvedHandoffId = handoffId;
  if (resolvedHandoffId) {
    const handoffResult = await query(
      'SELECT * FROM handoffs WHERE id = $1 AND case_id = $2',
      [resolvedHandoffId, req.params.id],
    );
    const handoff = handoffResult.rows[0];

    if (!handoff) {
      return { status: 404, body: { error: 'Handoff not found.' } };
    }

    if (!canChatWithHandoff(handoff, req.user)) {
      return chatAccessError(handoff, req.user);
    }
  } else {
    const handoffResult = await query(
      `
        SELECT *
        FROM handoffs
        WHERE case_id = $1
        ORDER BY created_at DESC
      `,
      [req.params.id],
    );
    resolvedHandoffId = handoffResult.rows.find((handoff) => canChatWithHandoff(handoff, req.user))?.id || null;
  }

  if (!resolvedHandoffId) {
    return {
      status: 200,
      body: {
        answer: INSUFFICIENT_EVIDENCE,
        sources: [],
      },
    };
  }

  const history = normaliseConversationHistory(conversationHistory);
  if (isDemoCase(caseRow)) {
    return {
      question: String(question).trim(),
      resolvedHandoffId,
      caseRow,
      chunks: [],
      history,
      demoAnswer: buildDemoChatAnswer(String(question).trim()),
    };
  }

  const retrievalQuery = buildRetrievalQuery(question, history);
  let chunks = [];
  if (isSummaryQuery(question) || isCaseGuidanceQuery(question)) {
    try {
      chunks = await getTopicSearchChunks(resolvedHandoffId, 12);
    } catch (_error) {
      chunks = [];
    }
  } else {
    chunks = await searchChunks(retrievalQuery, resolvedHandoffId, 5);
  }

  if (chunks.length === 0 || chunks.every((chunk) => chunk.score < 0.35)) {
    chunks = await getIndexedChunksForHandoff(resolvedHandoffId, 5);
  }

  if (chunks.length === 0 || chunks.every((chunk) => chunk.score < 0.35)) {
    return {
      status: 200,
      body: {
        answer: INSUFFICIENT_EVIDENCE,
        sources: [],
      },
    };
  }

  return {
    question: String(question).trim(),
    resolvedHandoffId,
    caseRow,
    chunks,
    history,
    demoAnswer: null,
  };
}

router.post('/cases/:id/chat', async (req, res) => {
  try {
    const prepared = await prepareChatRequest(req);
    if (prepared.status) {
      return res.status(prepared.status).json(prepared.body);
    }

    if (prepared.demoAnswer) {
      return res.json(prepared.demoAnswer);
    }

    const response = await chatWithSources(prepared.question, prepared.chunks, {
      handoff_id: prepared.resolvedHandoffId,
      case_title: prepared.caseRow.case_title,
      forum: prepared.caseRow.forum,
      claimant: prepared.caseRow.claimant,
      defendant: prepared.caseRow.defendant,
      conversation_history: prepared.history,
    });

    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to process chat request.' });
  }
});

router.post('/cases/:id/chat/stream', async (req, res) => {
  try {
    const prepared = await prepareChatRequest(req);
    if (prepared.status) {
      if (prepared.status === 200) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        });
        writeSse(res, 'final', { ...prepared.body, done: true });
        return res.end();
      }
      return res.status(prepared.status).json(prepared.body);
    }

    if (prepared.demoAnswer) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      writeSse(res, 'final', { ...prepared.demoAnswer, done: true });
      return res.end();
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    writeSse(res, 'status', { message: 'Reading the indexed file...' });

    const response = await streamChatWithSources(prepared.question, prepared.chunks, {
      handoff_id: prepared.resolvedHandoffId,
      case_title: prepared.caseRow.case_title,
      forum: prepared.caseRow.forum,
      claimant: prepared.caseRow.claimant,
      defendant: prepared.caseRow.defendant,
      conversation_history: prepared.history,
    }, (token) => {
      writeSse(res, 'delta', { text: token });
    });

    writeSse(res, 'final', { ...response, done: true });
    return res.end();
  } catch (error) {
    if (res.headersSent) {
      writeSse(res, 'error', { error: error.message || 'Unable to process chat request.' });
      return res.end();
    }
    return res.status(500).json({ error: error.message || 'Unable to process chat request.' });
  }
});

module.exports = router;
