const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    
    // Share types for analytics
    shareType: { 
      type: String, 
      enum: ['repost', 'external', 'direct_message'], 
      default: 'external' 
    },
    
    // Optional: caption when reposting
    caption: { type: String, default: null, maxlength: 500 },
    
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Indexes for queries
shareSchema.index({ postId: 1, createdAt: -1 }); // Get shares for a post
shareSchema.index({ userId: 1, createdAt: -1 }); // Get user's shares
shareSchema.index({ userId: 1, postId: 1, shareType: 1 }); // Prevent duplicate shares

module.exports = mongoose.model('Share', shareSchema);
