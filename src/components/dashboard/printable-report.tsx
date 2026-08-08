'use client';

import * as React from 'react';
import { format } from 'date-fns';
import type { 
    DashboardData, 
    TeamGoalsSummary, 
    AppUser,
} from '@/lib/types';
import { formatDuration } from '@/utils/format';

type PrintableReportProps = {
  data: DashboardData;
  goalsSummary: {
    columns: string[];
    teams: TeamGoalsSummary[];
    grandTotals: Record<string, { achieved: number; target: number }>;
  };
  enablers: AppUser[];
  dateLabel: string;
};

export function PrintableReport({ data, goalsSummary, enablers, dateLabel }: PrintableReportProps) {
  const { stats, teamCallingReports, callingReportAll } = data;

  const mergedBreakdown = stats.enablerBreakdown.map(stageEntry => {
    const chantingEntry = stats.chantingBreakdown.find(c => c.enablerId === stageEntry.enablerId);
    return {
        ...stageEntry,
        rounds9to15: chantingEntry?.rounds9to15 || 0,
        rounds3to8: chantingEntry?.rounds3to8 || 0,
        rounds0to2: chantingEntry?.rounds0to2 || 0,
    };
  });

  const tableStyle = "w-full border-collapse border border-black mb-12 font-sans text-black";
  const headerStyle = "border border-black bg-gray-100 p-2 font-black text-[11px] uppercase text-center";
  const cellStyle = "border border-black p-2 text-center align-middle text-[10px]";
  const labelStyle = "border border-black p-2 font-bold text-left text-[10px]";
  const teamRowStyle = "bg-blue-50 font-black text-sm text-center border border-black p-3 uppercase tracking-wider";
  const teamTotalStyle = "bg-amber-50 font-black text-[11px] border border-black";
  const grandTotalStyle = "bg-gray-200 font-black text-sm border-t-2 border-black";

  return (
    <div id="printable-report" className="hidden print:block p-8 bg-white">
      <div className="mb-8 border-b-4 border-black pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Executive Outreach Report</h1>
            <p className="text-sm font-bold opacity-60">FOLK SPIRITUAL GEMS CRM • MISSION PULSE</p>
          </div>
          <div className="text-right">
              <p className="text-xs font-black uppercase tracking-widest">{dateLabel}</p>
              <p className="text-[10px] font-bold opacity-40 uppercase">Generated on {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
          </div>
      </div>

      {/* TABLE 1: TEAM GOALS */}
      <section className="page-break-after-always">
        <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
            1. Mission Goals & Targets
        </h2>
        <table className={tableStyle}>
          <thead>
            <tr>
              <th className={headerStyle} style={{ textAlign: 'left' }}>ENABLER NAME</th>
              {goalsSummary.columns.map(col => (
                <th key={col} className={headerStyle}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goalsSummary.teams.map(team => (
              <React.Fragment key={team.teamId || 'unassigned'}>
                <tr>
                  <td className={teamRowStyle} colSpan={1 + goalsSummary.columns.length}>
                    TEAM: {team.teamName}
                  </td>
                </tr>
                {team.members.map(member => (
                  <tr key={member.enablerId}>
                    <td className={labelStyle}>{member.enablerName}</td>
                    {goalsSummary.columns.map(col => {
                      const val = member.columns[col];
                      return (
                        <td key={col} className={cellStyle}>
                          {val.target > 0 ? `${val.achieved} / ${val.target}` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className={teamTotalStyle}>
                    <td className={labelStyle} style={{ background: 'inherit' }}>TEAM TOTAL</td>
                    {goalsSummary.columns.map(col => {
                        const val = team.teamTotals[col];
                        return (
                          <td key={col} className={cellStyle} style={{ background: 'inherit' }}>
                            {val.target > 0 ? `${val.achieved} / ${val.target}` : '—'}
                          </td>
                        );
                    })}
                </tr>
              </React.Fragment>
            ))}
            <tr className={grandTotalStyle}>
              <td className={labelStyle} style={{ background: 'inherit', fontSize: 'inherit' }}>GRAND TOTAL</td>
              {goalsSummary.columns.map(col => {
                const val = goalsSummary.grandTotals[col];
                return (
                  <td key={col} className={cellStyle} style={{ background: 'inherit', fontSize: 'inherit' }}>
                    {val.achieved} / {val.target}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </section>

      {/* TABLE 2: ENABLER BREAKDOWN */}
      <section className="page-break-after-always">
        <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
            2. Stage & Chanting Pulse
        </h2>
        <table className={tableStyle}>
          <thead>
            <tr>
              <th className={headerStyle} style={{ textAlign: 'left' }}>ENABLER</th>
              <th className={headerStyle}>FRP</th>
              <th className={headerStyle}>SG-W</th>
              <th className={headerStyle}>SG-S</th>
              <th className={headerStyle}>16+ R</th>
              <th className={headerStyle}>9-15 R</th>
              <th className={headerStyle}>3-8 R</th>
              <th className={headerStyle}>0-2 R</th>
              <th className={headerStyle}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {goalsSummary.teams.map(team => {
                const teamMembersBreakdown = mergedBreakdown.filter(b => 
                    team.members.some(m => m.enablerId === b.enablerId)
                );
                
                const teamTotals = teamMembersBreakdown.reduce((acc, curr) => ({
                    frp: acc.frp + curr.frp,
                    sgW: acc.sgW + curr.sgW,
                    sgS: acc.sgS + curr.sgS,
                    sixteenRounder: acc.sixteenRounder + curr.sixteenRounder,
                    rounds9to15: acc.rounds9to15 + curr.rounds9to15,
                    rounds3to8: acc.rounds3to8 + curr.rounds3to8,
                    rounds0to2: acc.rounds0to2 + curr.rounds0to2,
                    totalContacts: acc.totalContacts + curr.totalContacts,
                }), { frp: 0, sgW: 0, sgS: 0, sixteenRounder: 0, rounds9to15: 0, rounds3to8: 0, rounds0to2: 0, totalContacts: 0 });

                return (
                    <React.Fragment key={team.teamId || 'unassigned'}>
                        <tr>
                            <td className={teamRowStyle} colSpan={9}>TEAM: {team.teamName}</td>
                        </tr>
                        {teamMembersBreakdown.map(row => (
                            <tr key={row.enablerId}>
                                <td className={labelStyle}>{row.enablerName}</td>
                                <td className={cellStyle}>{row.frp}</td>
                                <td className={cellStyle}>{row.sgW}</td>
                                <td className={cellStyle}>{row.sgS}</td>
                                <td className={cellStyle}>{row.sixteenRounder}</td>
                                <td className={cellStyle}>{row.rounds9to15}</td>
                                <td className={cellStyle}>{row.rounds3to8}</td>
                                <td className={cellStyle}>{row.rounds0to2}</td>
                                <td className={cellStyle}>{row.totalContacts}</td>
                            </tr>
                        ))}
                        <tr className={teamTotalStyle}>
                            <td className={labelStyle} style={{ background: 'inherit' }}>TEAM TOTAL</td>
                            <td className={cellStyle}>{teamTotals.frp}</td>
                            <td className={cellStyle}>{teamTotals.sgW}</td>
                            <td className={cellStyle}>{teamTotals.sgS}</td>
                            <td className={cellStyle}>{teamTotals.sixteenRounder}</td>
                            <td className={cellStyle}>{teamTotals.rounds9to15}</td>
                            <td className={cellStyle}>{teamTotals.rounds3to8}</td>
                            <td className={cellStyle}>{teamTotals.rounds0to2}</td>
                            <td className={cellStyle}>{teamTotals.totalContacts}</td>
                        </tr>
                    </React.Fragment>
                );
            })}
          </tbody>
        </table>
      </section>

      {/* TABLE 3: CALLING LOGS */}
      <section>
        <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
            3. Interaction Statistics
        </h2>
        <table className={tableStyle}>
          <thead>
            <tr>
              <th className={headerStyle} style={{ textAlign: 'left' }}>TEAM NAME</th>
              <th className={headerStyle}>TOTAL CALLS</th>
              <th className={headerStyle}>PICKED</th>
              <th className={headerStyle}>NOT PICKED</th>
              <th className={headerStyle}>COMING (A1)</th>
              <th className={headerStyle}>TENTATIVE (A4)</th>
              <th className={headerStyle}>TOTAL DURATION</th>
            </tr>
          </thead>
          <tbody>
            {goalsSummary.teams.map(team => {
                const teamReport = teamCallingReports[team.teamId || "unassigned"];
                if (!teamReport) return null;

                return (
                    <tr key={team.teamId || 'unassigned'}>
                        <td className={labelStyle}>{team.teamName}</td>
                        <td className={cellStyle}>{teamReport.totalCalls}</td>
                        <td className={cellStyle}>{teamReport.picked}</td>
                        <td className={cellStyle}>{teamReport.notPicked}</td>
                        <td className={cellStyle}>{teamReport.subCategories['A1 - Coming'] || 0}</td>
                        <td className={cellStyle}>{teamReport.subCategories['A4 - Tentative'] || 0}</td>
                        <td className={cellStyle}>{formatDuration(teamReport.totalDuration)}</td>
                    </tr>
                );
            })}
            <tr className={grandTotalStyle}>
              <td className={labelStyle} style={{ background: 'inherit', fontSize: 'inherit' }}>GRAND TOTAL</td>
              <td className={cellStyle}>{callingReportAll.totalCalls}</td>
              <td className={cellStyle}>{callingReportAll.picked}</td>
              <td className={cellStyle}>{callingReportAll.notPicked}</td>
              <td className={cellStyle}>{callingReportAll.subCategories['A1 - Coming'] || 0}</td>
              <td className={cellStyle}>{callingReportAll.subCategories['A4 - Tentative'] || 0}</td>
              <td className={cellStyle}>{formatDuration(callingReportAll.totalDuration)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="mt-20 text-center text-[8px] font-black uppercase tracking-[0.5em] opacity-30">
          SG CRM Mission Management Portal • Confidential Team Report
      </div>
    </div>
  );
}
