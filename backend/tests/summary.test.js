jest.mock('../src/services/claudeService', () => ({
  generateCaseSummary: jest.fn().mockResolvedValue('# Summary'),
}));
jest.mock('../src/services/pdfService', () => ({
  generateSummaryPDF: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
}));

const request = require('supertest');
const { resetDomainData, createCase } = require('./helpers');
const { app } = require('../src/index');

describe('summary route', () => {
  beforeEach(async () => {
    await resetDomainData();
  });

  test('POST /api/cases/:id/summary returns a PDF download', async () => {
    const caseRow = await createCase(global.testContext.user1.id);
    const response = await request(app)
      .post(`/api/cases/${caseRow.id}/summary`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('CasePass_');
    expect(response.body.length).toBeGreaterThan(0);
  });
});
