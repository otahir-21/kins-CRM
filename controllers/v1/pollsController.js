const Post = require('../../models/Post');
const PollVote = require('../../models/PollVote');
const mongoose = require('mongoose');

/**
 * Vote on a poll.
 * POST /api/v1/posts/:postId/vote
 */
async function voteOnPoll(req, res) {
  try {
    const { postId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      return res.status(400).json({ success: false, error: 'Invalid option index.' });
    }

    // Get the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    if (post.type !== 'poll') {
      return res.status(400).json({ success: false, error: 'This post is not a poll.' });
    }

    if (!post.poll || !post.poll.options || post.poll.options.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid poll data.' });
    }

    if (optionIndex >= post.poll.options.length) {
      return res.status(400).json({ success: false, error: 'Invalid option index.' });
    }

    // Check if user already voted
    const userIdString = userId.toString();
    const hasVoted = post.poll.votedUsers.some((id) => id.toString() === userIdString);

    if (hasVoted) {
      return res.status(400).json({ success: false, error: 'You have already voted on this poll.' });
    }

    // Add vote
    post.poll.options[optionIndex].votes += 1;
    post.poll.totalVotes += 1;
    post.poll.votedUsers.push(userId);
    post.markModified('poll'); // Mark poll as modified for Mongoose

    await post.save();

    await PollVote.findOneAndUpdate(
      { userId, postId },
      { userId, postId, optionIndex },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Vote recorded successfully.',
      poll: {
        question: post.poll.question,
        options: post.poll.options.map((opt, idx) => ({
          index: idx,
          text: opt.text,
          votes: opt.votes,
          percentage: post.poll.totalVotes > 0 ? ((opt.votes / post.poll.totalVotes) * 100).toFixed(1) : 0,
        })),
        totalVotes: post.poll.totalVotes,
        userVoted: true,
        userVotedOption: optionIndex,
      },
    });
  } catch (err) {
    console.error('POST /posts/:postId/vote error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to record vote.' });
  }
}

/**
 * Get poll results.
 * GET /api/v1/posts/:postId/poll
 */
async function getPollResults(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const post = await Post.findById(postId)
      .select('type poll')
      .lean();

    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    if (post.type !== 'poll') {
      return res.status(400).json({ success: false, error: 'This post is not a poll.' });
    }

    if (!post.poll) {
      return res.status(400).json({ success: false, error: 'Invalid poll data.' });
    }

    // Check if current user voted and which option
    const userIdString = userId.toString();
    const hasVoted = post.poll.votedUsers.some((id) => id.toString() === userIdString);
    let userVotedOption = null;
    if (hasVoted) {
      const pv = await PollVote.findOne({ userId, postId }).select('optionIndex').lean();
      userVotedOption = pv ? pv.optionIndex : -1;
    }

    return res.status(200).json({
      success: true,
      poll: {
        question: post.poll.question,
        options: post.poll.options.map((opt, idx) => ({
          index: idx,
          text: opt.text,
          votes: opt.votes,
          percentage: post.poll.totalVotes > 0 ? ((opt.votes / post.poll.totalVotes) * 100).toFixed(1) : 0,
        })),
        totalVotes: post.poll.totalVotes,
        userVoted: hasVoted,
        userVotedOption,
      },
    });
  } catch (err) {
    console.error('GET /posts/:postId/poll error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch poll results.' });
  }
}

/**
 * Remove vote from a poll (allow users to change their vote).
 * DELETE /api/v1/posts/:postId/vote
 */
async function removeVote(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID.' });
    }

    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    if (post.type !== 'poll') {
      return res.status(400).json({ success: false, error: 'This post is not a poll.' });
    }

    const userIdString = userId.toString();
    const votedUserIndex = post.poll.votedUsers.findIndex((id) => id.toString() === userIdString);

    if (votedUserIndex === -1) {
      return res.status(400).json({ success: false, error: 'You have not voted on this poll.' });
    }

    const pv = await PollVote.findOne({ userId, postId }).select('optionIndex').lean();
    const optionIndex = pv ? pv.optionIndex : 0;
    if (optionIndex >= 0 && optionIndex < post.poll.options.length) {
      post.poll.options[optionIndex].votes = Math.max(0, (post.poll.options[optionIndex].votes || 0) - 1);
    }
    post.poll.totalVotes = Math.max(0, post.poll.totalVotes - 1);
    post.poll.votedUsers.splice(votedUserIndex, 1);
    post.markModified('poll');

    await post.save();
    await PollVote.deleteOne({ userId, postId });

    return res.status(200).json({
      success: true,
      message: 'Vote removed successfully. You can now vote again.',
    });
  } catch (err) {
    console.error('DELETE /posts/:postId/vote error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to remove vote.' });
  }
}

module.exports = { voteOnPoll, getPollResults, removeVote };
