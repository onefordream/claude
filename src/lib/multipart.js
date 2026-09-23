// Minimal, dependency-free multipart/form-data parser.
// Parses a full request body Buffer given the boundary from the Content-Type header.
// Returns { fields: {name: string}, files: [{fieldName, filename, mimeType, data: Buffer}] }

function parseHeaders(headerText) {
  const headers = {};
  for (const line of headerText.split('\r\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  return headers;
}

function parseContentDisposition(value) {
  const result = {};
  if (!value) return result;
  const parts = value.split(';').map((p) => p.trim());
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    let val = part.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

export function getBoundary(contentType) {
  if (!contentType) return null;
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!match) return null;
  return (match[1] || match[2]).trim();
}

export function parseMultipart(bodyBuffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const fields = {};
  const files = [];

  const positions = [];
  let searchFrom = 0;
  while (true) {
    const idx = bodyBuffer.indexOf(delimiter, searchFrom);
    if (idx === -1) break;
    positions.push(idx);
    searchFrom = idx + delimiter.length;
  }

  for (let i = 0; i < positions.length - 1; i++) {
    let start = positions[i] + delimiter.length;
    const end = positions[i + 1];
    if (bodyBuffer.slice(start, start + 2).toString() === '--') continue; // closing boundary
    // Skip the CRLF right after the boundary marker
    if (bodyBuffer.slice(start, start + 2).toString() === '\r\n') start += 2;

    let partEnd = end;
    // Strip trailing CRLF before the next boundary marker
    if (bodyBuffer.slice(partEnd - 2, partEnd).toString() === '\r\n') partEnd -= 2;

    const part = bodyBuffer.slice(start, partEnd);
    const headerSep = part.indexOf('\r\n\r\n');
    if (headerSep === -1) continue;

    const headerText = part.slice(0, headerSep).toString('utf8');
    const content = part.slice(headerSep + 4);
    const headers = parseHeaders(headerText);
    const disposition = parseContentDisposition(headers['content-disposition']);

    if (!disposition.name) continue;

    if (disposition.filename !== undefined) {
      if (disposition.filename === '') continue; // empty file input
      files.push({
        fieldName: disposition.name,
        filename: disposition.filename,
        mimeType: headers['content-type'] || 'application/octet-stream',
        data: content,
      });
    } else {
      fields[disposition.name] = content.toString('utf8');
    }
  }

  return { fields, files };
}
