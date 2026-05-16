const test = require('node:test');
const assert = require('node:assert/strict');

const { assertValidTransition, InvalidStateTransitionError } = require('../src/services/stateMachine');

test('allows draft to clearance_pending', async () => {
  await assert.doesNotReject(() => assertValidTransition('draft', 'clearance_pending', {
    entityId: 'handoff-1',
    actorId: 'user-1',
    auditLogger: async () => {},
  }));
});

test('blocks pack_released to pack_building with conflict metadata', async () => {
  await assert.rejects(
    () => assertValidTransition('pack_released', 'pack_building', {
      entityId: 'handoff-2',
      actorId: 'user-2',
      auditLogger: async () => {},
    }),
    (error) => {
      assert.equal(error instanceof InvalidStateTransitionError, true);
      assert.equal(error.code, 'INVALID_HANDOFF_TRANSITION');
      assert.equal(error.current_status, 'pack_released');
      assert.deepEqual(error.allowed_from, ['accepted']);
      return true;
    },
  );
});
