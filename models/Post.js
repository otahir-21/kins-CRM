const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['text', 'image', 'video', 'poll'] },
    
    // Text content (for all types)
    content: { type: String, default: null },
    
    // Media (for image/video)
    media: [
      {
        type: { type: String, enum: ['image', 'video'], required: true },
        url: { type: String, required: true },
        thumbnail: { type: String, default: null }, // for video
      },
    ],
    
    // Poll (for poll type)
    poll: {
      question: { type: String, default: null },
      options: [
        {
          text: { type: String, required: true },
          votes: { type: Number, default: 0 },
        },
      ],
      totalVotes: { type: Number, default: 0 },
      votedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    
    // Interests (for targeting feed)
    interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interest', required: true }],
    
    // Engagement (cached counts for performance)
    likesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    sharesCount: { type: Number, default: 0, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0 },
    
    // Soft delete
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for feed queries and targeting
postSchema.index({ interests: 1, createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
