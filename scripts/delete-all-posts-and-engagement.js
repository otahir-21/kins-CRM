#!/usr/bin/env node
/**
 * One-time cleanup: delete ALL posts and all related engagement from MongoDB.
 * - Likes (on posts)
 * - Comments (on posts) and CommentLikes (on those comments)
 * - Shares
 * - Posts
 *
 * Run from project root: node scripts/delete-all-posts-and-engagement.js
 * Requires MONGODB_URI in .env.
 *
 * Optional: delete only posts from specific users by name/username.
 *   FILTER_USERS="user A,postman" node scripts/delete-all-posts-and-engagement.js
 *   (comma-separated; matches User.name or User.username containing the string)
 *   If FILTER_USERS is not set, ALL posts (and their likes, comments, shares) are deleted.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const CommentLike = require('../models/CommentLike');
const Share = require('../models/Share');
const User = require('../models/User');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  let postFilter = {};
  const filterUsersEnv = process.env.FILTER_USERS;
  if (filterUsersEnv && typeof filterUsersEnv === 'string' && filterUsersEnv.trim()) {
    const names = filterUsersEnv.split(',').map((s) => s.trim()).filter(Boolean);
    if (names.length > 0) {
      const orConditions = names.flatMap((n) => [
        { name: new RegExp(n, 'i') },
        { username: new RegExp(n, 'i') },
      ]);
      const users = await User.find({ $or: orConditions }).select('_id').lean();
      const userIds = users.map((u) => u._id);
      if (userIds.length === 0) {
        console.log('No users matched FILTER_USERS. Exiting without deleting.');
        await mongoose.disconnect();
        process.exit(0);
      }
      postFilter = { userId: { $in: userIds } };
      console.log('Filtering posts by users:', userIds.map((id) => id.toString()));
    }
  }

  const postIds = await Post.find(postFilter).distinct('_id');

  if (postIds.length === 0) {
    console.log('No posts to delete.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const commentIds = await Comment.find({ postId: { $in: postIds } }).distinct('_id');

  const rCommentLike = await CommentLike.deleteMany({ commentId: { $in: commentIds } });
  console.log('Deleted CommentLikes:', rCommentLike.deletedCount);

  const rLike = await Like.deleteMany({ postId: { $in: postIds } });
  console.log('Deleted Likes:', rLike.deletedCount);

  const rComment = await Comment.deleteMany({ postId: { $in: postIds } });
  console.log('Deleted Comments:', rComment.deletedCount);

  const rShare = await Share.deleteMany({ postId: { $in: postIds } });
  console.log('Deleted Shares:', rShare.deletedCount);

  const rPost = await Post.deleteMany(postFilter);
  console.log('Deleted Posts:', rPost.deletedCount);

  console.log('Done.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
