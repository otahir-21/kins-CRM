const mongoose = require('mongoose');

/**
 * Tracks which poll option each user voted for.
 * Used for feed (userVote) and for correct decrement on removeVote.
 */
const pollVoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    optionIndex: { type: Number, required: true, min: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

pollVoteSchema.index({ userId: 1, postId: 1 }, { unique: true });
pollVoteSchema.index({ postId: 1 });

module.exports = mongoose.model('PollVote', pollVoteSchema);
