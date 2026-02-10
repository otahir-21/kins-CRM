const mongoose = require('mongoose');

const userInterestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    interestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interest', required: true },
  },
  { timestamps: true }
);

userInterestSchema.index({ userId: 1, interestId: 1 }, { unique: true });

module.exports = mongoose.model('UserInterest', userInterestSchema);
