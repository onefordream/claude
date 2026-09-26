export class ApiError extends Error {
  constructor(message, { status, code, data } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('通信できませんでした。電波の良いところでもう一度お試しください', { status: 0 });
  }
  const data = (res.headers.get('content-type') || '').includes('json') ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth')) window.dispatchEvent(new Event('gn:unauthorized'));
    throw new ApiError(data?.error?.message || 'エラーが発生しました', { status: res.status, code: data?.error?.code, data: data?.error });
  }
  return data;
}

/** ファイルを1つアップロード（進捗つき）。サイズ超過はサーバーでも即時に拒否される */
export function uploadFile(file, { onProgress, contentType } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media');
    xhr.setRequestHeader('content-type', contentType || file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* noop */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data?.error?.message || 'アップロードに失敗しました', { status: xhr.status, code: data?.error?.code }));
    };
    xhr.onerror = () => reject(new ApiError('アップロードに失敗しました。ファイルサイズや通信状況をご確認ください', { status: 0 }));
    xhr.send(file);
  });
}
