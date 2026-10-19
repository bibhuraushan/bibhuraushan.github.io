/* About Me: contact links and address from data/profile.json, and the CV download on the Journey tab. */
(function () {
  "use strict";
  const esc = (s) => Site.esc(s);

  document.addEventListener("DOMContentLoaded", async () => {
    const p = await Site.profile;
    const ul = document.querySelector("[data-contact-links]");
    if (p && ul) {
      ul.innerHTML = Site.profileLinks(p).map((l) => `
        <li><a href="${esc(l.href)}"${l.attrs || ' target="_blank" rel="me noopener"'}>${Site.icon(l.icon)}<span>${esc(l.text)}<small>${esc(l.key === "email" ? "Email" : l.href.replace(/^https?:\/\//, "").split("/")[0])}</small></span></a></li>`).join("");
    }
    if (p?.address) document.querySelectorAll("[data-address]").forEach((a) => (a.innerHTML = p.address.map(esc).join("<br>")));

    // Mentoring tab: one row per person from data/mentoring.json.
    const mt = document.querySelector("[data-mentoring]");
    if (mt) {
      try {
        const { items } = await Site.json("data/mentoring.json");
        mt.innerHTML = items.length ? `
          <table>
            <thead><tr><th>Name</th><th>Mentorship</th><th>Current position</th></tr></thead>
            <tbody>${items.map((m) => `
              <tr>
                <td data-label="Name"><b>${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>` : esc(m.name)}</b></td>
                <td data-label="Mentorship">${esc(m.mentorship)}</td>
                <td data-label="Current position">${esc(m.current)}</td>
              </tr>`).join("")}</tbody>
          </table>` : `<div class="empty">Mentoring will be listed here.</div>`;
      } catch { mt.innerHTML = `<div class="empty">Mentoring could not be loaded.</div>`; }
    }

    // The CV button appears once data/profile.json names a PDF (e.g. "assets/cv/cv.pdf").
    const cv = document.querySelector("[data-cv-pdf]");
    if (p?.cv_pdf && cv) { cv.href = p.cv_pdf; cv.hidden = false; }

  });
})();
