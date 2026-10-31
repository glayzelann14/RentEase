import type { DepositSettlement } from './depositSettlements';

/** Prints only finalized / settled records. Never treat pending refunds as paid. */
export function printDepositSettlement(settlement: DepositSettlement): void {
  if (!['finalized', 'settled'].includes(settlement.status)) {
    window.alert('Only finalized or settled deposit statements can be printed.');
    return;
  }

  // Escape all server-supplied text before inserting it into the print document.
  const escapeHtml = (value: unknown): string => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const peso = (value: string | number): string =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
      .format(Number(value || 0));
  const date = (value: string | null): string =>
    value ? new Date(value).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : '—';
  const money = (value: string | number): string => escapeHtml(peso(value));
  const summary = settlement.summary;
  const deductionRows = settlement.deductions.length
    ? settlement.deductions.map(item => `<tr><td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.evidence_note || '—')}</td><td class="num">${money(item.amount)}</td></tr>`).join('')
    : '<tr><td colspan="3">No deductions recorded.</td></tr>';
  const refundRows = settlement.refunds.length
    ? settlement.refunds.map(item => `<tr><td>${escapeHtml(date(item.created_at))}</td><td>${escapeHtml(item.payment_method)}</td><td>${escapeHtml(item.reference_number || '—')}</td><td>${escapeHtml(item.status.toUpperCase())}</td><td class="num">${money(item.amount)}</td></tr>`).join('')
    : '<tr><td colspan="5">No refund transactions recorded.</td></tr>';

  const printWindow = window.open('', '_blank', 'width=960,height=760');
  if (!printWindow) {
    window.alert('Please allow pop-ups for RentEase to print the settlement statement.');
    return;
  }

  const markup = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
  <title>RentEase Deposit Settlement #${Number(settlement.settlement_id)}</title>
  <style>
  *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1e3556;margin:36px;line-height:1.5}
  .top{display:flex;justify-content:space-between;align-items:start;border-bottom:3px solid #174b99;padding-bottom:15px}
  h1{font-size:22px;margin:0}h2{font-size:15px;margin:24px 0 8px;color:#153d78}
  p{margin:4px 0}.muted{color:#5b6b82;font-size:12px}.label{font-size:11px;text-transform:uppercase;color:#65758b}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0}
  .box{border:1px solid #dce5f1;border-radius:8px;padding:12px}
  .figure{font-size:18px;font-weight:700}table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{padding:9px 8px;border-bottom:1px solid #dce5f1;text-align:left;vertical-align:top}
  th{background:#eef4fc;color:#193f7c}.num{text-align:right;white-space:nowrap}
  .notice{font-size:12px;background:#f4f7fb;padding:12px;margin-top:20px}
  .print{background:#174b99;color:white;padding:10px 15px;border:0;border-radius:6px;cursor:pointer;margin-bottom:20px}
  @media print{body{margin:14mm}.print{display:none} .box{break-inside:avoid}h2{break-after:avoid}}
  </style></head><body>
  <button class="print" onclick="window.print()">Print / Save as PDF</button>
  <div class="top"><div><h1>RentEase</h1><p>Security Deposit Settlement Statement</p><p class="muted">Record #${Number(settlement.settlement_id)} · Lease #${Number(settlement.lease_id)}</p></div>
  <div><strong>${escapeHtml(settlement.status.toUpperCase())}</strong><p class="muted">Finalized: ${escapeHtml(date(settlement.finalized_at))}</p><p class="muted">Settled: ${escapeHtml(date(settlement.settled_at))}</p></div></div>
  <div class="grid"><div><p class="label">Tenant</p><strong>${escapeHtml(settlement.tenant_name)}</strong></div><div><p class="label">Rental property / unit</p><strong>${escapeHtml(settlement.property_name)} — Unit ${escapeHtml(settlement.unit_number)}</strong></div></div>
  <div class="grid">
  <div class="box"><p class="label">Verified deposit collected</p><p class="figure">${money(summary.verified_deposit)}</p></div>
  <div class="box"><p class="label">Total documented deductions</p><p class="figure">${money(summary.total_deductions)}</p></div>
  <div class="box"><p class="label">Refundable amount</p><p class="figure">${money(summary.refundable_amount)}</p></div>
  <div class="box"><p class="label">Confirmed refunds</p><p class="figure">${money(summary.confirmed_refunds)}</p></div>
  <div class="box"><p class="label">Pending refunds (not yet paid)</p><p class="figure">${money(summary.pending_refunds)}</p></div>
  <div class="box"><p class="label">Remaining refund balance</p><p class="figure">${money(summary.remaining_refund)}</p></div>
  </div>
  <h2>Itemized Deductions</h2><table><thead><tr><th>Reason</th><th>Evidence note</th><th class="num">Amount</th></tr></thead><tbody>${deductionRows}</tbody></table>
  <h2>Refund Transactions</h2><table><thead><tr><th>Recorded date</th><th>Method</th><th>Reference</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>${refundRows}</tbody></table>
  <p class="notice">This statement summarizes transactions recorded in RentEase. Pending refunds are not proof of payment. A confirmed refund records an owner-confirmed payout and is not an independent bank receipt. Review supporting evidence and lease terms for any disputed deduction.</p>
  </body></html>`;
  printWindow.document.open();
  printWindow.document.write(markup);
  printWindow.document.close();
  printWindow.focus();
}
