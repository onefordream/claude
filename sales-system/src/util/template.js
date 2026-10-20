// Renders {{field}} placeholders in a template string against a prospect row.
// Unknown placeholders are left as an empty string rather than throwing, so a
// partially-filled prospect record never blocks sending.

const FIELD_LABELS = {
  name: '店舗名',
  prefecture: '都道府県',
  city: '市区町村',
  address: '住所',
  phone: '電話番号',
  email: 'メールアドレス',
  website: 'Webサイト',
  instagram: 'Instagram',
  owner: '担当者',
};

function renderTemplate(text, prospect) {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = prospect ? prospect[key] : undefined;
    return value === null || value === undefined ? '' : String(value);
  });
}

module.exports = { renderTemplate, FIELD_LABELS };
