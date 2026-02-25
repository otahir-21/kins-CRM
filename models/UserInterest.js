const mongoose = require('mongoose');

const userInterestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    interestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interest', required: true, index: true },
  },
  { timestamps: true }
);

userInterestSchema.index({ userId: 1, interestId: 1 }, { unique: true });
userInterestSchema.index({ userId: 1, createdAt: -1 });
userInterestSchema.index({ interestId: 1 });

module.exports = mongoose.model('UserInterest', userInterestSchema);
