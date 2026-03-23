// Boot loader — atmospheric system-init screen shown before the app hydrates.
// Pure inline HTML/CSS/JS so it paints on first frame (no module deps).

const BOOT_MESSAGES = [
  "Initializing",
  "Loading providers",
  "Resolving agents",
  "Preparing workspace",
  "Ready",
];

export function getBootLoaderStyles(): string {
  return `
/* ── Boot Loader ──────────────────────────────────── */
#cr-boot-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.8s ease-out,
              filter 0.8s ease-out;
}

#cr-boot-loader.boot-exit {
  opacity: 0;
  filter: blur(4px);
  pointer-events: none;
}

/* ── Theme surfaces ───────────────────────────────── */
[data-theme="cr-black"] #cr-boot-loader {
  background: #0b0e17;
  color: #c5cee0;
}
[data-theme="cr-light"] #cr-boot-loader {
  background: #f0f3f8;
  color: #2d3548;
}

/* ── Subtle scan-line texture ─────────────────────── */
#cr-boot-loader::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(120, 160, 220, 0.015) 3px,
    rgba(120, 160, 220, 0.015) 4px
  );
  pointer-events: none;
}

/* ── Slow ambient light sweep ─────────────────────── */
#cr-boot-loader::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(56, 189, 248, 0.035) 40%,
    rgba(56, 189, 248, 0.06) 50%,
    rgba(56, 189, 248, 0.035) 60%,
    transparent 100%
  );
  animation: boot-scan 6s ease-in-out infinite;
  pointer-events: none;
}
[data-theme="cr-light"] #cr-boot-loader::after {
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(37, 99, 235, 0.04) 40%,
    rgba(37, 99, 235, 0.07) 50%,
    rgba(37, 99, 235, 0.04) 60%,
    transparent 100%
  );
}

@keyframes boot-scan {
  0%   { top: -120px; }
  100% { top: calc(100% + 120px); }
}

/* ── Glyph container ──────────────────────────────── */
.boot-glyph {
  position: relative;
  width: 64px;
  height: 64px;
  margin-bottom: 32px;
  opacity: 0;
  animation: boot-glyph-in 1.4s 0.1s ease-out forwards;
}

@keyframes boot-glyph-in {
  0%   { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Gentle breathing glow */
.boot-glyph::after {
  content: "";
  position: absolute;
  inset: -24px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%);
  animation: boot-glow 4s ease-in-out infinite alternate;
}
[data-theme="cr-light"] .boot-glyph::after {
  background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%);
}

@keyframes boot-glow {
  0%   { opacity: 0.5; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1.05); }
}

.boot-glyph svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 20px rgba(56, 189, 248, 0.2));
}
[data-theme="cr-light"] .boot-glyph svg {
  filter: drop-shadow(0 0 16px rgba(37, 99, 235, 0.15));
}

/* ── Status text ──────────────────────────────────── */
.boot-status {
  font-family: "Manrope", system-ui, sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  height: 18px;
  overflow: hidden;
  position: relative;
  opacity: 0;
  animation: boot-fade-in 1s 0.6s ease-out forwards;
}
[data-theme="cr-black"] .boot-status {
  color: rgba(139, 233, 255, 0.5);
}
[data-theme="cr-light"] .boot-status {
  color: rgba(37, 99, 235, 0.45);
}

@keyframes boot-fade-in {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}

.boot-status-line {
  display: block;
  text-align: center;
  height: 18px;
  line-height: 18px;
  animation: boot-msg-fade 0.6s ease-out both;
}

@keyframes boot-msg-fade {
  0%   { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* ── Progress rail ────────────────────────────────── */
.boot-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  animation: boot-fade-in 0.8s 0.8s ease-out forwards;
}
[data-theme="cr-black"] .boot-progress {
  background: rgba(255, 255, 255, 0.03);
}
[data-theme="cr-light"] .boot-progress {
  background: rgba(0, 0, 0, 0.04);
}

.boot-progress-bar {
  height: 100%;
  width: 0%;
  transition: width 0.8s ease-in-out;
}
[data-theme="cr-black"] .boot-progress-bar {
  background: linear-gradient(90deg, #38bdf8, #2563eb);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.25);
}
[data-theme="cr-light"] .boot-progress-bar {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.2);
}

/* ── Corner brackets ──────────────────────────────── */
.boot-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  opacity: 0;
  animation: boot-fade-in 1.2s 0.8s ease-out forwards;
}
.boot-corner { --bc: rgba(56, 189, 248, 0.08); }
[data-theme="cr-light"] .boot-corner { --bc: rgba(37, 99, 235, 0.08); }

.boot-corner--tl { top: 20px; left: 20px; border-top: 1px solid var(--bc); border-left: 1px solid var(--bc); }
.boot-corner--tr { top: 20px; right: 20px; border-top: 1px solid var(--bc); border-right: 1px solid var(--bc); }
.boot-corner--bl { bottom: 20px; left: 20px; border-bottom: 1px solid var(--bc); border-left: 1px solid var(--bc); }
.boot-corner--br { bottom: 20px; right: 20px; border-bottom: 1px solid var(--bc); border-right: 1px solid var(--bc); }

/* ── Version tag ──────────────────────────────────── */
.boot-ver {
  position: absolute;
  bottom: 14px;
  right: 24px;
  font-family: "Manrope", system-ui, sans-serif;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0;
  animation: boot-fade-in 1s 1.2s ease-out forwards;
}
.boot-ver { color: inherit; opacity: 0; }
[data-theme="cr-black"] .boot-ver { --final-opacity: 0.12; }
[data-theme="cr-light"] .boot-ver { --final-opacity: 0.18; }
@keyframes boot-ver-in {
  0%   { opacity: 0; }
  100% { opacity: var(--final-opacity, 0.12); }
}
`;
}

