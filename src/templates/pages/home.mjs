import { renderDocument } from "../layout.mjs";
import { renderHero } from "../sections/hero.mjs";
import { renderNewsStrip } from "../sections/news-strip.mjs";
import { renderAbout } from "../sections/about.mjs";
import { renderHighlights } from "../sections/highlights.mjs";
import { renderPlayers } from "../sections/players.mjs";
import { renderSpecialMc } from "../sections/special-mc.mjs";
import { renderPrize } from "../sections/prize.mjs";
import { renderTournamentInfo } from "../sections/tournament-info.mjs";
import { renderSchedule } from "../sections/schedule.mjs";
import { renderEntry } from "../sections/entry.mjs";
import { renderSponsors } from "../sections/sponsors.mjs";
import { renderFirstTournament } from "../sections/first-tournament.mjs";
import { renderGallery } from "../sections/gallery.mjs";
import { renderFaq } from "../sections/faq.mjs";
import { renderAccess } from "../sections/access.mjs";
import { renderContact } from "../sections/contact.mjs";

export function renderHome({ capacity }) {
  const content = [
    renderHero(),
    renderHighlights(),
    renderNewsStrip(),
    renderAbout(),
    renderPlayers(),
    renderSpecialMc(),
    renderPrize(),
    renderTournamentInfo(),
    renderSchedule(),
    renderEntry({ capacity }),
    renderSponsors(),
    renderFirstTournament(),
    renderGallery(),
    renderFaq(),
    renderAccess(),
    renderContact(),
  ].join("\n");

  return renderDocument({
    path: "/",
    bodyClass: "page-home",
    content,
  });
}
