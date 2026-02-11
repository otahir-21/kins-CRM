/**
 * Feed Worker: Background processing for feed generation.
 * 
 * CURRENT IMPLEMENTATION:
 * - Uses setImmediate() for async processing (non-blocking)
 * - Simple, lightweight, works for moderate scale
 * 
 * PRODUCTION RECOMMENDATION:
 * - Use Bull or BullMQ with Redis for robust job queues
 * - Supports retries, priorities, rate limiting, and distributed processing
 * - Example migration:
 *   1. Install: npm install bull
 *   2. Create queue: const Queue = require('bull'); const feedQueue = new Queue('feed');
 *   3. Add job: feedQueue.add({ postId: post._id });
 *   4. Process: feedQueue.process(async (job) => { await FeedService.fanOutPost(job.data.postId); });
 * 
 * For now, setImmediate() is used in postsController.js directly.
 * This file serves as documentation for future scaling.
 */

const FeedService = require('../services/FeedService');

/**
 * Process feed fan-out for a post (async, non-blocking).
 * @param {Object} post - Post document
 */
async function processFeedFanOut(post) {
  try {
    console.log(`[FeedWorker] Processing fan-out for post ${post._id}`);
    await FeedService.fanOutPost(post);
    console.log(`[FeedWorker] Fan-out completed for post ${post._id}`);
  } catch (err) {
    console.error(`[FeedWorker] Fan-out failed for post ${post._id}:`, err);
    // In production: log to monitoring service (Sentry, Datadog, etc.)
  }
}

module.exports = { processFeedFanOut };
