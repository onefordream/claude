// エントリーフォーム：区分切替・バリデーション・二重送信防止・送信結果表示
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9()+\-\s]{9,15}$/;

const ERROR_LABELS = {
  name: "氏名を入力してください",
  kana: "フリガナを入力してください",
  email: "正しいメールアドレスを入力してください",
  phone: "正しい電話番号を入力してください",
  agreed: "キャンセル規定・大会規約への同意が必要です",
};

export function initEntryForm() {
  const form = document.querySelector("[data-entry-form]");
  if (!form) return;

  const tabs = document.querySelectorAll("[data-category-tab]");
  const categoryInput = form.querySelector("[data-category-input]");
  const feeBlock = form.querySelector("[data-fee-block]");
  const resultEl = document.querySelector("[data-entry-result]");
  const statusEl = form.querySelector("[data-form-status]");
  const submitBtn = form.querySelector("[data-submit-btn]");
  const btnLabel = submitBtn.querySelector("[data-btn-label]");

  let submitting = false;

  function setCategory(category) {
    categoryInput.value = category;
    tabs.forEach((t) => {
      const active = t.getAttribute("data-category-tab") === category;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    feeBlock.hidden = category !== "amateur";
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setCategory(tab.getAttribute("data-category-tab")));
  });

  function clearErrors() {
    form.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  }

  function showFieldError(name, message) {
    const el = form.querySelector(`[data-error-for="${name}"]`);
    if (el) el.textContent = message;
    const field = form.querySelector(`[name="${name}"]`);
    if (field) field.setAttribute("aria-invalid", "true");
  }

  function validate(data) {
    const errors = {};
    if (!data.name.trim()) errors.name = ERROR_LABELS.name;
    if (!data.kana.trim()) errors.kana = ERROR_LABELS.kana;
    if (!EMAIL_RE.test(data.email.trim())) errors.email = ERROR_LABELS.email;
    if (!PHONE_RE.test(data.phone.trim())) errors.phone = ERROR_LABELS.phone;
    if (!data.agreed) errors.agreed = ERROR_LABELS.agreed;
    return errors;
  }

  async function refreshCapacity() {
    try {
      const res = await fetch("/api/capacity");
      if (!res.ok) return;
      const data = await res.json();
      ["pro", "amateur"].forEach((category) => {
        const badge = document.querySelector(`[data-capacity="${category}"]`);
        if (!badge) return;
        const info = data[category];
        const text = badge.querySelector("[data-capacity-text]");
        if (info.full) {
          badge.classList.add("capacity-badge--full");
          text.textContent = "定員に達しました｜キャンセル待ち受付中";
        } else {
          badge.classList.remove("capacity-badge--full");
          text.textContent = `残り${info.remaining}名`;
        }
      });
    } catch {
      /* ネットワークエラー時は現在の表示を維持 */
    }
  }

  function showResult(kind, title, body) {
    form.hidden = true;
    resultEl.hidden = false;
    resultEl.dataset.kind = kind;
    resultEl.innerHTML = `<p class="entry-result__title">${title}</p><p>${body}</p>`;
    resultEl.focus();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return;

    clearErrors();
    const formData = new FormData(form);
    const payload = {
      category: formData.get("category"),
      name: formData.get("name") || "",
      kana: formData.get("kana") || "",
      email: formData.get("email") || "",
      phone: formData.get("phone") || "",
      companion: formData.get("companion") || "",
      agreed: form.querySelector("#entry-agree").checked,
    };

    const errors = validate(payload);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([field, msg]) => showFieldError(field, msg));
      statusEl.textContent = "入力内容をご確認ください。";
      statusEl.dataset.state = "error";
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    btnLabel.textContent = "送信中…";
    statusEl.textContent = "送信中です。しばらくお待ちください。";
    statusEl.dataset.state = "loading";

    try {
      const res = await fetch("/api/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 201) {
        const data = await res.json();
        refreshCapacity();
        if (data.status === "waitlist") {
          showResult(
            "waitlist",
            "キャンセル待ちを受け付けました",
            "現在、定員に達しているため、キャンセル待ちとして受け付けました。空きが出た場合、ご登録のメールアドレスまたはお電話にご連絡いたします。"
          );
        } else {
          showResult(
            "confirmed",
            "エントリーを受け付けました",
            "ご登録ありがとうございます。大会に関する詳細は、開催が近づきましたら改めてご案内いたします。"
          );
        }
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        Object.entries(data.errors || {}).forEach(([field, msg]) => showFieldError(field, msg));
        statusEl.textContent = "入力内容をご確認ください。";
        statusEl.dataset.state = "error";
        return;
      }

      if (res.status === 409) {
        showResult(
          "closed",
          "エントリー受付を終了しました",
          "申し訳ございません。申込締切に達したため、通常エントリーの受付を終了しました。詳細はお問い合わせよりご連絡ください。"
        );
        return;
      }

      if (res.status === 429) {
        statusEl.textContent = "送信回数が多すぎます。しばらく時間をおいて再度お試しください。";
        statusEl.dataset.state = "error";
        return;
      }

      throw new Error("unexpected status");
    } catch {
      statusEl.textContent = "送信中にエラーが発生しました。時間をおいて再度お試しいただくか、お電話にてお問い合わせください。";
      statusEl.dataset.state = "error";
    } finally {
      submitting = false;
      submitBtn.disabled = false;
      btnLabel.textContent = "エントリーを送信する";
    }
  });

  setCategory("amateur");
  refreshCapacity();
}
