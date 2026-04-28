import React, { useState, useRef } from 'react';
import { Medal, Table, Trophy, Info, Copy, CheckCircle, Image } from 'lucide-react';
import { TeamLogo } from '../TeamLogo.jsx';
import { TEAM_ODDS } from '../../config/odds.js';

// Trophy SVG paths for 1st/2nd/3rd place
const TROPHY_ICONS = {
  gold:   { src: '/standings/first.svg',  alt: '1st Place' },
  silver: { src: '/standings/second.svg', alt: '2nd Place' },
  bronze: { src: '/standings/third.svg',  alt: '3rd Place' },
  spoon:  { src: '/standings/woodenspoon.svg', alt: 'Wooden Spoon' },
};

const TrophyImg = ({ type, className = 'w-10 h-10' }) => {
  if (type === 'medal') {
    return <Medal className={`text-slate-400 shrink-0 ${className}`} />;
  }
  return (
    <img
      src={TROPHY_ICONS[type].src}
      alt={TROPHY_ICONS[type].alt}
      className={`drop-shadow-md shrink-0 ${className}`}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
};

// Award podium row
const AwardRow = ({ rank, member, trophyType }) => (
  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-slate-100 shadow-sm hover:border-green-200 transition-colors">
    <div className="w-12 flex items-center justify-center shrink-0">
      <TrophyImg type={trophyType} className="w-10 h-10" />
    </div>
    <span className="w-10 font-bold text-slate-500 uppercase text-xs tracking-wider shrink-0 text-center leading-tight">
      {rank}
    </span>
    <div className="font-black text-slate-800 text-xl flex-1 flex items-center justify-start gap-2 flex-wrap">
      {member ? (
        <>
          <span className="truncate max-w-[120px] sm:max-w-none">{member.name}</span>
          <span className="text-xs sm:text-sm font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-200 shrink-0">
            {member.pts} pts
          </span>
        </>
      ) : (
        <span className="text-slate-400 text-base font-bold">–</span>
      )}
    </div>
  </div>
);

export const StandingsTab = ({ settings, awards, memberStats }) => {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const tableRef = useRef(null);

  const kidsToShow = settings.kidAwardsType === 'top3'
    ? (awards.kids?.list || []).slice(0, 3)
    : (awards.kids?.list || []);

  const showGF = (settings.scoring?.bonus?.perGoal || 0) > 0;

  const kidTrophyType = (idx) => {
    if (idx === 0) return 'gold';
    if (idx === 1) return 'silver';
    if (idx === 2) return 'bronze';
    return null;
  };

  // ── Text fallback ──────────────────────────────────────────────────────────
  const copyAsText = () => {
    const lines = [
      `🏆 ${settings.leagueName || 'World Cup Sweepstakes'} — Standings`,
      '─────────────────────',
      ...memberStats.map((m, idx) => {
        const icon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        const activeTeams = m.teams.filter(t => t.isActive).map(t => t.id).join(', ');
        return `${icon} ${m.name} — ${m.pts} pts${activeTeams ? ` (${activeTeams})` : ''}`;
      }),
      '─────────────────────',
      '📱 world-cup-sweepstakes.vercel.app',
    ];
    return navigator.clipboard.writeText(lines.join('\n'));
  };

  // ── Image copy with text fallback ──────────────────────────────────────────
  const handleCopyStandings = async () => {
    if (copying) return;
    setCopying(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const CAPTURE_WIDTH = 860;

      // ── Build a clean HTML table from data — no DOM cloning, no images.
      // Team codes render as styled pill badges which html2canvas handles perfectly.

      // Pre-fetch rank SVGs as base64 so html2canvas can render them
      const fetchAsBase64 = async (url) => {
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          return await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          });
        } catch { return null; }
      };
      const [firstBase64, spoonBase64] = await Promise.all([
        fetchAsBase64('/standings/first.svg'),
        fetchAsBase64('/standings/woodenspoon.svg'),
      ]);
      const iconImg = (b64, size = 28) => b64
        ? `<img src="${b64}" style="width:${size}px;height:${size}px;display:inline-block;vertical-align:middle;" />`
        : '';

      const rows = memberStats.map((m, idx) => {
        const isFirst = idx === 0;
        const isLast = settings.woodenSpoon && idx === memberStats.length - 1 && memberStats.length > 1;
        const activeTeams = m.teams.filter(t => t.isActive);
        const teamBadges = activeTeams.map(t =>
          `<span style="display:inline-block;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:4px;padding:4px 7px 8px 7px;font-size:11px;font-weight:700;margin:2px 2px 2px 0;line-height:1;vertical-align:middle;">${t.id}</span>`
        ).join('') || '<span style="color:#ef4444;font-size:11px;font-weight:700;">Eliminated</span>';

        // Total Odds calculation
        let sumOdds = 0; let hasOdds = false;
        activeTeams.forEach(t => {
          const oddsStr = TEAM_ODDS[t.id];
          if (oddsStr) { const v = parseInt(oddsStr.replace(/\D/g, '')); if (!isNaN(v)) { sumOdds += v; hasOdds = true; } }
        });
        const displayOdds = hasOdds ? (sumOdds > 0 ? `+${sumOdds}` : `${sumOdds}`) : 'N/A';

        const rowBg = isFirst ? '#f0fdf4' : isLast ? '#fff7ed' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');
        const rankCell = isFirst
          ? iconImg(firstBase64, 30)
          : isLast
            ? iconImg(spoonBase64, 22)
            : `<span style="font-weight:900;font-size:16px;color:#166534;">${idx + 1}</span>`;

        return `<tr style="background:${rowBg};border-bottom:1px solid #f0fdf4;">
          <td style="padding:10px 14px;white-space:nowrap;text-align:center;vertical-align:middle;">${rankCell}</td>
          <td style="padding:10px 14px;font-weight:700;font-size:14px;color:#1e293b;">${m.name}</td>
          <td style="padding:10px 14px;text-align:center;font-weight:900;font-size:20px;color:#16a34a;">${m.pts}</td>
          <td style="padding:10px 14px;text-align:center;font-weight:600;font-size:13px;color:#64748b;">${m.totalRank ?? '—'}</td>
          <td style="padding:10px 14px;text-align:center;font-weight:600;font-size:13px;color:#7c3aed;">${displayOdds}</td>
          <td style="padding:10px 14px;">${teamBadges}</td>
        </tr>`;
      }).join('');

      const html = `
        <div style="font-family:ui-sans-serif,system-ui,sans-serif;background:#ffffff;padding:24px;width:${CAPTURE_WIDTH}px;box-sizing:border-box;">
          <div style="font-size:17px;font-weight:900;color:#166534;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:3px solid #dcfce7;padding-bottom:10px;">
            🏆 ${settings.leagueName || 'World Cup Sweepstakes'} — Standings
          </div>
          <table style="width:100%;border-collapse:collapse;font-family:ui-sans-serif,system-ui,sans-serif;">
            <thead>
              <tr style="background:#f0fdf4;border-bottom:2px solid #dcfce7;">
                <th style="padding:8px 14px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;color:#166534;letter-spacing:0.05em;">Rank</th>
                <th style="padding:8px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#166534;letter-spacing:0.05em;">Manager</th>
                <th style="padding:8px 14px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;color:#166534;letter-spacing:0.05em;">Pts</th>
                <th style="padding:8px 14px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;color:#166534;letter-spacing:0.05em;">Total Rank</th>
                <th style="padding:8px 14px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;color:#7c3aed;letter-spacing:0.05em;">Total Odds</th>
                <th style="padding:8px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#166534;letter-spacing:0.05em;">Remaining Teams</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="font-size:11px;color:#94a3b8;margin-top:12px;text-align:right;">📱 world-cup-sweepstakes.vercel.app</div>
        </div>`;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper.firstElementChild, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        useCORS: false,
        allowTaint: true,
        logging: false,
        width: CAPTURE_WIDTH,
        windowWidth: CAPTURE_WIDTH,
      });

      document.body.removeChild(wrapper);

      // Try image clipboard first
      try {
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            // ClipboardItem not supported (e.g. Safari without permission) — fall back to text
            await copyAsText();
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }
        }, 'image/png');
      } catch {
        await copyAsText();
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // html2canvas failed entirely — fall back to text
      try {
        await copyAsText();
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (e) {
        console.error('All clipboard methods failed:', e);
      }
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Award podiums ─────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 ${settings.kidAwards ? 'md:grid-cols-2' : ''} gap-6`}>

        {/* Overall */}
        <div className="bg-white rounded-xl shadow-md border-2 border-green-100 overflow-hidden flex flex-col">
          <div className="bg-green-800 text-white p-4 font-bold flex items-center gap-2 uppercase tracking-wide shrink-0">
            <Trophy className="w-5 h-5 text-yellow-400" /> Overall Awards
          </div>
          <div className="p-4 space-y-3 flex-1 flex flex-col justify-center">
            <AwardRow rank="1st" member={awards.overall['1st']} trophyType="gold" />
            <AwardRow rank="2nd" member={awards.overall['2nd']} trophyType="silver" />
            {awards.overall['3rd'] && (
              <AwardRow rank="3rd" member={awards.overall['3rd']} trophyType="bronze" />
            )}
            {settings.woodenSpoon && (
              <AwardRow rank="Last" member={awards.overall['Spoon']} trophyType="spoon" />
            )}
          </div>
        </div>

        {/* Kids */}
        {settings.kidAwards && (
          <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 overflow-hidden flex flex-col">
            <div className="bg-emerald-600 text-white p-4 font-bold flex items-center gap-2 uppercase tracking-wide shrink-0">
              <Medal className="w-5 h-5 text-emerald-200" /> Kids Awards
            </div>
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-start">
              {kidsToShow.length > 0 ? kidsToShow.map((kid, idx) => {
                const type = kidTrophyType(idx);
                const ordinal = idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `${idx + 1}th`;
                return type ? (
                  <AwardRow key={kid.id} rank={ordinal} member={kid} trophyType={type} />
                ) : (
                  <AwardRow key={kid.id} rank={ordinal} member={kid} trophyType="medal" />
                );
              }) : (
                <div className="text-sm text-slate-500 text-center py-4">No kids assigned yet.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Full standings table ──────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border-2 border-green-100 overflow-hidden">
        <div className="bg-green-50 p-4 font-bold text-green-800 flex items-center justify-between gap-2 border-b border-green-200 uppercase tracking-wide">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5" /> Full Standings
          </div>
          <button
            onClick={handleCopyStandings}
            disabled={copying}
            className="flex items-center gap-2 bg-white hover:bg-green-100 border border-green-200 text-green-700 font-black text-xs px-3 py-1.5 rounded-lg transition-colors shadow-sm uppercase tracking-wider disabled:opacity-60"
            title="Copy standings to clipboard as an image"
          >
            {copied ? (
              <><CheckCircle className="w-4 h-4 text-emerald-600" /> Copied!</>
            ) : copying ? (
              <><Image className="w-4 h-4 animate-pulse" /> Capturing...</>
            ) : (
              <><Image className="w-4 h-4" /> Share</>
            )}
          </button>
        </div>

        {/* This ref is what html2canvas captures */}
        <div ref={tableRef} className="overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-green-700 text-sm border-b-2 border-green-100">
                <th className="p-4 font-bold uppercase">Rank</th>
                <th className="p-4 font-bold uppercase">Manager</th>
                <th className="p-4 font-bold uppercase text-center">Pts</th>
                <th className="p-4 font-bold uppercase text-center">GD</th>
                {showGF && <th className="p-4 font-bold uppercase text-center text-emerald-600 bg-emerald-50">GF</th>}
                <th className="p-4 font-bold uppercase text-center cursor-help">
                  <div className="flex items-center justify-center gap-1" title="Combined FIFA rankings of remaining teams">
                    Total Rank <Info className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 font-bold uppercase text-center cursor-help text-purple-700">
                  <div className="flex items-center justify-center gap-1" title="Odds of remaining teams">
                    Total Odds <Info className="w-3 h-3 text-purple-400" />
                  </div>
                </th>
                <th className="p-4 font-bold uppercase">Remaining Teams</th>
              </tr>
            </thead>
            <tbody>
              {memberStats.map((member, idx) => {
                const isFirst = idx === 0;
                const isLastPlace = settings.woodenSpoon && idx === memberStats.length - 1 && memberStats.length > 0;

                let sumOdds = 0;
                let hasOdds = false;
                member.teams.filter(t => t.isActive).forEach(t => {
                  const oddsStr = TEAM_ODDS[t.id];
                  if (oddsStr) {
                    const oddsVal = parseInt(oddsStr.replace(/\D/g, ''));
                    if (!isNaN(oddsVal)) { sumOdds += oddsVal; hasOdds = true; }
                  }
                });
                const displayOdds = hasOdds ? (sumOdds > 0 ? `+${sumOdds}` : sumOdds) : 'N/A';

                return (
                  <tr key={member.id} className="border-b border-green-50 last:border-0 hover:bg-green-50/50 transition-colors">
                    <td className="p-4 font-black text-green-800 text-lg">{idx + 1}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 flex items-center gap-2 text-lg min-w-0">
                        <span className="truncate">{member.name}</span>
                        {isFirst && (
                          <img src="/standings/first.svg" alt="1st Place" className="w-5 h-5 drop-shadow-sm shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                        )}
                        {isLastPlace && (
                          <img src="/standings/woodenspoon.svg" alt="Wooden Spoon" title="Wooden Spoon" className="w-5 h-5 drop-shadow-sm shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                        )}
                      </div>
                      {member.isKid && (
                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full mt-1 inline-block font-semibold">Kid</span>
                      )}
                    </td>
                    <td className="p-4 text-center font-black text-2xl text-green-600">{member.pts}</td>
                    <td className="p-4 text-center font-bold text-slate-500">{member.gd > 0 ? `+${member.gd}` : member.gd}</td>
                    {showGF && <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">{member.gf}</td>}
                    <td className="p-4 text-center font-bold text-slate-500">{member.totalRank}</td>
                    <td className="p-4 text-center font-bold text-purple-600">{displayOdds}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {member.teams.filter(t => t.isActive).map(t => (
                          <span key={t.id} title={`${t.name} (${t.pts} pts)`} className="transition-all hover:scale-110">
                            <TeamLogo teamId={t.id} className="w-6 h-6" />
                          </span>
                        ))}
                        {member.teams.filter(t => t.isActive).length === 0 && (
                          <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-50 border border-red-200 px-2 py-1 rounded">Squad Eliminated</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
