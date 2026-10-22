const { getSetting } = require('./db');

// Uses Places API (New) Text Search. Requesting phone/website fields puts
// the call in Google's higher-priced SKU tier — see Google's Places API
// pricing page before running large batches of searches.
async function searchPlaces(query) {
  const apiKey = getSetting('google_places_api_key', '');
  if (!apiKey) {
    throw new Error('Google Places APIキーが未設定です。設定画面で入力してください。');
  }

  let response;
  try {
    response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.nationalPhoneNumber',
          'places.websiteUri',
          'places.googleMapsUri',
        ].join(','),
      },
      body: JSON.stringify({ textQuery: query, languageCode: 'ja' }),
    });
  } catch (e) {
    throw new Error(`Google Places APIに接続できませんでした（ネットワークエラー）: ${e.message}`);
  }

  const data = await response.json();
  if (!response.ok) {
    const message = (data && data.error && data.error.message) || 'Google Places APIの呼び出しに失敗しました';
    throw new Error(message);
  }

  return (data.places || []).map((p) => ({
    place_id: p.id || '',
    name: (p.displayName && p.displayName.text) || '',
    address: p.formattedAddress || '',
    phone: p.nationalPhoneNumber || '',
    website: p.websiteUri || '',
    maps_url: p.googleMapsUri || '',
  }));
}

module.exports = { searchPlaces };
