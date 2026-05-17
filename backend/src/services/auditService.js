const { query } = require('../db');

function createAuditError(message, code) {
  return Object.assign(new Error(message), { code });
}

function getRunner(client) {
  return client || { query };
}

async function logEvent(entityType, entityId, eventType, actorId, fromStatus, toStatus, metadata = {}, client = null) {
  if (!entityType || !entityId || !eventType) {
    throw createAuditError('Audit events require entity type, entity id, and event type.', 'AUDIT_EVENT_INVALID');
  }

  const runner = getRunner(client);
  const result = await runner.query(
    `
      INSERT INTO audit_events (
        entity_type,
        entity_id,
        event_type,
        actor_id,
        from_status,
        to_status,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [entityType, entityId, eventType, actorId, fromStatus, toStatus, metadata],
  );

  return result.rows[0];
}

async function getHandoffAuditTrail(handoffId, client = null) {
  const runner = getRunner(client);
  const result = await runner.query(
    `
      SELECT *
      FROM audit_events
      WHERE entity_type = 'handoff'
        AND entity_id = $1
      ORDER BY created_at ASC
    `,
    [handoffId],
  );

  return result.rows;
}

async function getCaseTimeline(caseId, client = null) {
  const runner = getRunner(client);
  const result = await runner.query(
    `
      SELECT ae.*
      FROM audit_events ae
      LEFT JOIN handoffs h
        ON ae.entity_type = 'handoff'
       AND ae.entity_id = h.id
      WHERE h.case_id = $1
         OR (ae.entity_type = 'case' AND ae.entity_id = $1)
      ORDER BY ae.created_at ASC
    `,
    [caseId],
  );

  return result.rows;
}

module.exports = {
  logEvent,
  getHandoffAuditTrail,
  getCaseTimeline,
};
