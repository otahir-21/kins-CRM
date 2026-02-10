const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // auth (unique per provider)
    provider: { type: String, required: true, enum: ['phone', 'google', 'apple'] },
    providerUserId: { type: String, required: true },

    // profile ("About You")
    name: { type: String, default: null },
    email: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    username: { type: String, default: null },
    profilePictureUrl: { type: String, default: null },
    bio: { type: String, default: null },
    status: { type: String, default: null }, // motherhood status
    gender: { type: String, default: null },
    dateOfBirth: { type: String, default: null }, // yyyy-MM-dd
    documentUrl: { type: String, default: null },

    // interests
    interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interest', default: [] }],
    interestsUpdatedAt: { type: Date, default: null },

    // counts (future-safe)
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },

    // location (for future nearby feature)
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      isVisible: { type: Boolean, default: false },
      updatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

userSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
