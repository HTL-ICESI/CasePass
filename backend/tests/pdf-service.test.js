describe('pdfService core', () => {
  afterEach(() => {
    jest.resetModules();
  });

  test('generateSummaryPDF renders HTML and returns a PDF buffer', async () => {
    const setContent = jest.fn().mockResolvedValue(undefined);
    const pdf = jest.fn().mockResolvedValue(Buffer.from('pdf-buffer'));
    const close = jest.fn().mockResolvedValue(undefined);
    const newPage = jest.fn().mockResolvedValue({ setContent, pdf });
    const launch = jest.fn().mockResolvedValue({ newPage, close });

    jest.doMock('puppeteer', () => ({ launch }));
    const { generateSummaryPDF } = require('../src/services/pdfService');

    const result = await generateSummaryPDF('# Summary', {
      case_title: 'Example Matter',
      claim_number: 'CLM-100',
      forum: 'county_court',
      claimant: 'Claimant Ltd',
      defendant: 'Defendant Ltd',
      most_recent_operative_event: 'Order made',
      next_procedural_step: 'Prepare witness evidence',
      next_hearing_date: '2026-06-20',
      checklist_items: [{ label: 'Prepare bundle', completed: true }],
      updates: [{ created_at: '2026-05-16', content: 'Updated' }],
      documents: [{ original_name: 'order.pdf', page_count: 2, privilege_flag: true, status: 'indexed' }],
    });

    expect(launch).toHaveBeenCalledWith({ args: ['--no-sandbox'] });
    expect(setContent).toHaveBeenCalledWith(expect.stringContaining('CONFIDENTIAL — LEGAL PROFESSIONAL PRIVILEGE'), { waitUntil: 'networkidle0' });
    expect(setContent.mock.calls[0][0]).toContain('Matter Identification');
    expect(setContent.mock.calls[0][0]).toContain('Source Register');
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe('pdf-buffer');
    expect(close).toHaveBeenCalled();
  });
});
