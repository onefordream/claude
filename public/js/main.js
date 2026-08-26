import { initNav } from "./nav.js";
import { initReveal, initParallax } from "./reveal.js";
import { initCounters } from "./counter.js";
import { initPlayerModal } from "./player-modal.js";
import { initLightbox } from "./lightbox.js";
import { initEntryForm } from "./entry-form.js";
import { initContactForm } from "./contact-form.js";

function init() {
  initNav();
  initReveal();
  initParallax();
  initCounters();
  initPlayerModal();
  initLightbox();
  initEntryForm();
  initContactForm();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
