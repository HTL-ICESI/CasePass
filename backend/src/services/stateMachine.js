const { logEvent } = require('./auditService');

const HANDOFF_TRANSITIONS = Object.freeze({
  draft: ['clearance_pending'],
  clearance_pending: ['clearance_failed', 'compliance_hold', 'file_upload_open', 'pack_building'],
  clearance_failed: [],
  compliance_hold: ['file_upload_open'],
  file_upload_open: ['pack_building'],
  pack_building: ['pack_review'],
  pack_review: ['pack_released'],
  pack_released: ['accepted'],
  accepted: ['task_in_progress'],
  task_in_progress: ['post_action_pending'],
  post_action_pending: ['update_draft'],
  update_draft: ['update_verified'],
  update_verified: ['routed'],
  routed: ['completed', 'escalated'],
  completed: [],
  escalated: [],
});

class InvalidStateTransitionError extends Error {
  constructor(currentStatus, targetStatus) {
    super(`Cannot transition handoff from ${currentStatus} to ${targetStatus}.`);
    this.code = 'INVALID_TRANSITION';
    this.statusCode = 409;
    this.current_status = currentStatus;
    this.attempted_status = targetStatus;
    this.allowed_next = HANDOFF_TRANSITIONS[currentStatus] || [];
    this.allowed_from = this.allowed_next;
  }
}

function validateTransition(currentStatus, nextStatus) {
  const allowedNext = HANDOFF_TRANSITIONS[currentStatus] || [];

  if (allowedNext.includes(nextStatus)) {
    return true;
  }

  throw new InvalidStateTransitionError(currentStatus, nextStatus);
}

async function assertValidTransition(currentStatus, targetStatus, options = {}) {
  try {
    validateTransition(currentStatus, targetStatus);
    return true;
  } catch (error) {
    const allowedTargets = HANDOFF_TRANSITIONS[currentStatus] || [];

    if (options.entityId) {
      const auditLogger = options.auditLogger || ((eventOptions) => logEvent(
        'handoff',
        options.entityId,
        'handoff.transition_blocked',
        options.actorId || null,
        currentStatus,
        targetStatus,
        eventOptions.metadata || {},
        options.client || null,
      ));

      await auditLogger({
        metadata: {
          reason: 'invalid_transition',
          attempted_to_status: targetStatus,
          allowed_statuses: allowedTargets,
        },
      });
    }

    throw error;
  }
}

module.exports = {
  HANDOFF_TRANSITIONS,
  InvalidStateTransitionError,
  validateTransition,
  assertValidTransition,
};
