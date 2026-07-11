'use client';

import { db, persistenceReady } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Group } from '@/lib/types';
import type { IntelligenceInsights } from '@/services/intelligence-service';
import { formatDistanceToNow, format } from 'date-fns';
import { safeDate } from '@/utils/date';
import { formatDuration } from '@/utils/format';

/**
 * Queues a pulse report email in the 'mail' collection for Firebase Extension processing.
 * Refactored to a clean tabular format.
 */
export async function queuePulseReport(
  to: string, 
  group: Group, 
  insights: IntelligenceInsights
) {
  if (!to || !to.includes('@')) throw new Error("A valid email address is required.");
  await persistenceReady;

  const mailRef = collection(db, 'mail');
  const { summary, chantingBrackets, enablerLeaderboard, dangerZone } = insights;
  const dangerIds = new Set(dangerZone.map(p => p.id));

  // Styles for the email
  const tableStyle = 'width: 100%; border-collapse: collapse; margin-bottom: 30px; font-family: sans-serif; font-size: 13px; color: #333;';
  const thStyle = 'border: 1px solid #e0e0e0; background-color: #f5f5f5; padding: 10px; text-align: left; font-weight: bold; text-transform: uppercase; font-size: 11px; color: #666;';
  const tdStyle = 'border: 1px solid #e0e0e0; padding: 10px; text-align: left; vertical-align: middle;';
  const rowEvenStyle = 'background-color: #fafafa;';
  const rowOddStyle = 'background-color: #ffffff;';

  // 1. Summary Table
  const summaryTableHtml = `
    <table style="${tableStyle}">
      <thead>
        <tr>
          <th style="${thStyle}">Total Members</th>
          <th style="${thStyle}">Active (7 Days)</th>
          <th style="${thStyle}">Danger Zone</th>
          <th style="${thStyle}">Health Score</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${tdStyle}">${summary.totalMembers} souls</td>
          <td style="${tdStyle}">${summary.activeCount}</td>
          <td style="${tdStyle}">${summary.dangerCount}</td>
          <td style="${tdStyle}"><span style="font-size: 18px; font-weight: 900; color: #3f51b5;">${summary.healthScore}%</span></td>
        </tr>
      </tbody>
    </table>
  `;

  // 2. Members Table
  const bracketOrder = ['intro', 'prelims', 'enhanced', 'graduate', 'advanced'];
  let membersRowsHtml = '';
  let rowCount = 0;

  bracketOrder.forEach(bracketKey => {
    const bracket = chantingBrackets[bracketKey];
    if (!bracket) return;

    bracket.people.forEach(p => {
      const isDanger = dangerIds.has(p.id);
      const statusHtml = isDanger 
        ? '<span style="color: #d32f2f; font-weight: bold; text-transform: uppercase; font-size: 10px;">Danger</span>' 
        : '<span style="color: #4caf50; font-weight: bold; text-transform: uppercase; font-size: 10px;">Active</span>';
      
      const lastCall = safeDate(p.lastCallAt);
      const lastCallStr = lastCall ? formatDistanceToNow(lastCall, { addSuffix: true }) : 'Never';
      
      membersRowsHtml += `
        <tr style="${rowCount % 2 === 0 ? rowEvenStyle : rowOddStyle}">
          <td style="${tdStyle}"><b>${p.fullName}</b></td>
          <td style="${tdStyle}">${p.phone}</td>
          <td style="${tdStyle}">${bracket.label.split(' (')[0]}</td>
          <td style="${tdStyle}">${p.chantingStatus || 0}</td>
          <td style="${tdStyle}">${p.enablerInTouchWith || 'Unassigned'}</td>
          <td style="${tdStyle}">${lastCallStr}</td>
          <td style="${tdStyle}">${p.attendanceHistory?.length || 0}</td>
          <td style="${tdStyle}">${statusHtml}</td>
        </tr>
      `;
      rowCount++;
    });
  });

  const membersTableHtml = `
    <table style="${tableStyle}">
      <thead>
        <tr>
          <th style="${thStyle}">Name</th>
          <th style="${thStyle}">Phone</th>
          <th style="${thStyle}">Bracket</th>
          <th style="${thStyle}">Rounds</th>
          <th style="${thStyle}">Enabler</th>
          <th style="${thStyle}">Last Contact</th>
          <th style="${thStyle}">Events</th>
          <th style="${thStyle}">Status</th>
        </tr>
      </thead>
      <tbody>
        ${membersRowsHtml || `<tr><td colspan="8" style="${tdStyle} text-align: center; color: #999; font-style: italic;">No practitioners found with rounds > 0.</td></tr>`}
      </tbody>
    </table>
  `;

  // 3. Enabler Performance Table
  let enablerRowsHtml = '';
  enablerLeaderboard.forEach((e, idx) => {
    enablerRowsHtml += `
      <tr style="${idx % 2 === 0 ? rowEvenStyle : rowOddStyle}">
        <td style="${tdStyle}"><b>${e.name}</b></td>
        <td style="${tdStyle}">${e.totalCalls}</td>
        <td style="${tdStyle}">${e.a1Count}</td>
        <td style="${tdStyle}">${formatDuration(e.totalDuration)}</td>
      </tr>
    `;
  });

  const enablerTableHtml = `
    <table style="${tableStyle}">
      <thead>
        <tr>
          <th style="${thStyle}">Coordinator Name</th>
          <th style="${thStyle}">Calls Logged</th>
          <th style="${thStyle}">A1 Confirmed</th>
          <th style="${thStyle}">Total Duration</th>
        </tr>
      </thead>
      <tbody>
        ${enablerRowsHtml || `<tr><td colspan="4" style="${tdStyle} text-align: center; color: #999; font-style: italic;">No performance data recorded for this period.</td></tr>`}
      </tbody>
    </table>
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 850px; margin: auto; padding: 20px; line-height: 1.5;">
      <h2 style="color: #1a237e; border-bottom: 2px solid #3f51b5; padding-bottom: 10px; margin-bottom: 5px;">Intelligence Pulse: ${group.name}</h2>
      <p style="color: #666; font-size: 12px; margin-bottom: 30px;">Report Generated: ${format(new Date(), 'PPPP')}</p>
      
      <h3 style="font-size: 12px; margin-bottom: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; font-weight: 900;">Summary Statistics</h3>
      ${summaryTableHtml}

      <h3 style="font-size: 12px; margin-bottom: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; font-weight: 900;">Member Status & Progress</h3>
      ${membersTableHtml}

      <h3 style="font-size: 12px; margin-bottom: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; font-weight: 900;">Team Performance (Last 7 Days)</h3>
      ${enablerTableHtml}

      <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">
        FOLK Spiritual Gems CRM • Confidential Team Report
      </div>
    </div>
  `;

  try {
    await addDoc(mailRef, {
      to: [to],
      message: {
        subject: `📊 [Pulse Report] ${group.name} - Chanting Progress Updates`,
        html: html,
      },
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (e: any) {
    console.error("[Mail Service] Dispatch failed:", e.message);
    throw e;
  }
}
