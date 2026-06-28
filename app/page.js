// ============================================================
// LANDING PAGE  —  goes in:  app/page.js  (public route "/")
//
// Self-contained: all styling is scoped CSS (classes prefixed "lp-")
// injected via a <style> tag, so it never collides with Tailwind and
// the multi-column grids render reliably. Font (Plus Jakarta Sans)
// loaded via @import at the top of the CSS.
//
// All CTAs point to /signup and /login. Footer links to /privacy and
// /terms. Confirm /signup and /login match your real auth routes.
//
// DAY 39 mobile pass (CSS-only, markup unchanged):
//   • Nav compacted on phones so brand + Log in + Get started fit one row.
//   • Pricing cards now stay SIDE BY SIDE on phones (compacted to fit),
//     instead of stacking.
//   • Tighter section spacing + heading sizes on phones.
// ============================================================

import Link from "next/link";

export const metadata = {
  title: "Peptide Tracker — Track your peptide protocol",
  description:
    "A private dashboard for tracking your peptide protocol: log doses, follow your schedule, build stacks, browse a built-in encyclopedia, and watch your progress.",
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.lp-root, .lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; }
.lp-root h1, .lp-root h2, .lp-root h3, .lp-root h4, .lp-root p, .lp-root ul, .lp-root li { margin: 0; padding: 0; }
.lp-root ul { list-style: none; }
.lp-root a { text-decoration: none; color: inherit; }
.lp-root { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; background: #020617; color: #fff; min-height: 100vh; overflow-x: hidden; }

/* shared */
.lp-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #34d399; }
.lp-em { color: #34d399; }
.lp-h2 { font-size: 44px; font-weight: 800; line-height: 1.08; letter-spacing: -0.02em; margin-top: 16px; }
.lp-sub { font-size: 18px; color: #94a3b8; margin-top: 18px; line-height: 1.6; }
.lp-inner { position: relative; z-index: 2; max-width: 1080px; margin: 0 auto; }
.lp-head { text-align: center; max-width: 660px; margin: 0 auto 44px; }

/* buttons */
.lp-btn { display: inline-block; font-size: 14px; font-weight: 600; border-radius: 999px; padding: 10px 18px; cursor: pointer; transition: transform .08s ease, background .15s ease; }
.lp-btn:active { transform: scale(0.98); }
.lp-btn-em { background: #10b981; color: #04231a; }
.lp-btn-em:hover { background: #34d399; }
.lp-btn-ghost { background: rgba(15,23,42,0.7); color: #e2e8f0; border: 1px solid #334155; }
.lp-btn-ghost:hover { background: rgba(30,41,59,0.9); }
.lp-btn-lg { padding: 15px 32px; font-size: 16px; }

/* nav */
.lp-nav { display: flex; align-items: center; justify-content: space-between; max-width: 1100px; margin: 0 auto; padding: 22px 32px; position: relative; z-index: 5; }
.lp-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; }
.lp-mark { width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: rgba(16,185,129,0.14); border: 1px solid rgba(16,185,129,0.4); color: #34d399; font-size: 15px; }
.lp-nav-right { display: flex; align-items: center; gap: 14px; }
.lp-login { color: #cbd5e1; font-size: 14px; font-weight: 500; }
.lp-login:hover { color: #fff; }

/* hero */
.lp-hero { position: relative; overflow: hidden; background: radial-gradient(ellipse 80% 55% at 50% -8%, rgba(13,148,136,0.42), rgba(2,6,23,0) 70%), #020617; }
.lp-halo { position: absolute; top: 30%; left: 50%; transform: translate(-50%,-30%); width: 720px; height: 460px; max-width: 92vw; background: rgba(16,185,129,0.14); filter: blur(120px); border-radius: 50%; z-index: 0; }
.lp-dot { position: absolute; border-radius: 50%; background: rgba(52,211,153,0.5); filter: blur(2px); z-index: 1; }
.lp-hero-wrap { position: relative; z-index: 3; max-width: 880px; margin: 0 auto; text-align: center; padding: 74px 32px 104px; }
.lp-h1 { font-size: 72px; font-weight: 800; line-height: 1.0; letter-spacing: -0.03em; margin-top: 22px; }
.lp-line { width: 60px; height: 3px; background: #10b981; margin: 30px auto 0; border-radius: 2px; }
.lp-hero .lp-sub { max-width: 520px; margin-left: auto; margin-right: auto; }
.lp-ctas { margin-top: 34px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.lp-chip { display: inline-flex; align-items: center; gap: 8px; margin-top: 22px; background: rgba(16,185,129,0.10); border: 1px solid rgba(16,185,129,0.22); color: #6ee7b7; font-size: 14px; padding: 9px 18px; border-radius: 999px; }

/* section base */
.lp-section { position: relative; overflow: hidden; padding: 88px 32px 96px; }
.lp-glow-top { background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(13,148,136,0.15), rgba(2,6,23,0) 65%), #020617; }
.lp-glow-right { background: radial-gradient(ellipse 60% 50% at 85% 30%, rgba(13,148,136,0.14), rgba(2,6,23,0) 60%), #010912; }

/* encyclopedia */
.lp-research { display: flex; justify-content: center; margin: 0 auto 50px; }
.lp-pill { display: inline-flex; align-items: center; gap: 9px; background: rgba(16,185,129,0.10); border: 1px solid rgba(16,185,129,0.24); color: #6ee7b7; font-size: 13.5px; font-weight: 500; padding: 9px 18px; border-radius: 999px; }
.lp-pill svg { color: #34d399; flex-shrink: 0; }
.lp-cols { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 48px; align-items: center; }
.lp-entry { background: #0b1426; border: 1px solid #1e293b; border-radius: 18px; padding: 24px; box-shadow: 0 30px 60px rgba(0,0,0,0.45); }
.lp-kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #5eead4; }
.lp-entry-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
.lp-entry-name { font-size: 26px; font-weight: 800; letter-spacing: -0.01em; }
.lp-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.lp-tag { background: rgba(16,185,129,0.10); border: 1px solid rgba(16,185,129,0.22); color: #6ee7b7; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
.lp-over { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-top: 14px; }
.lp-rows { margin-top: 16px; }
.lp-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 11px 0; border-top: 1px solid #1e293b; font-size: 13.5px; }
.lp-row-k { color: #64748b; }
.lp-row-v { color: #cbd5e1; font-weight: 500; text-align: right; }
.lp-entry-link { display: inline-block; margin-top: 18px; color: #34d399; font-size: 14px; font-weight: 600; }
.lp-features { display: flex; flex-direction: column; gap: 24px; }
.lp-feat { display: flex; gap: 14px; align-items: flex-start; }
.lp-feat-ic { width: 42px; height: 42px; border-radius: 11px; flex-shrink: 0; background: rgba(16,185,129,0.10); border: 1px solid rgba(16,185,129,0.22); color: #34d399; display: flex; align-items: center; justify-content: center; }
.lp-feat h3 { font-size: 16px; font-weight: 700; }
.lp-feat p { font-size: 14px; color: #94a3b8; margin-top: 3px; line-height: 1.55; }
.lp-ency-ftr { text-align: center; margin-top: 52px; }
.lp-disclaimer { text-align: center; font-size: 12.5px; color: #64748b; margin-top: 18px; }

/* stack builder */
.lp-sb-inner { position: relative; z-index: 2; max-width: 720px; margin: 0 auto; }
.lp-builder { background: #0b1426; border: 1px solid #1e293b; border-radius: 20px; padding: 24px; box-shadow: 0 36px 70px rgba(0,0,0,0.5); }
.lp-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.lp-pchip { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; padding: 7px 13px; border-radius: 999px; border: 1px solid #334155; color: #cbd5e1; }
.lp-pchip.sel { background: rgba(16,185,129,0.14); border-color: rgba(16,185,129,0.4); color: #6ee7b7; }
.lp-pchip b { color: #34d399; font-weight: 700; }
.lp-addrow { margin-top: 14px; }
.lp-addrow span { font-size: 12px; color: #34d399; font-weight: 600; }
.lp-muted-chips { margin-top: 10px; opacity: 0.75; }
.lp-divider { height: 1px; background: #1e293b; margin: 22px 0; }
.lp-targets { font-size: 14px; }
.lp-targets b { color: #fff; font-weight: 700; }
.lp-targets span { color: #94a3b8; }
.lp-goals { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
.lp-goal { background: #060d1c; border: 1px solid #1e293b; border-radius: 13px; padding: 15px; }
.lp-goal-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.lp-goal-name { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 700; }
.lp-goal-ic { width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0; color: #34d399; background: rgba(16,185,129,0.10); border: 1px solid rgba(16,185,129,0.22); display: flex; align-items: center; justify-content: center; }
.lp-badge { font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 999px; white-space: nowrap; }
.lp-badge.pri { background: rgba(16,185,129,0.14); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; }
.lp-badge.sec { background: rgba(148,163,184,0.08); border: 1px solid #334155; color: #94a3b8; }
.lp-goal-src { font-size: 11.5px; color: #64748b; margin-top: 10px; line-height: 1.4; }
.lp-goal-src em { color: #94a3b8; font-style: normal; }
.lp-caption { text-align: center; font-size: 13px; color: #64748b; margin-top: 22px; }

/* my stack */
.lp-scols { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 48px; align-items: center; max-width: 1080px; margin: 0 auto; position: relative; z-index: 2; }
.lp-points { margin-top: 26px; display: flex; flex-direction: column; gap: 14px; }
.lp-pt { display: flex; gap: 11px; align-items: flex-start; font-size: 14.5px; color: #cbd5e1; }
.lp-ck { width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0; margin-top: 1px; background: rgba(16,185,129,0.12); color: #34d399; display: flex; align-items: center; justify-content: center; }
.lp-stack { background: #0b1426; border: 1px solid #1e293b; border-radius: 18px; padding: 22px; box-shadow: 0 30px 60px rgba(0,0,0,0.45); }
.lp-stack-head { display: flex; align-items: center; justify-content: space-between; }
.lp-stack-title { font-size: 18px; font-weight: 800; }
.lp-stack-chip { background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.24); color: #6ee7b7; font-size: 11px; font-weight: 700; padding: 4px 11px; border-radius: 999px; }
.lp-next { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: 12px; padding: 13px 15px; margin-top: 16px; }
.lp-next-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #5eead4; }
.lp-next-val { font-size: 14.5px; font-weight: 600; margin-top: 3px; }
.lp-srows { margin-top: 8px; }
.lp-srow { display: flex; align-items: center; justify-content: space-between; padding: 13px 0; border-top: 1px solid #1e293b; }
.lp-srow-l { display: flex; align-items: center; gap: 11px; }
.lp-pdot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; flex-shrink: 0; }
.lp-srow-nm { font-size: 14px; font-weight: 600; }
.lp-srow-dose { font-size: 12px; color: #64748b; margin-top: 1px; }
.lp-srow-freq { font-size: 12px; color: #cbd5e1; font-weight: 500; }

/* how it works */
.lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 980px; margin: 0 auto; position: relative; z-index: 2; }
.lp-step { background: #0b1426; border: 1px solid #1e293b; border-radius: 16px; padding: 26px; }
.lp-step-num { width: 38px; height: 38px; border-radius: 10px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.28); color: #34d399; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.lp-step h3 { font-size: 17px; font-weight: 700; margin-top: 16px; }
.lp-step p { font-size: 14px; color: #94a3b8; margin-top: 6px; line-height: 1.55; }

/* pricing */
.lp-plans { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 760px; margin: 0 auto; position: relative; z-index: 2; }
.lp-plan { background: #0b1426; border: 1px solid #1e293b; border-radius: 18px; padding: 28px; display: flex; flex-direction: column; }
.lp-plan.pop { border: 2px solid rgba(16,185,129,0.5); }
.lp-plan-pop-badge { align-self: flex-start; background: rgba(16,185,129,0.14); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; font-size: 11px; font-weight: 700; padding: 4px 11px; border-radius: 999px; margin-bottom: 14px; }
.lp-plan-name { font-size: 15px; font-weight: 700; color: #cbd5e1; }
.lp-price { font-size: 40px; font-weight: 800; letter-spacing: -0.02em; margin-top: 8px; }
.lp-price span { font-size: 15px; font-weight: 500; color: #64748b; }
.lp-plan-note { font-size: 13px; color: #94a3b8; margin-top: 4px; }
.lp-plan-list { margin-top: 20px; display: flex; flex-direction: column; gap: 11px; flex: 1; }
.lp-plan-li { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; color: #cbd5e1; line-height: 1.45; }
.lp-plan-li svg { color: #34d399; flex-shrink: 0; margin-top: 2px; }
.lp-plan .lp-btn { margin-top: 24px; text-align: center; }

/* final cta */
.lp-final { position: relative; overflow: hidden; padding: 96px 32px; text-align: center; background: radial-gradient(ellipse 60% 80% at 50% 50%, rgba(13,148,136,0.22), rgba(2,6,23,0) 70%), #020617; }
.lp-final-inner { position: relative; z-index: 2; max-width: 620px; margin: 0 auto; }
.lp-final h2 { font-size: 42px; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; }
.lp-final p { font-size: 18px; color: #94a3b8; margin-top: 16px; line-height: 1.6; }
.lp-final .lp-ctas { margin-top: 30px; }

/* footer */
.lp-footer { border-top: 1px solid #1e293b; background: #010912; padding: 48px 32px 36px; }
.lp-foot-top { max-width: 1080px; margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 32px; }
.lp-foot-brand { max-width: 340px; }
.lp-foot-tag { font-size: 13.5px; color: #94a3b8; margin-top: 12px; line-height: 1.6; }
.lp-foot-links { display: flex; gap: 56px; flex-wrap: wrap; }
.lp-foot-col h4 { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; margin-bottom: 12px; }
.lp-foot-col a { display: block; font-size: 14px; color: #cbd5e1; margin-bottom: 9px; }
.lp-foot-col a:hover { color: #fff; }
.lp-foot-bottom { max-width: 1080px; margin: 36px auto 0; padding-top: 24px; border-top: 1px solid #1e293b; }
.lp-foot-disc { font-size: 12.5px; color: #64748b; line-height: 1.6; }
.lp-foot-copy { font-size: 12.5px; color: #475569; margin-top: 12px; }

/* ---------- tablets & large phones ---------- */
@media (max-width: 860px) {
  .lp-h1 { font-size: 46px; }
  .lp-h2 { font-size: 32px; }
  .lp-cols, .lp-scols { grid-template-columns: 1fr; gap: 32px; }
  .lp-goals { grid-template-columns: 1fr; }
  .lp-steps { grid-template-columns: 1fr; }
  .lp-final h2 { font-size: 32px; }
  .lp-section { padding: 64px 24px 72px; }
  /* pricing stays two-up — just a slightly tighter gap */
  .lp-plans { gap: 16px; }
}

/* ---------- phones ---------- */
@media (max-width: 480px) {
  /* nav — keep brand + Log in + Get started on one tidy row */
  .lp-nav { padding: 16px 16px; }
  .lp-brand { font-size: 15px; gap: 7px; }
  .lp-mark { width: 26px; height: 26px; font-size: 13px; }
  .lp-nav-right { gap: 9px; }
  .lp-login { font-size: 13px; }
  .lp-nav-right .lp-btn { padding: 8px 13px; font-size: 13px; }

  /* hero */
  .lp-hero-wrap { padding: 56px 20px 76px; }
  .lp-h1 { font-size: 40px; }
  .lp-sub { font-size: 16px; }

  /* tighter section spacing + heading sizes */
  .lp-section { padding: 52px 18px 56px; }
  .lp-h2 { font-size: 28px; }
  .lp-final { padding: 72px 20px; }
  .lp-final h2 { font-size: 28px; }
  .lp-btn-lg { padding: 13px 22px; font-size: 15px; }

  /* PRICING — two cards side by side, compacted so they fit cleanly */
  .lp-plans { grid-template-columns: 1fr 1fr; gap: 10px; }
  .lp-plan { padding: 16px 13px; }
  .lp-plan-name { font-size: 13px; }
  .lp-price { font-size: 27px; }
  .lp-price span { font-size: 11.5px; }
  .lp-plan-note { font-size: 11px; }
  .lp-plan-list { margin-top: 14px; gap: 9px; }
  .lp-plan-li { font-size: 11.5px; gap: 7px; line-height: 1.4; }
  .lp-plan-li svg { width: 13px; height: 13px; }
  .lp-plan-pop-badge { font-size: 9.5px; padding: 3px 8px; margin-bottom: 12px; }
  .lp-plan .lp-btn { margin-top: 18px; padding: 11px 10px; font-size: 12.5px; }
}
`;

export default function LandingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="lp-root">

        {/* ===================== HERO ===================== */}
        <section className="lp-hero">
          <div className="lp-halo" />
          <span className="lp-dot" style={{ top: "140px", left: "13%", width: "8px", height: "8px" }} />
          <span className="lp-dot" style={{ top: "200px", right: "15%", width: "6px", height: "6px" }} />
          <span className="lp-dot" style={{ top: "62%", left: "11%", width: "7px", height: "7px" }} />
          <span className="lp-dot" style={{ top: "70%", right: "13%", width: "9px", height: "9px" }} />

          <nav className="lp-nav">
            <div className="lp-brand"><span className="lp-mark">◇</span>Peptide<span className="lp-em">Tracker</span></div>
            <div className="lp-nav-right">
              <Link href="/login" className="lp-login">Log in</Link>
              <Link href="/signup" className="lp-btn lp-btn-em">Get started</Link>
            </div>
          </nav>

          <div className="lp-hero-wrap">
            <p className="lp-eyebrow">For people who take it seriously</p>
            <h1 className="lp-h1">Every dose.<br />Every result.<br /><span className="lp-em">One place.</span></h1>
            <div className="lp-line" />
            <p className="lp-sub">The private dashboard for tracking your peptide protocol — doses, schedules, and progress, beautifully organized.</p>
            <div className="lp-ctas">
              <Link href="/signup" className="lp-btn lp-btn-em lp-btn-lg">Start free trial</Link>
            </div>
            <div className="lp-chip">✦ 14-day free trial · cancel anytime</div>
          </div>
        </section>

        {/* ===================== ENCYCLOPEDIA ===================== */}
        <section className="lp-section lp-glow-top">
          <div className="lp-inner">
            <div className="lp-head">
              <p className="lp-eyebrow">Built-in peptide encyclopedia</p>
              <h2 className="lp-h2">Look up any peptide.<br /><span className="lp-em">Know what you're working with.</span></h2>
              <p className="lp-sub">A reference library of 90+ peptides, built right into your dashboard — the details you need, always a tap away.</p>
            </div>

            <div className="lp-research">
              <span className="lp-pill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>
                Every entry is written from published research papers
              </span>
            </div>

            <div className="lp-cols">
              <div className="lp-entry">
                <div className="lp-kicker">Encyclopedia entry</div>
                <div className="lp-entry-head">
                  <span className="lp-entry-name">BPC-157</span>
                  <div className="lp-tags"><span className="lp-tag">Recovery</span><span className="lp-tag">Pentadecapeptide</span></div>
                </div>
                <p className="lp-over">A synthetic peptide widely studied in research for its role in tissue repair and recovery.</p>
                <div className="lp-rows">
                  <div className="lp-row"><span className="lp-row-k">Common goals</span><span className="lp-row-v">Recovery, tissue repair</span></div>
                  <div className="lp-row"><span className="lp-row-k">Administration</span><span className="lp-row-v">Subcutaneous</span></div>
                  <div className="lp-row"><span className="lp-row-k">Half-life</span><span className="lp-row-v">Short-acting</span></div>
                  <div className="lp-row"><span className="lp-row-k">Storage</span><span className="lp-row-v">Refrigerate once mixed</span></div>
                </div>
                <Link href="/signup" className="lp-entry-link">Read full entry →</Link>
              </div>

              <div className="lp-features">
                <div className="lp-feat">
                  <span className="lp-feat-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="5" y="3" width="14" height="18" rx="2" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg></span>
                  <div><h3>Plain-language overviews</h3><p>What each peptide is and how it's commonly used, in clear terms.</p></div>
                </div>
                <div className="lp-feat">
                  <span className="lp-feat-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></svg></span>
                  <div><h3>Class &amp; half-life</h3><p>Classification, half-life, and timing at a glance.</p></div>
                </div>
                <div className="lp-feat">
                  <span className="lp-feat-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="5" cy="6" r="1.2" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="5" cy="18" r="1.2" fill="currentColor" stroke="none" /></svg></span>
                  <div><h3>Typical protocols</h3><p>Common approaches and considerations, for reference.</p></div>
                </div>
                <div className="lp-feat">
                  <span className="lp-feat-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8Z" /><path d="M3 8l9 5 9-5" /><line x1="12" y1="13" x2="12" y2="21" /></svg></span>
                  <div><h3>Storage &amp; handling</h3><p>How to store, reconstitute, and handle each compound.</p></div>
                </div>
                <div className="lp-feat">
                  <span className="lp-feat-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg></span>
                  <div><h3>Search &amp; filter</h3><p>Find any compound in seconds by name or category.</p></div>
                </div>
                <div className="lp-feat">
                  <span className="lp-feat-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z" /></svg></span>
                  <div><h3>Always growing</h3><p>A library that keeps expanding with new entries.</p></div>
                </div>
              </div>
            </div>

            <div className="lp-ency-ftr">
              <Link href="/signup" className="lp-btn lp-btn-em lp-btn-lg">Browse the encyclopedia</Link>
              <p className="lp-disclaimer">Educational reference only — not medical advice.</p>
            </div>
          </div>
        </section>

        {/* ===================== STACK BUILDER ===================== */}
        <section className="lp-section lp-glow-top">
          <div className="lp-sb-inner">
            <div className="lp-head">
              <p className="lp-eyebrow">Stack builder</p>
              <h2 className="lp-h2">Pick your peptides.<br /><span className="lp-em">See what they target.</span></h2>
              <p className="lp-sub">Toggle any combination — single compounds or pre-made blends — and instantly see the goals your stack covers, from recovery and fat loss to muscle, skin, and more.</p>
            </div>

            <div className="lp-builder">
              <div className="lp-kicker" style={{ marginBottom: "12px" }}>Your stack</div>
              <div className="lp-chips">
                <span className="lp-pchip sel">BPC-157 + GHK-CU + TB-500 + KPV Blend <b>×</b></span>
                <span className="lp-pchip sel">Tesamorelin <b>×</b></span>
              </div>

              <div className="lp-addrow"><span>+ Add / remove peptides</span></div>
              <div className="lp-chips lp-muted-chips">
                <span className="lp-pchip">Ipamorelin</span>
                <span className="lp-pchip">Semaglutide</span>
                <span className="lp-pchip">TB-500</span>
                <span className="lp-pchip">CJC-1295 with DAC</span>
                <span className="lp-pchip">Retatrutide</span>
                <span className="lp-pchip">+ 85 more</span>
              </div>

              <div className="lp-divider" />

              <p className="lp-targets"><b>This stack targets</b> <span>— 2 primary goals, 2 with secondary support</span></p>

              <div className="lp-goals">
                <div className="lp-goal">
                  <div className="lp-goal-top">
                    <div className="lp-goal-name"><span className="lp-goal-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><polyline points="3 12 7 12 9 18 13 6 15 12 21 12" /></svg></span>Healing &amp; Recovery</div>
                    <span className="lp-badge pri">Primary</span>
                  </div>
                  <p className="lp-goal-src">Primary for <em>BPC-157 + GHK-CU + TB-500 + KPV Blend</em></p>
                </div>

                <div className="lp-goal">
                  <div className="lp-goal-top">
                    <div className="lp-goal-name"><span className="lp-goal-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><polyline points="3 7 9 13 13 9 21 17" /><polyline points="21 11 21 17 15 17" /></svg></span>Weight Loss &amp; Appetite</div>
                    <span className="lp-badge pri">Primary</span>
                  </div>
                  <p className="lp-goal-src">Primary for <em>Tesamorelin</em></p>
                </div>

                <div className="lp-goal">
                  <div className="lp-goal-top">
                    <div className="lp-goal-name"><span className="lp-goal-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg></span>Skin, Hair &amp; Tanning</div>
                    <span className="lp-badge sec">Secondary</span>
                  </div>
                  <p className="lp-goal-src">Secondary for <em>BPC-157 + GHK-CU + TB-500 + KPV Blend</em></p>
                </div>

                <div className="lp-goal">
                  <div className="lp-goal-top">
                    <div className="lp-goal-name"><span className="lp-goal-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><path d="M6.5 6.5v11M4 9v6M17.5 6.5v11M20 9v6" /><line x1="6.5" y1="12" x2="17.5" y2="12" /></svg></span>Muscle &amp; Performance</div>
                    <span className="lp-badge sec">Secondary</span>
                  </div>
                  <p className="lp-goal-src">Secondary for <em>Tesamorelin</em></p>
                </div>
              </div>
            </div>

            <p className="lp-caption">Toggle peptides and your goals update live.</p>
          </div>
        </section>

        {/* ===================== MY STACK ===================== */}
        <section className="lp-section lp-glow-right">
          <div className="lp-scols">
            <div>
              <p className="lp-eyebrow">My Stack</p>
              <h2 className="lp-h2">Your whole stack,<br /><span className="lp-em">at a glance.</span></h2>
              <p className="lp-sub" style={{ maxWidth: "440px" }}>See everything you're running right now — peptides, doses, and timing — in one clean view, so you always know what's next.</p>
              <div className="lp-points">
                <div className="lp-pt"><span className="lp-ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12" /></svg></span>Every active peptide, dose, and frequency in one place.</div>
                <div className="lp-pt"><span className="lp-ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12" /></svg></span>See what's coming up next without digging through your log.</div>
                <div className="lp-pt"><span className="lp-ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12" /></svg></span>Built from your protocol — update once, see it everywhere.</div>
              </div>
            </div>

            <div className="lp-stack">
              <div className="lp-stack-head">
                <span className="lp-stack-title">My Stack</span>
                <span className="lp-stack-chip">3 active</span>
              </div>
              <div className="lp-next">
                <div className="lp-next-lbl">Next dose</div>
                <div className="lp-next-val">Ipamorelin · today, 8:00 PM</div>
              </div>
              <div className="lp-srows">
                <div className="lp-srow">
                  <div className="lp-srow-l"><span className="lp-pdot" /><div><div className="lp-srow-nm">BPC-157</div><div className="lp-srow-dose">250 mcg · subcutaneous</div></div></div>
                  <span className="lp-srow-freq">Daily</span>
                </div>
                <div className="lp-srow">
                  <div className="lp-srow-l"><span className="lp-pdot" /><div><div className="lp-srow-nm">Ipamorelin</div><div className="lp-srow-dose">300 mcg · evening</div></div></div>
                  <span className="lp-srow-freq">Daily · PM</span>
                </div>
                <div className="lp-srow">
                  <div className="lp-srow-l"><span className="lp-pdot" /><div><div className="lp-srow-nm">TB-500</div><div className="lp-srow-dose">2 mg · subcutaneous</div></div></div>
                  <span className="lp-srow-freq">2× / week</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== HOW IT WORKS ===================== */}
        <section className="lp-section" style={{ background: "#010912" }}>
          <div className="lp-inner">
            <div className="lp-head">
              <p className="lp-eyebrow">How it works</p>
              <h2 className="lp-h2">Up and running in minutes.</h2>
              <p className="lp-sub">No spreadsheets, no guesswork — just three simple steps.</p>
            </div>
            <div className="lp-steps">
              <div className="lp-step">
                <div className="lp-step-num">1</div>
                <h3>Add your protocol</h3>
                <p>Pick your peptides and set your doses and schedule — single compounds or pre-made blends.</p>
              </div>
              <div className="lp-step">
                <div className="lp-step-num">2</div>
                <h3>Log as you go</h3>
                <p>Tap to log each dose. Reminders keep you on track so nothing slips through the cracks.</p>
              </div>
              <div className="lp-step">
                <div className="lp-step-num">3</div>
                <h3>Watch your progress</h3>
                <p>Track weight, measurements, and photos, and see how your stack is working over time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== PRICING ===================== */}
        <section className="lp-section lp-glow-top">
          <div className="lp-inner">
            <div className="lp-head">
              <p className="lp-eyebrow">Pricing</p>
              <h2 className="lp-h2">Start free. Upgrade when you want more.</h2>
              <p className="lp-sub">Everything you need to track your protocol is free. Go Premium for deeper insight and your doctor-ready report.</p>
            </div>

            <div className="lp-plans">
              <div className="lp-plan">
                <div className="lp-plan-name">Free</div>
                <div className="lp-price">$0</div>
                <div className="lp-plan-note">Free forever — no card required.</div>
                <div className="lp-plan-list">
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Log doses &amp; track your schedule</div>
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Reminders &amp; inventory tracking</div>
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Full peptide encyclopedia</div>
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Stack builder &amp; goal targeting</div>
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Progress tracking — weight, measurements, photos</div>
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Charts &amp; CSV export</div>
                </div>
                <Link href="/signup" className="lp-btn lp-btn-ghost">Get started</Link>
              </div>

              <div className="lp-plan pop">
                <div className="lp-plan-pop-badge">Most popular</div>
                <div className="lp-plan-name">Premium</div>
                <div className="lp-price">$2.99 <span>/ month</span></div>
                <div className="lp-plan-note">or $24.99/year · 14-day free trial</div>
                <div className="lp-plan-list">
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Everything in Free, plus:</div>
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Advanced insights &amp; correlations</div>
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Weekly progress reports</div>
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Doctor-ready PDF export</div>
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Shareable read-only links</div>
                  <div className="lp-plan-li"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>Unlimited progress photos</div>
                </div>
                <Link href="/signup" className="lp-btn lp-btn-em">Start free trial</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== FINAL CTA ===================== */}
        <section className="lp-final">
          <div className="lp-final-inner">
            <h2>Take control of your protocol.</h2>
            <p>Start tracking in minutes — it's free to begin.</p>
            <div className="lp-ctas">
              <Link href="/signup" className="lp-btn lp-btn-em lp-btn-lg">Start free trial</Link>
              <Link href="/login" className="lp-btn lp-btn-ghost lp-btn-lg">Log in</Link>
            </div>
          </div>
        </section>

        {/* ===================== FOOTER ===================== */}
        <footer className="lp-footer">
          <div className="lp-foot-top">
            <div className="lp-foot-brand">
              <div className="lp-brand"><span className="lp-mark">◇</span>Peptide<span className="lp-em">Tracker</span></div>
              <p className="lp-foot-tag">The private dashboard for tracking your peptide protocol — doses, schedules, stacks, and progress, all in one place.</p>
            </div>
            <div className="lp-foot-links">
              <div className="lp-foot-col">
                <h4>Product</h4>
                <Link href="/login">Log in</Link>
                <Link href="/signup">Get started</Link>
              </div>
              <div className="lp-foot-col">
                <h4>Legal</h4>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/terms">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="lp-foot-bottom">
            <p className="lp-foot-disc">Peptide Tracker is a personal tracking tool — not a pharmacy or medical provider, and nothing in it is medical advice. Always consult a qualified healthcare professional before making decisions about your health.</p>
            <p className="lp-foot-copy">© 2026 Peptide Tracker. All rights reserved.</p>
          </div>
        </footer>

      </div>
    </>
  );
}