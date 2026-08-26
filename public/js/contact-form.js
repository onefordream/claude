// お問い合わせフォーム：バリデーション・二重送信防止・送信結果表示
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const statusEl = form.querySelector("[data-form-status]");
  const submitBtn = form.querySelector("[data-submit-btn]");
  const btnLabel = submitBtn.querySelector("[data-btn-label]");
  let submitting = false;

  // スポンサーCTA等から遷移してきた場合、種別を自動選択する
  document.querySelectorAll("[data-contact-topic]").forEach((link) => {
    link.addEventListener("click", () => {
      const topic = link.getAttribute("data-contact-topic");
      const select = form.querySelector("[data-contact-type]");
      if (!select) return;
      const match = Array.from(select.options).find((o) =>
        topic === "sponsor" ? o.value.includes("スポンサー") : false
      );
      if (match) select.value = match.value;
    });
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return;
    clearErrors();

    const formData = new FormData(form);
    const payload = {
      type: formData.get("type") || "その他",
      name: (formData.get("name") || "").toString(),
      email: (formData.get("email") || "").toString(),
      phone: (formData.get("phone") || "").toString(),
      message: (formData.get("message") || "").toString(),
    };

    const errors = {};
    if (!payload.name.trim()) errors.name = "氏名を入力してください";
    if (!EMAIL_RE.test(payload.email.trim())) errors.email = "正しいメールアドレスを入力してください";
    if (!payload.message.trim()) errors.message = "お問い合わせ内容を入力してください";

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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 201) {
        form.reset();
        statusEl.textContent = "お問い合わせを受け付けました。ご連絡ありがとうございます。";
        statusEl.dataset.state = "success";
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        Object.entries(data.errors || {}).forEach(([field, msg]) => showFieldError(field, msg));
        statusEl.textContent = "入力内容をご確認ください。";
        statusEl.dataset.state = "error";
        return;
      }

      if (res.status === 429) {
        statusEl.textContent = "送信回数が多すぎます。しばらく時間をおいて再度お試しください。";
        statusEl.dataset.state = "error";
        return;
      }

      throw new Error("unexpected status");
    } catch {
      statusEl.textContent = "送信中にエラーが発生しました。お手数ですがお電話にてお問い合わせください。";
      statusEl.dataset.state = "error";
    } finally {
      submitting = false;
      submitBtn.disabled = false;
      btnLabel.textContent = "送信する";
    }
  });
}
