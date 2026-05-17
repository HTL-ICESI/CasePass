const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

const CASE_TITLE = 'Tech Solutions Ltd v Retail Dynamics Corp';
const OLD_CASE_TITLE = `DEMO READY - ${CASE_TITLE}`;
const CLAIM_NUMBER = 'E00DP123';
const DOC_NAME = 'N1 Claim Form - Tech Solutions v Retail Dynamics.pdf';
const STORED_FILENAME = 'demo-ready-n1-claim-form.pdf';

const sourcePdf = path.resolve(__dirname, '../../casos-prueba/N1_Claim_Form.pdf');
const uploadDir = path.resolve(__dirname, '../uploads');
const storedPdf = path.join(uploadDir, STORED_FILENAME);

const sourcePreview =
  'N1 claim form issued in the County Court Business Centre under claim E00DP123 on 1 March 2026. Tech Solutions Ltd claims GBP 87,500 in damages from Retail Dynamics Corp for alleged breach of a 1 January 2026 software development agreement.';

function citation(page = 1) {
  return `[Doc: ${DOC_NAME}, p.${page}]`;
}

function buildAiDraft() {
  return {
    executive_summary:
      `Tech Solutions Ltd has issued a Part 7 County Court claim against Retail Dynamics Corp for alleged breach of a software development and licensing agreement. ${citation(1)} The pleaded value is GBP 87,500 in damages, with interest, costs, and further relief also claimed. ${citation(1)}`,
    current_procedural_status:
      `The N1 claim form has been issued in the County Court Business Centre under claim number E00DP123, so the matter is at the initial claim / response timetable stage. ${citation(1)}`,
    next_required_step:
      `Confirm service of the claim form, calculate the acknowledgement of service and defence deadlines, and prepare the defendant response strategy. ${citation(1)}`,
    live_deadlines: [
      `The issue date is 1 March 2026; use it to verify the service, acknowledgement of service, and defence timetable. ${citation(1)}`,
      `The handoff records a directions hearing on 16 June 2026, so preparation should focus on pleadings, allocation, and directions. ${citation(1)}`,
    ],
    risk_flags: [
      `The pleaded breach turns on missed project milestones, suspended project access, and unpaid milestone sums, so liability, causation, and quantum need early review. ${citation(1)}`,
    ],
    task_scope:
      'Limited review for receiving counsel: assess the N1, identify immediate response steps, and prepare for directions.',
    file_based_facts: [
      `Claimant: Tech Solutions Ltd. Defendant: Retail Dynamics Corp. ${citation(1)}`,
      `The agreement relied on is dated 1 January 2026 and concerns a bespoke multi-site inventory-management system. ${citation(1)}`,
      `The claim pleads damages of GBP 87,500, plus interest and costs. ${citation(1)}`,
    ],
    strategic_notes: [
      'Strategic note: For the demo, this handoff is already released to the receiver so both sender and receiver can open the same polished matter.',
    ],
    sources: [
      {
        doc_name: DOC_NAME,
        page: 1,
        chunk_text: sourcePreview,
        score: 0.99,
      },
      {
        doc_name: DOC_NAME,
        page: 2,
        chunk_text:
          'The particulars plead unpaid milestone sums, wasted staff costs, loss of anticipated profit, statutory interest, costs, and further relief.',
        score: 0.92,
      },
    ],
  };
}