export function getBootLoaderHtml(): string {
  // Inline SVG brand mark — minimalist <✓> code review glyph
  const glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bl-bg" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#050816"/>
    </linearGradient>
    <radialGradient id="bl-glow" cx="32" cy="28" r="22" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#38bdf8" stop-opacity="0.14"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bl-stroke" x1="10" y1="18" x2="54" y2="46" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7dd3fc"/><stop offset="0.5" stop-color="#38bdf8"/><stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="61" height="61" rx="16" fill="url(#bl-bg)"/>
  <rect x="1.5" y="1.5" width="61" height="61" rx="16" fill="none" stroke="#ffffff10" stroke-width="1"/>
  <circle cx="32" cy="28" r="22" fill="url(#bl-glow)"/>
  <polyline points="23,20 12,32 23,44" fill="none" stroke="url(#bl-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="41,20 52,32 41,44" fill="none" stroke="url(#bl-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="27.5,33 31,37 37,27" fill="none" stroke="url(#bl-stroke)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

  return `
<div id="cr-boot-loader" aria-live="polite" aria-label="Loading application">
  <div class="boot-corner boot-corner--tl"></div>
  <div class="boot-corner boot-corner--tr"></div>
  <div class="boot-corner boot-corner--bl"></div>
  <div class="boot-corner boot-corner--br"></div>
  <div class="boot-glyph">${glyphSvg}</div>
  <div class="boot-status" id="cr-boot-status">
    <span class="boot-status-line">${BOOT_MESSAGES[0]}</span>
  </div>
  <div class="boot-progress">
    <div class="boot-progress-bar" id="cr-boot-bar"></div>
  </div>
  <div class="boot-ver">CR v0.1</div>
</div>`;
}

export function getBootLoaderScript(): string {
  const messages = JSON.stringify(BOOT_MESSAGES);
  return `<script>
(() => {
  const MSGS = ${messages};
  const MIN_DISPLAY_MS = 2200;
  const bootStart = Date.now();
  const statusEl = document.getElementById("cr-boot-status");
  const barEl = document.getElementById("cr-boot-bar");
  const loaderEl = document.getElementById("cr-boot-loader");
  if (!statusEl || !barEl || !loaderEl) return;

  let msgIdx = 0;
  const totalSteps = MSGS.length;
  barEl.style.width = Math.round(((msgIdx + 1) / totalSteps) * 80) + "%";

  const interval = setInterval(() => {
    msgIdx++;
    if (msgIdx >= totalSteps - 1) { clearInterval(interval); return; }
    statusEl.innerHTML = '<span class="boot-status-line">' + MSGS[msgIdx] + '</span>';
    barEl.style.width = Math.round(((msgIdx + 1) / totalSteps) * 80) + "%";
  }, 550);

  window.__crBootDismiss = () => {
    clearInterval(interval);
    const elapsed = Date.now() - bootStart;
    const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
    setTimeout(() => {
      statusEl.innerHTML = '<span class="boot-status-line">' + MSGS[MSGS.length - 1] + '</span>';
      barEl.style.width = "100%";
      setTimeout(() => {
        loaderEl.classList.add("boot-exit");
        loaderEl.addEventListener("transitionend", () => loaderEl.remove(), { once: true });
        setTimeout(() => loaderEl.remove(), 900);
      }, 500);
    }, wait);
  };
})();
</script>`;
}
