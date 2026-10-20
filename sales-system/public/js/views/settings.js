window.SettingsView = (() => {
  async function render(container) {
    const s = await api.get('/api/settings');
    container.innerHTML = `
      <div class="panel">
        <h2>メール送信設定 (SMTP)</h2>
        <p class="help-text">
          状態: ${s.configured ? '<strong style="color:var(--green);">設定済み</strong>' : '<strong style="color:var(--red);">未設定</strong>'}
          ／ Gmailを使う場合はホストに smtp.gmail.com、ポート587、ユーザー名にGmailアドレス、パスワードに「アプリパスワード」を設定してください。
        </p>
        <div class="form-grid">
          <div class="form-row"><label>SMTPホスト</label><input id="s-host" value="${escapeHtml(s.smtp_host)}" placeholder="smtp.gmail.com" /></div>
          <div class="form-row"><label>ポート</label><input id="s-port" value="${escapeHtml(s.smtp_port)}" placeholder="587" /></div>
          <div class="form-row"><label>ユーザー名</label><input id="s-user" value="${escapeHtml(s.smtp_user)}" /></div>
          <div class="form-row"><label>パスワード${s.smtp_pass_set ? '（設定済み・変更する場合のみ入力）' : ''}</label><input id="s-pass" type="password" placeholder="${s.smtp_pass_set ? '●●●●●●●●' : ''}" /></div>
          <div class="form-row"><label>送信元アドレス (From)</label><input id="s-from" value="${escapeHtml(s.mail_from)}" /></div>
          <div class="form-row checkbox-row" style="margin-top:20px;">
            <input type="checkbox" id="s-secure" ${s.smtp_secure === 'true' ? 'checked' : ''} />
            <label for="s-secure">SSL/TLSを使用する（ポート465の場合はON）</label>
          </div>
        </div>
        <button class="primary" id="btn-save">保存</button>

        <h2 style="margin-top:20px;">テスト送信</h2>
        <div class="toolbar">
          <input type="email" id="test-to" placeholder="送信確認用メールアドレス" />
          <button class="secondary" id="btn-test">テストメール送信</button>
        </div>
      </div>

      <div class="panel">
        <h2>このシステムについて</h2>
        <ul class="help-text">
          <li>メールは設定したSMTP経由で自動送信されます。送信先・送信日時・成否はすべて記録として残ります。</li>
          <li>Instagram DM等は規約上の自動送信リスクがあるため、文面の自動生成＋コピー＋手動送信という半自動フローで管理します。送信したら「送信済みにする」で活動履歴に記録してください。</li>
          <li>ログイン情報(ADMIN_USER / ADMIN_PASSWORD)はサーバーの .env で管理しています。</li>
        </ul>
      </div>
    `;

    container.querySelector('#btn-save').addEventListener('click', async () => {
      const payload = {
        smtp_host: container.querySelector('#s-host').value.trim(),
        smtp_port: container.querySelector('#s-port').value.trim(),
        smtp_secure: container.querySelector('#s-secure').checked,
        smtp_user: container.querySelector('#s-user').value.trim(),
        mail_from: container.querySelector('#s-from').value.trim(),
      };
      const pass = container.querySelector('#s-pass').value;
      if (pass) payload.smtp_pass = pass;
      try {
        await api.put('/api/settings', payload);
        toast('設定を保存しました');
        await render(container);
      } catch (e) {
        toast(e.message, true);
      }
    });

    container.querySelector('#btn-test').addEventListener('click', async () => {
      const to = container.querySelector('#test-to').value.trim();
      if (!to) return toast('送信先を入力してください', true);
      try {
        await api.post('/api/settings/test-mail', { to });
        toast('テストメールを送信しました');
      } catch (e) {
        toast(e.message, true);
      }
    });
  }

  return { render };
})();
