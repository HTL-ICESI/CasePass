const puppeteer = require('puppeteer');

/**
 * Generate a PDF buffer for a case summary.
 * @param {string} summaryMarkdown
 * @param {object} caseData
 * @returns {Promise<Buffer>}
 */
async function generateSummaryPDF(summaryMarkdown, caseData) {
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    const page = await browser.newPage();
    const title = caseData?.name || 'Resumen del caso';
    const safeMarkdown = String(summaryMarkdown || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // TODO: Replace this simple HTML wrapper with a styled legal-report template.
    await page.setContent(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 32px; color: #0f172a;">
          <h1>${title}</h1>
          <pre style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${safeMarkdown}</pre>
        </body>
      </html>
    `);

    return await page.pdf({ format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateSummaryPDF,
};
