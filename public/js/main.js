(function () {
  var list = document.getElementById("course-list");
  var courses = window.GOLF_COURSES || [];
  if (!list || !courses.length) return;

  var newTab = window.GOLF_OPEN_IN_NEW_TAB === true;
  var html = "";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  courses.forEach(function (course, i) {
    var isLive = /^https?:\/\//i.test(course.url || "");
    var num = ("0" + (i + 1)).slice(-2);
    // 1枚目はファーストビューに入るため優先読み込み、2枚目以降は遅延読み込み
    var loading = i === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';

    html +=
      "<li>" +
      '<a class="course" href="' + (isLive ? esc(course.url) : "#") + '"' +
      ' rel="sponsored noopener noreferrer"' +
      (newTab ? ' target="_blank"' : "") +
      (isLive ? "" : ' data-placeholder="true"') +
      ' aria-label="' + esc(course.name) + "の特別プランを見る" + '">' +
      '<span class="course__media">' +
      '<img src="' + esc(course.image) + '" alt="' + esc(course.alt || course.name) + '"' +
      ' width="1600" height="800" decoding="async" ' + loading +
      " onerror=\"this.style.display='none'\">" +
      "</span>" +
      '<span class="course__num" aria-hidden="true">' + num + "</span>" +
      '<span class="course__body">' +
      '<span class="course__info">' +
      '<span class="course__label">SECRET PLAN</span>' +
      '<span class="course__name">' + esc(course.name) + "</span>" +
      "</span>" +
      '<span class="course__cta">特別プランを見る<span class="course__arrow" aria-hidden="true">→</span></span>' +
      "</span>" +
      "</a>" +
      "</li>";
  });

  list.innerHTML = html;

  // 仮URLのままのカードは遷移させない
  list.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('a[data-placeholder="true"]');
    if (link) {
      e.preventDefault();
      if (window.console) console.warn("予約URLが未設定です: js/courses.js の url を設定してください。");
    }
  });
})();
