// Shared helpers for Jeox pages.

function cardHTML(g) {
  const badge = g.embed ? "" : '<span class="badge">Coming soon</span>';
  return `
    <a class="card" href="play.html?game=${encodeURIComponent(g.id)}">
      <div class="thumb" style="background:${g.color}">${badge}<span aria-hidden="true">${g.icon}</span></div>
      <div class="info"><h3>${escapeHTML(g.title)}</h3><div class="cat">${escapeHTML(g.category)}</div></div>
    </a>`;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function footerHTML() {
  return `<div class="wrap">
    <span>© ${new Date().getFullYear()} Jeox · Free online games</span>
    <span><a href="about.html">About</a> · <a href="privacy.html">Privacy</a></span>
  </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const f = document.querySelector("footer");
  if (f) f.innerHTML = footerHTML();
});
