/**
 * Upload file buffer to Bunny CDN Storage.
 * Requires env: BUNNY_STORAGE_ZONE, BUNNY_ACCESS_KEY, BUNNY_CDN_URL (public pull zone base, e.g. https://yourzone.b-cdn.net)
 * Optional: BUNNY_STORAGE_REGION (e.g. '' for default, 'uk', 'ny', 'la', 'sg', etc.)
 * @param {Buffer} buffer - File content
 * @param {string} filename - Filename to use (e.g. onboarding-123.jpg)
 * @param {string} pathPrefix - Path folder (e.g. 'onboarding')
 * @param {string} contentType - MIME type (e.g. 'image/jpeg')
 * @returns {Promise<{ url: string }>} Public CDN URL
 */
async function uploadToBunnyCDN(buffer, filename, pathPrefix = 'onboarding', contentType = 'application/octet-stream') {
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const accessKey = process.env.BUNNY_ACCESS_KEY;
  const cdnUrl = process.env.BUNNY_CDN_URL;
  const region = process.env.BUNNY_STORAGE_REGION || '';

  if (!storageZone || !accessKey || !cdnUrl) {
    const missing = [];
    if (!storageZone) missing.push('BUNNY_STORAGE_ZONE');
    if (!accessKey) missing.push('BUNNY_ACCESS_KEY');
    if (!cdnUrl) missing.push('BUNNY_CDN_URL');
    throw new Error(
      `Bunny CDN config missing (${missing.join(', ')}). ` +
      'Add them to .env in the project root (same folder as server.js) and restart the server.'
    );
  }

  const host = region
    ? `https://${region}.storage.bunnycdn.com`
    : 'https://storage.bunnycdn.com';
  const path = pathPrefix ? `${pathPrefix}/${filename}` : filename;
  const uploadUrl = `${host}/${storageZone}/${path}`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      AccessKey: accessKey,
      'Content-Type': contentType,
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bunny CDN upload failed (${response.status}): ${text}`);
  }

  const baseUrl = cdnUrl.replace(/\/$/, '');
  const publicUrl = `${baseUrl}/${path}`;
  return { url: publicUrl };
}

module.exports = { uploadToBunnyCDN };