async function main() {
  await fs.promises.mkdir(uploadDir, { recursive: true });
  await fs.promises.copyFile(sourcePdf, storedPdf);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const users = await client.query(
      `
        SELECT id, email
        FROM users
        WHERE email IN ('sender@integrated.local', 'receiver@integrated.local')
      `,
    );
    const sender = users.rows.find((user) => user.email === 'sender@integrated.local');
    const receiver = users.rows.find((user) => user.email === 'receiver@integrated.local');

    if (!sender || !receiver) {
      throw new Error('Demo users are missing. Expected sender@integrated.local and receiver@integrated.local.');
    }

    await client.query(
      `
        DELETE FROM cases
        WHERE case_title IN ($1, $3)
          AND claim_number = $2
      `,
      [CASE_TITLE, CLAIM_NUMBER, OLD_CASE_TITLE],
    );

    const caseResult = await client.query(
      `
        INSERT INTO cases (
          case_title, claim_number, claimant, defendant,
          forum, court_name, ruleset, claim_type, part7_or_part8, track,
          issue_date, service_method, aos_due, defence_due,
          next_hearing_type, next_hearing_date, hearing_mode,
          disclosure_regime, costs_regime,
          solicitor_on_record_id, human_verified, last_verified_by, last_verified_at,
          solicitor_notes, strategic_notes, most_recent_operative_event, next_procedural_step,
          urgency, created_by, created_at, updated_at
        )
        VALUES (
          $1, $2, 'Tech Solutions Ltd', 'Retail Dynamics Corp',
          'county_court', 'County Court Business Centre', 'CPR', 'Commercial contract claim', 'Part7', 'multi_track',
          '2026-03-01', 'To be confirmed from service evidence', '2026-03-15', '2026-03-29',
          'Directions hearing', '2026-06-16', 'remote',
          'Part31_standard', 'standard_basis',
          $3, TRUE, $3, NOW(),
          $4, $5, $6, $7,
          'urgent', $3, NOW(), NOW()
        )
        RETURNING *
      `,
      [
        CASE_TITLE,
        CLAIM_NUMBER,
        sender.id,
        'N1 issued for a commercial software dispute; defendant response timetable must be checked immediately.',
        'Demo matter seeded with curated review text and citation metadata.',
        'N1 claim form issued on 1 March 2026 in the County Court Business Centre.',
        'Confirm service, calculate AOS and defence dates, and prepare directions strategy.',
      ],
    );
    const caseRow = caseResult.rows[0];

    const handoffResult = await client.query(
      `
        INSERT INTO handoffs (
          case_id, sending_solicitor_id, receiving_solicitor_id,
          handoff_type, rights_of_audience_verified, rights_of_audience_forum,
          clearance_result, clearance_notes, clearance_completed_at,
          intended_task, task_scope, status,
          created_at, updated_at
        )
        VALUES (
          $1, $2, $3,
          'external_agent', TRUE, 'county_court',
          'approved', 'Demo clearance pre-approved for presentation.', NOW(),
          'Review the N1 claim form, identify immediate response deadlines, and prepare for the directions hearing.',
          'limited', 'pack_released',
          NOW(), NOW()
        )
        RETURNING *
      `,
      [caseRow.id, sender.id, receiver.id],
    );
    const handoff = handoffResult.rows[0];

    await client.query(
      `
        INSERT INTO documents (
          case_id, handoff_id, filename, original_name, doc_type,
          source_status, status, chunks_count, page_count, uploaded_by, uploaded_at
        )
        VALUES ($1, $2, $3, $4, 'pleading', 'original', 'indexed', 2, 2, $5, NOW())
      `,
      [caseRow.id, handoff.id, STORED_FILENAME, DOC_NAME, sender.id],
    );

    const draft = buildAiDraft();
    await client.query(
      `
        INSERT INTO handover_notes (
          handoff_id, ai_draft, ai_generated_at, ai_token_count,
          solicitor_edited, approved_by, approved_at, version_number, created_at
        )
        VALUES ($1, $2::jsonb, NOW(), $3, $2::jsonb, $4, NOW(), 1, NOW())
      `,
      [handoff.id, JSON.stringify(draft), JSON.stringify(draft).length, sender.id],
    );

    await client.query(
      `
        INSERT INTO case_updates (case_id, content, created_by, created_at)
        VALUES ($1, $2, $3, NOW())
      `,
      [caseRow.id, 'Demo handoff pack released with N1 claim form and curated citation-backed summary.', sender.id],
    );

    await client.query('COMMIT');

    console.log(JSON.stringify({
      caseId: caseRow.id,
      handoffId: handoff.id,
      title: CASE_TITLE,
      sender: 'sender@integrated.local',
      receiver: 'receiver@integrated.local',
      url: `http://localhost:8080/handoffs/${handoff.id}`,
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
