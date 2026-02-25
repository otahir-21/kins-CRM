const mongoose = require('mongoose');

const singleResponseSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  optionId: { type: String, required: true },
}, { _id: false });

const surveyResponseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
    responses: {
      type: [singleResponseSchema],
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

surveyResponseSchema.index({ userId: 1, surveyId: 1 }, { unique: true });
surveyResponseSchema.index({ userId: 1, createdAt: -1 });
surveyResponseSchema.index({ surveyId: 1, createdAt: -1 });

module.exports = mongoose.model('SurveyResponse', surveyResponseSchema);
