'use client';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Group } from '@/lib/types';
import type { IntelligenceInsights } from '@/services/intelligence-service';

/**
 * Queues a pulse report email in the 'mail' collection for Firebase Extension processing.
 * Includes the "Intro" (strictly 1 round) tier in the leadership digest.
 */
export async function queuePulseReport(
  to: string, 
  group: Group, 
  insights: IntelligenceInsights
) {
  if (!to || !to.includes('@')) throw new Error("A valid email address is required.");

  const mailRef = collection(db, 'mail');
  
  // 1. Chanting Progress - Including Intro (1 Round) details now
  const chantingProgressHtml = Object.entries(insights.chantingBrackets).map(([key, bracket]) => {
    if (bracket.count === 0) return '';
    return `
      <div style="margin-bottom: 25px;">
        <div style="font-size: 11px; font-weight: 900; color: #FF9800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">
          ${bracket.label} (${bracket.count} souls)
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${bracket.people.map(p => `
            <div style="padding: 10px 15px; background: #f8f9fa; border: 1px solid #eee; border-radius: 10px; font-size: 11px; color: #333; margin-right: 6px; margin-bottom: 6px; display: inline-block;">
              <b style="color: #1a237e;">${p.fullName}</b> <span style="color: #999; font-size: 9px; margin-left: 5px;">via ${p.enablerInTouchWith || 'Unassigned'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  const activeSoulsHtml = insights.starPerformers.map((p, idx) => `
    <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #f5f5f5;">
      <span style="font-size: 14px; font-weight: 900; color: #3f51b5; width: 35px;">#${idx + 1}</span>
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 700; color: #1a237e; text-transform: uppercase;">${p.fullName}</div>
        <div style="font-size: 10px; color: #7986cb; text-transform: uppercase; font-weight: 800; margin-top: 2px;">
            Verified milestones: ${p.attendanceHistory?.length || 0} Events Attended
        </div>
      </div>
    </div>
  `).join('');

  const enablerPerformanceHtml = insights.enablerLeaderboard.map((e, idx) => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 15px; font-size: 13px; color: #333;"><b>${e.name}</b></td>
      <td style="padding: 15px; text-align: center; font-size: 12px; color: #666;">${e.totalCalls} Calls Logged</td>
      <td style="padding: 15px; text-align: right; font-size: 14px; font-weight: 900; color: #2e7d32;">${e.a1Count} A1 Confirmed</td>
    </tr>
  `).join('');

  const dangerZoneHtml = insights.dangerZone.slice(0, 10).map(p => `
    <div style="margin-bottom: 12px; padding: 15px; border-left: 5px solid #f44336; background: #fff5f5; border-radius: 12px;">
      <div style="font-size: 13px; font-weight: 900; color: #b71c1c; text-transform: uppercase;">${p.fullName}</div>
      <div style="font-size: 10px; color: #e57373; font-weight: 800; text-transform: uppercase; margin-top: 4px;">
        Stagnant reachout • Rounds: ${p.chantingStatus || 0} • Enabler: ${p.enablerInTouchWith || 'None'}
      </div>
    </div>
  `).join('');

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; color: #333; max-width: 650px; margin: auto; padding: 40px; border-radius: 30px; border: 1px solid #eee; background: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 50px;">
        <div style="font-size: 10px; font-weight: 900; color: #3f51b5; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 10px;">FOLK SPIRITUAL GEMS</div>
        <h1 style="color: #1a237e; font-size: 28px; margin: 0; text-transform: uppercase; letter-spacing: -1.5px; font-weight: 900;">Intelligence Pulse</h1>
        <p style="color: #777; font-weight: 700; font-size: 12px; text-transform: uppercase; margin-top: 10px;">Batch: ${group.name}</p>
      </div>

      <div style="background: linear-gradient(135deg, #3f51b5, #1a237e); color: white; padding: 40px; border-radius: 25px; margin-bottom: 50px; text-align: center; box-shadow: 0 15px 35px rgba(63,81,181,0.25);">
        <div style="font-size: 11px; text-transform: uppercase; font-weight: 900; opacity: 0.7; letter-spacing: 3px;">Cumulative Health</div>
        <div style="font-size: 64px; font-weight: 900; margin: 8px 0; line-height: 1;">${insights.summary.healthScore}%</div>
        <div style="font-size: 12px; font-weight: 800; margin-top: 15px;">${insights.summary.activeCount} High-Activity Souls / ${insights.summary.totalMembers} Members</div>
      </div>

      <div style="margin-bottom: 50px;">
        <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #1a237e; border-bottom: 4px solid #e8eaf6; padding-bottom: 12px; margin-bottom: 25px; letter-spacing: 1px;">
          📈 Chanting Progress (Intro to Advanced)
        </h2>
        ${chantingProgressHtml || '<p style="padding: 25px; font-style: italic; color: #999; font-size: 11px;">No chanting progress data yet.</p>'}
      </div>

      <div style="margin-bottom: 50px;">
        <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #1a237e; border-bottom: 4px solid #e8eaf6; padding-bottom: 12px; margin-bottom: 25px; letter-spacing: 1px;">
          ⭐ Top 6 Active Souls (Attendance)
        </h2>
        <div style="background: #fdfdfd; border: 1px solid #f2f2f2; border-radius: 20px; overflow: hidden;">
          ${activeSoulsHtml || '<p style="padding: 25px; font-style: italic; color: #999; font-size: 11px;">Waiting for event milestones.</p>'}
        </div>
      </div>

      <div style="margin-bottom: 50px;">
        <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #1a237e; border-bottom: 4px solid #e8eaf6; padding-bottom: 12px; margin-bottom: 25px; letter-spacing: 1px;">
          👥 Full Team Reach Dashboard
        </h2>
        <table width="100%" style="border-collapse: collapse;">
          ${enablerPerformanceHtml || '<tr><td style="padding: 25px; font-style: italic; color: #999; font-size: 11px;">No coordinator data available.</td></tr>'}
        </table>
      </div>

      <div style="margin-bottom: 40px;">
        <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #f44336; border-bottom: 4px solid #ffebee; padding-bottom: 12px; margin-bottom: 25px; letter-spacing: 1px;">
          ⚠️ Reachout Required (Danger Zone)
        </h2>
        ${dangerZoneHtml || '<p style="padding: 25px; font-style: italic; color: #4caf50; font-size: 12px; font-weight: bold;">Healthy! No contacts require urgent follow-up.</p>'}
      </div>

      <div style="text-align: center; margin-top: 70px; padding-top: 40px; border-top: 1px solid #f0f0f0;">
        <p style="font-size: 10px; color: #bbb; text-transform: uppercase; letter-spacing: 3px; font-weight: 900;">Automated Statistical Pulse • CRM 2.0</p>
        <p style="color: #3f51b5; font-weight: 900; font-size: 14px; margin-top: 15px;">HARE KRISHNA!</p>
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