/**
 * Resize/crop ad images to 1200×600 px (2:1) for consistent display in the app.
 * Spec: width 1200, height 600, JPEG or PNG. Output is JPEG for smaller size.
 */
const sharp = require('sharp');

const AD_IMAGE_WIDTH = 1200;
const AD_IMAGE_HEIGHT = 600;

/**
 * Resize and crop the image to 1200×600 (2:1). Uses center crop (cover fit).
 * @param {Buffer} inputBuffer - Raw image buffer (JPEG, PNG, etc.)
 * @returns {Promise<{ buffer: Buffer, contentType: string }>} - JPEG buffer and content type
 */
async function resizeAdImageToSpec(inputBuffer) {
  if (!inputBuffer || !Buffer.isBuffer(inputBuffer)) {
    throw new Error('Invalid image buffer');
  }
  const buffer = await sharp(inputBuffer)
    .resize(AD_IMAGE_WIDTH, AD_IMAGE_HEIGHT, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 90 })
    .toBuffer();
  return { buffer, contentType: 'image/jpeg' };
}

module.exports = { resizeAdImageToSpec, AD_IMAGE_WIDTH, AD_IMAGE_HEIGHT };
