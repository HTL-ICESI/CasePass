const puppeteer = require('puppeteer');

function createPdfError(message, code, cause) {
  const error = Object.assign(new Error(message), { code });
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(items, formatter) {
  if (!items || items.length === 0) {
    return '<li>None recorded.</li>';
  }

  return items.map((item) => `<li>${formatter(item)}</li>`).join('');
}

function normaliseSources(caseData) {
  return (caseData.documents || []).map((document) => ({
    document: document.original_name,
    pages: document.page_count || '-',
    privilege_flag: document.privilege_flag ? 'Yes' : 'No',
    status: document.status || 'unknown',
  }));
}

async function generateSummaryPDF(summaryMarkdown, caseData) {
  let browser;

  try {
    const sourceRegister = normaliseSources(caseData);
    const checklistItems = caseData.checklist_items || [];
    const updates = [...(caseData.updates || [])].sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
    const generatedAt = new Date().toISOString();
    const parties = `${caseData.claimant || 'Claimant'} / ${caseData.defendant || 'Defendant'}`;

    const htmlString = `
      <html>
        <body style="margin:0;background:#ffffff;color:#1f2937;font-family:Georgia, 'Times New Roman', serif;">
          <div style="padding:32px;">
            <div style="background:#0f2744;color:#ffffff;padding:20px 24px;border-radius:12px;">
              <div style="font-size:28px;font-weight:700;letter-spacing:0.04em;">CasePass</div>
              <div style="margin-top:8px;font-size:12px;font-weight:700;letter-spacing:0.08em;">CONFIDENTIAL — LEGAL PROFESSIONAL PRIVILEGE</div>
            </div>

            <h2 style="color:#0f2744;margin-top:28px;">Matter Identification</h2>
            <p><strong>Case name:</strong> ${escapeHtml(caseData.case_title || 'Unknown matter')}</p>
            <p><strong>Reference:</strong> ${escapeHtml(caseData.claim_number || 'Unknown reference')}</p>
            <p><strong>Court:</strong> ${escapeHtml(caseData.court_name || caseData.forum || 'Unknown court')}</p>
            <p><strong>Parties:</strong> ${escapeHtml(parties)}</p>
            <p><strong>Date generated:</strong> ${escapeHtml(generatedAt)}</p>

            <h2 style="color:#0f2744;">Last Operative Event</h2>
            <p>${escapeHtml(caseData.most_recent_operative_event || 'Not found in file.')}</p>

            <h2 style="color:#0f2744;">Next Required Step</h2>
            <p>${escapeHtml(caseData.next_procedural_step || 'Not found in file.')}</p>

            <h2 style="color:#0f2744;">Live Deadlines</h2>
            <ul>${renderList([
              caseData.aos_due ? `AOS due: ${caseData.aos_due}` : null,
              caseData.defence_due ? `Defence due: ${caseData.defence_due}` : null,
              caseData.bundle_due ? `Bundle due: ${caseData.bundle_due}` : null,
              caseData.skeleton_due ? `Skeleton due: ${caseData.skeleton_due}` : null,
              caseData.next_hearing_date ? `Next hearing date: ${caseData.next_hearing_date}` : null,
            ].filter(Boolean), (item) => escapeHtml(item))}</ul>

            <h2 style="color:#0f2744;">Alerts and Risk Flags</h2>
            <ul>${renderList([
              ...(caseData.alerts || []).map((alert) => alert.content),
              caseData.forum_uncertain ? 'Forum uncertain.' : null,
              caseData.bundle_noncompliance_risk ? 'Bundle noncompliance risk.' : null,
              caseData.recording_risk_flag ? 'Recording risk acknowledged.' : null,
            ].filter(Boolean), (item) => escapeHtml(item))}</ul>

            <h2 style="color:#0f2744;">Checklist</h2>
            <ul style="list-style:none;padding-left:0;">${renderList(checklistItems, (item) => `${item.completed ? '&#9745;' : '&#9744;'} ${escapeHtml(item.label)}`)}</ul>

            <h2 style="color:#0f2744;">Instructed Solicitor Notes</h2>
            <div style="white-space:pre-wrap;">${escapeHtml(caseData.solicitor_notes || caseData.strategic_notes || 'No instructed solicitor notes recorded.')}</div>

            <h2 style="color:#0f2744;">Updates</h2>
            <ul>${renderList(updates, (item) => `${escapeHtml(item.created_at || '')}: ${escapeHtml(item.content || item.verified_version || item.what_happened || 'Update recorded.')}`)}</ul>

            <h2 style="color:#0f2744;">AI Summary Markdown</h2>
            <pre style="white-space:pre-wrap;background:#f8fafc;padding:16px;border-radius:12px;font-family:Georgia, 'Times New Roman', serif;">${escapeHtml(summaryMarkdown || '')}</pre>

            <h2 style="color:#0f2744;">Source Register</h2>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#0f2744;color:#ffffff;">
                  <th style="padding:10px;border:1px solid #d1d5db;text-align:left;">Document</th>
                  <th style="padding:10px;border:1px solid #d1d5db;text-align:left;">Pages Referenced</th>
                  <th style="padding:10px;border:1px solid #d1d5db;text-align:left;">Privilege Flag</th>
                  <th style="padding:10px;border:1px solid #d1d5db;text-align:left;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${sourceRegister.map((row, index) => `
                  <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f5f5f5'};">
                    <td style="padding:10px;border:1px solid #d1d5db;">${escapeHtml(row.document)}</td>
                    <td style="padding:10px;border:1px solid #d1d5db;font-family:'Courier New', monospace;">${escapeHtml(row.pages)}</td>
                    <td style="padding:10px;border:1px solid #d1d5db;">${escapeHtml(row.privilege_flag)}</td>
                    <td style="padding:10px;border:1px solid #d1d5db;">${escapeHtml(row.status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="margin-top:32px;padding-top:12px;border-top:1px solid #d1d5db;font-size:11px;color:#4b5563;">
              Generated by CasePass. AI outputs reviewed and approved by instructed solicitor. Not for filing without solicitor sign-off.
            </div>
          </div>
        </body>
      </html>
    `;

    browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlString, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    browser = null;
    return pdfBuffer;
  } catch (error) {
    if (browser) {
      await browser.close();
    }

    throw createPdfError(error.message || 'Failed to generate summary PDF.', error.code || 'PDF_GENERATION_FAILED', error);
  }
}

module.exports = {
  generateSummaryPDF,
};
