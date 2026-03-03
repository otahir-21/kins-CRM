/**
 * Platform analytics for CRM — TAU, MAU/WAU/DAU, activation rate, posts, groups, likes, comments.
 * No document-related metrics.
 */
const User = require('./models/User');
const Post = require('./models/Post');
const Like = require('./models/Like');
const Comment = require('./models/Comment');
const Group = require('./models/Group');

function startOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function daysAgo(days) {
  const x = new Date();
  x.setDate(x.getDate() - days);
  return startOfDay(x);
}

/** Distinct user IDs from collection in date range (by createdAt) */
async function distinctActiveUserIds(Model, since) {
  const docs = await Model.find({ createdAt: { $gte: since } }).select('userId').lean();
  const ids = new Set(docs.map((d) => d.userId && d.userId.toString()).filter(Boolean));
  return ids;
}

/**
 * Returns platform analytics for CRM dashboard.
 * Active = user who created at least one post, like, or comment in the period.
 */
async function getPlatformAnalytics() {
  const now = new Date();
  const dayStart = daysAgo(0);
  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);

  // Total registered users (exclude soft-deleted)
  const totalRegisteredUsers = await User.countDocuments({ deletedAt: null });

  // DAU / WAU / MAU: distinct users with activity (post, like, or comment) in period
  const [postUsers1d, postUsers7d, postUsers30d] = await Promise.all([
    distinctActiveUserIds(Post, dayStart),
    distinctActiveUserIds(Post, weekStart),
    distinctActiveUserIds(Post, monthStart),
  ]);
  const [likeUsers1d, likeUsers7d, likeUsers30d] = await Promise.all([
    distinctActiveUserIds(Like, dayStart),
    distinctActiveUserIds(Like, weekStart),
    distinctActiveUserIds(Like, monthStart),
  ]);
  const [commentUsers1d, commentUsers7d, commentUsers30d] = await Promise.all([
    distinctActiveUserIds(Comment, dayStart),
    distinctActiveUserIds(Comment, weekStart),
    distinctActiveUserIds(Comment, monthStart),
  ]);

  const merge = (...sets) => new Set(sets.flatMap((s) => [...s]));
  const dailyActiveUsers = merge(postUsers1d, likeUsers1d, commentUsers1d).size;
  const weeklyActiveUsers = merge(postUsers7d, likeUsers7d, commentUsers7d).size;
  const monthlyActiveUsers = merge(postUsers30d, likeUsers30d, commentUsers30d).size;

  // Activation rate: % of registered users who posted in first 7 days
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const firstPostByUser = await Post.aggregate([
    { $group: { _id: '$userId', firstPostAt: { $min: '$createdAt' } } },
  ]);
  const userIdsWithFirstPost = firstPostByUser.map((r) => r._id);
  const users = await User.find({ _id: { $in: userIdsWithFirstPost }, deletedAt: null })
    .select('createdAt')
    .lean();
  const userCreatedMap = new Map(users.map((u) => [u._id.toString(), u.createdAt]));
  let activatedCount = 0;
  for (const row of firstPostByUser) {
    const uid = row._id.toString();
    const firstPostAt = row.firstPostAt.getTime ? row.firstPostAt.getTime() : new Date(row.firstPostAt).getTime();
    const createdAt = userCreatedMap.get(uid);
    if (!createdAt) continue;
    const createdMs = createdAt.getTime ? createdAt.getTime() : new Date(createdAt).getTime();
    if (firstPostAt - createdMs <= sevenDaysMs) activatedCount++;
  }
  const activationRate =
    totalRegisteredUsers > 0 ? Math.round((activatedCount / totalRegisteredUsers) * 10000) / 100 : 0;

  // New posts (feed) — daily, weekly, monthly
  const [newPostsDaily, newPostsWeekly, newPostsMonthly] = await Promise.all([
    Post.countDocuments({ createdAt: { $gte: dayStart } }),
    Post.countDocuments({ createdAt: { $gte: weekStart } }),
    Post.countDocuments({ createdAt: { $gte: monthStart } }),
  ]);
  const newPosts = { daily: newPostsDaily, weekly: newPostsWeekly, monthly: newPostsMonthly };

  // Marketplace posts: no separate collection in schema; report 0 or same as feed if you use type later
  const newPostsMarketplace = { daily: 0, weekly: 0, monthly: 0 };

  // New groups — daily, weekly, monthly
  const [newGroupsDaily, newGroupsWeekly, newGroupsMonthly] = await Promise.all([
    Group.countDocuments({ createdAt: { $gte: dayStart } }),
    Group.countDocuments({ createdAt: { $gte: weekStart } }),
    Group.countDocuments({ createdAt: { $gte: monthStart } }),
  ]);
  const newGroups = { daily: newGroupsDaily, weekly: newGroupsWeekly, monthly: newGroupsMonthly };

  // Totals (all-time)
  const totalAggregatePosts = await Post.countDocuments({});
  const totalAggregateLikes = await Like.countDocuments({});
  const totalAggregateComments = await Comment.countDocuments({ isActive: true });

  // Backward compat for Dashboard (no document collection)
  const usersByGender = await User.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: { $ifNull: ['$gender', 'unknown'] }, count: { $sum: 1 } } },
  ]);
  const genderMap = { male: 0, female: 0, other: 0, unknown: 0 };
  usersByGender.forEach((g) => {
    if (g._id && genderMap[g._id] !== undefined) genderMap[g._id] = g.count;
    else genderMap.unknown = (genderMap.unknown || 0) + g.count;
  });

  return {
    totalRegisteredUsers,
    totalUsers: totalRegisteredUsers,
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    activationRate,
    newPosts,
    newPostsMarketplace,
    newGroups,
    totalAggregatePosts,
    totalAggregateLikes,
    totalAggregateComments,
    usersByGender: genderMap,
    usersWithDocuments: 0,
    usersWithoutDocuments: totalRegisteredUsers,
  };
}

module.exports = { getPlatformAnalytics };
