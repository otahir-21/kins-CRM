const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true, trim: true },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true, trim: true },
  options: {
    type: [optionSchema],
    required: true,
    validate: {
      validator(v) {
        return Array.isArray(v) && v.length >= 1 && v.length <= 4;
      },
      message: 'Each question must have 1 to 4 options.',
    },
  },
}, { _id: false });

const surveySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    isActive: { type: Boolean, default: true },
    showOnHomePage: { type: Boolean, default: false },
    questions: {
      type: [questionSchema],
      required: true,
      default: [],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length >= 1;
        },
        message: 'Survey must have at least one question.',
      },
    },
  },
  { timestamps: true }
);

surveySchema.index({ isActive: 1 });
surveySchema.index({ showOnHomePage: 1 });

module.exports = mongoose.model('Survey', surveySchema);
