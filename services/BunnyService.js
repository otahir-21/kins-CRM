const axios = require('axios');
const crypto = require('crypto');

/**
 * Bunny CDN upload service for images and videos.
 * Reusable utility for post media, onboarding, etc.
 */
class BunnyService {
  constructor() {
    this.storageZone = process.env.BUNNY_STORAGE_ZONE;
    this.accessKey = process.env.BUNNY_ACCESS_KEY;
    this.cdnUrl = process.env.BUNNY_CDN_URL;
    this.region = process.env.BUNNY_STORAGE_REGION || 'uk';
    
    const regionHosts = {
      uk: 'uk.storage.bunnycdn.com',
      ny: 'ny.storage.bunnycdn.com',
      la: 'la.storage.bunnycdn.com',
      sg: 'sg.storage.bunnycdn.com',
      de: 'de.storage.bunnycdn.com',
    };
    this.storageHost = regionHosts[this.region] || regionHosts.uk;
  }

  isConfigured() {
    return !!(this.storageZone && this.accessKey && this.cdnUrl);
  }

  /**
   * Upload a file buffer to Bunny CDN.
   * @param {Buffer} fileBuffer - File data
   * @param {string} fileName - File name (e.g. "image.jpg")
   * @param {string} folder - Folder path (e.g. "posts/images")
   * @returns {Promise<{ url: string, cdnUrl: string }>}
   */
  async upload(fileBuffer, fileName, folder = 'posts') {
    if (!this.isConfigured()) {
      throw new Error('Bunny CDN not configured. Set BUNNY_STORAGE_ZONE, BUNNY_ACCESS_KEY, BUNNY_CDN_URL.');
    }

    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const ext = fileName.split('.').pop();
    const uniqueFileName = `${timestamp}_${randomId}.${ext}`;
    const path = `${folder}/${uniqueFileName}`;
    const storageUrl = `https://${this.storageHost}/${this.storageZone}/${path}`;
    const cdnUrl = `${this.cdnUrl}/${path}`;

    try {
      await axios.put(storageUrl, fileBuffer, {
        headers: {
          AccessKey: this.accessKey,
          'Content-Type': 'application/octet-stream',
        },
        maxBodyLength: Infinity,
        timeout: 30000,
      });

      return { url: storageUrl, cdnUrl };
    } catch (err) {
      console.error('Bunny upload failed:', err.message);
      throw new Error(`Bunny upload failed: ${err.response?.data || err.message}`);
    }
  }

  /**
   * Upload multiple files.
   * @param {Array<{buffer: Buffer, fileName: string}>} files
   * @param {string} folder
   * @returns {Promise<Array<{url: string, cdnUrl: string}>>}
   */
  async uploadMultiple(files, folder = 'posts') {
    return Promise.all(files.map((f) => this.upload(f.buffer, f.fileName, folder)));
  }
}

module.exports = new BunnyService();
