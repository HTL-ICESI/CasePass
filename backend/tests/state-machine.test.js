const { validateTransition } = require('../src/services/stateMachine');

describe('state machine', () => {
  test('valid transitions pass', () => {
    expect(() => validateTransition('draft', 'clearance_pending')).not.toThrow();
    expect(() => validateTransition('update_verified', 'routed')).not.toThrow();
    expect(() => validateTransition('routed', 'completed')).not.toThrow();
    expect(() => validateTransition('routed', 'escalated')).not.toThrow();
  });

  test('invalid transitions throw INVALID_TRANSITION', () => {
    expect(() => validateTransition('draft', 'pack_released')).toThrow();
    expect(() => validateTransition('clearance_failed', 'file_upload_open')).toThrow();
    expect(() => validateTransition('completed', 'draft')).toThrow();
  });
});
