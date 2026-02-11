/**
 * Re-fan-out existing posts to UserFeed.
 * 
 * Use this script to fix posts that were created before the feed system
 * was deployed, or when fan-out failed.
 * 
 * Usage:
 *   node scripts/refan-out-posts.js
 *   node scripts/refan-out-posts.js --type=image
 *   node scripts/refan-out-posts.js --postId=507f1f77bcf86cd799439011
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const UserFeed = require('../models/UserFeed');
const FeedService = require('../services/FeedService');
const { connectMongo } = require('../config/db');

async function refanOutPosts() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await connectMongo();
    console.log('✅ Connected\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const typeArg = args.find((arg) => arg.startsWith('--type='));
    const postIdArg = args.find((arg) => arg.startsWith('--postId='));

    let filter = { isActive: true };

    if (postIdArg) {
      const postId = postIdArg.split('=')[1];
      filter._id = postId;
      console.log(`🎯 Re-fanning out specific post: ${postId}\n`);
    } else if (typeArg) {
      const type = typeArg.split('=')[1];
      filter.type = type;
      console.log(`🎯 Re-fanning out all ${type} posts\n`);
    } else {
      console.log('🎯 Re-fanning out ALL active posts\n');
    }

    // Get posts to re-fan-out
    const posts = await Post.find(filter).select('_id type userId interests createdAt').lean();

    console.log(`📊 Found ${posts.length} posts to process\n`);

    if (posts.length === 0) {
      console.log('✅ No posts to process. Exiting.');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const post of posts) {
      try {
        console.log(`Processing ${post.type} post ${post._id}...`);
        
        // Optional: Clear existing UserFeed entries for this post
        const deletedCount = await UserFeed.deleteMany({ postId: post._id });
        if (deletedCount.deletedCount > 0) {
          console.log(`  Cleared ${deletedCount.deletedCount} old feed entries`);
        }

        // Re-fan-out
        const result = await FeedService.fanOutPost(post);
        console.log(`  ✅ Fanned out to ${result.targetedUsers} users`);
        successCount++;
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total: ${posts.length}`);
    console.log('='.repeat(50));

    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

refanOutPosts();
