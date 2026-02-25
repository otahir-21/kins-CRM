#!/usr/bin/env node
/**
 * One-time cleanup: delete ALL groups and ALL users (and all data that references them).
 *
 * Order: Groups → engagement (comment-likes, likes, comments, shares, poll votes, user feed,
 *        follows, user interests, survey responses) → posts → users.
 *
 * Run from project root: node scripts/delete-all-users-and-groups.js
 * Requires MONGODB_URI in .env.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('../models/Group');
const CommentLike = require('../models/CommentLike');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Share = require('../models/Share');
const PollVote = require('../models/PollVote');
const UserFeed = require('../models/UserFeed');
const Follow = require('../models/Follow');
const UserInterest = require('../models/UserInterest');
const SurveyResponse = require('../models/SurveyResponse');
const Post = require('../models/Post');
const User = require('../models/User');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const rGroups = await Group.deleteMany({});
  console.log('Deleted Groups:', rGroups.deletedCount);

  const rCommentLike = await CommentLike.deleteMany({});
  console.log('Deleted CommentLikes:', rCommentLike.deletedCount);

  const rLike = await Like.deleteMany({});
  console.log('Deleted Likes:', rLike.deletedCount);

  const rComment = await Comment.deleteMany({});
  console.log('Deleted Comments:', rComment.deletedCount);

  const rShare = await Share.deleteMany({});
  console.log('Deleted Shares:', rShare.deletedCount);

  const rPollVote = await PollVote.deleteMany({});
  console.log('Deleted PollVotes:', rPollVote.deletedCount);

  const rUserFeed = await UserFeed.deleteMany({});
  console.log('Deleted UserFeeds:', rUserFeed.deletedCount);

  const rFollow = await Follow.deleteMany({});
  console.log('Deleted Follows:', rFollow.deletedCount);

  const rUserInterest = await UserInterest.deleteMany({});
  console.log('Deleted UserInterests:', rUserInterest.deletedCount);

  const rSurveyResponse = await SurveyResponse.deleteMany({});
  console.log('Deleted SurveyResponses:', rSurveyResponse.deletedCount);

  const rPost = await Post.deleteMany({});
  console.log('Deleted Posts:', rPost.deletedCount);

  const rUser = await User.deleteMany({});
  console.log('Deleted Users:', rUser.deletedCount);

  console.log('Done.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
