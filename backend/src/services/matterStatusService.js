const { query } = require('../db');

function getRunner(client) {
  return client || { query };
}

async function buildSourceRegister(caseId, handoffId, client = null) {
  const runner = getRunner(client);
  const result = await runner.query(
    `
      SELECT
        d.original_name AS document,
        d.page_count,
        d.privilege_flag,
        d.source_status,
        d.doc_type,
        d.status
      FROM documents d
      WHERE d.handoff_id = $1
        AND d.case_id = $2
      ORDER BY d.uploaded_at ASC
    `,
    [handoffId, caseId],
  );

  return result.rows.map((row) => ({
    document: row.document,
    pages_referenced: row.page_count,
    privilege_flag: row.privilege_flag,
    status: row.status,
    source_status: row.source_status,
    doc_type: row.doc_type,
  }));
}

async function snapshotMatterStatus(caseId, handoffId, snapshotBy = null, client = null) {
  const runner = getRunner(client);
  const handoffResult = await runner.query(
    `
      SELECT *
      FROM handoffs
      WHERE id = $1
        AND case_id = $2
    `,
    [handoffId, caseId],
  );

  if (!handoffResult.rows[0]) {
    throw Object.assign(new Error('Handoff not found for matter status snapshot.'), { code: 'HANDOFF_NOT_FOUND' });
  }

  const handoff = handoffResult.rows[0];
  const postActionResult = await runner.query(
    `
      SELECT *
      FROM post_action_updates
      WHERE handoff_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [handoffId],
  );
  const latestUpdate = postActionResult.rows[0];
  const sourceRegister = await buildSourceRegister(caseId, handoffId, client);
  const caseResult = await runner.query('SELECT * FROM cases WHERE id = $1', [caseId]);
  const caseRow = caseResult.rows[0] || {};
  const liveDeadlines = [];

  if (caseRow.aos_due) {
    liveDeadlines.push({ label: 'Acknowledgment of service due', date: caseRow.aos_due });
  }
  if (caseRow.defence_due) {
    liveDeadlines.push({ label: 'Defence due', date: caseRow.defence_due });
  }
  if (caseRow.bundle_due) {
    liveDeadlines.push({ label: 'Bundle due', date: caseRow.bundle_due });
  }
  if (caseRow.skeleton_due) {
    liveDeadlines.push({ label: 'Skeleton due', date: caseRow.skeleton_due });
  }
  if (caseRow.next_hearing_date) {
    liveDeadlines.push({ label: 'Next hearing date', date: caseRow.next_hearing_date });
  }

  const urgentFlags = [];
  if (caseRow.urgency) {
    urgentFlags.push({ level: caseRow.urgency });
  }
  if (caseRow.forum_uncertain) {
    urgentFlags.push({ level: 'forum_uncertain' });
  }
  if (caseRow.bundle_noncompliance_risk) {
    urgentFlags.push({ level: 'bundle_noncompliance_risk' });
  }
  if (caseRow.recording_risk_flag) {
    urgentFlags.push({ level: 'recording_risk_flag' });
  }

  const operativeEvent = latestUpdate?.what_happened || caseRow.most_recent_operative_event || handoff.intended_task || 'No verified operative event recorded.';
  const nextProceduralStep = latestUpdate?.what_follows || caseRow.next_procedural_step || handoff.intended_task || 'No next step recorded.';

  const result = await runner.query(
    `
      INSERT INTO matter_status_snapshots (
        case_id,
        handoff_id,
        operative_event,
        next_procedural_step,
        live_deadlines,
        urgent_flags,
        source_register,
        snapshot_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      caseId,
      handoffId,
      operativeEvent,
      nextProceduralStep,
      JSON.stringify(liveDeadlines),
      JSON.stringify(urgentFlags),
      JSON.stringify(sourceRegister),
      snapshotBy,
    ],
  );

  return result.rows[0];
}

async function getCurrentStatus(caseId, client = null) {
  const runner = getRunner(client);
  const result = await runner.query(
    `
      SELECT *
      FROM matter_status_snapshots
      WHERE case_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [caseId],
  );

  return result.rows[0] || null;
}

async function getStatusHistory(caseId, client = null) {
  const runner = getRunner(client);
  const result = await runner.query(
    `
      SELECT *
      FROM matter_status_snapshots
      WHERE case_id = $1
      ORDER BY created_at ASC
    `,
    [caseId],
  );

  return result.rows;
}

module.exports = {
  snapshotMatterStatus,
  getCurrentStatus,
  getStatusHistory,
};
