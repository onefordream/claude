import { schedule, scheduleNote } from "../../data/schedule.mjs";
import { esc } from "../../lib/render.mjs";

export function renderSchedule() {
  return `
<section class="section" id="schedule">
  <div class="container">
    <p class="eyebrow reveal" data-reveal>SCHEDULE</p>
    <h2 class="h2 reveal" data-reveal data-reveal-delay="1">当日スケジュール</h2>
    <p class="lead reveal" data-reveal data-reveal-delay="2">ラウンド終了後は、第2回大会の新企画「プロ・アマ合同表彰式」を開催します。</p>

    <ol class="timeline reveal" data-reveal data-reveal-delay="3">
      ${schedule
        .map(
          (s) => `
      <li class="timeline__item">
        <span class="timeline__time">${esc(s.time)}</span>
        <span class="timeline__dot" aria-hidden="true"></span>
        <span class="timeline__label">${esc(s.label)}</span>
      </li>`
        )
        .join("")}
    </ol>

    <p class="schedule__note reveal" data-reveal data-reveal-delay="4">${esc(scheduleNote)}</p>
  </div>
</section>`;
}
