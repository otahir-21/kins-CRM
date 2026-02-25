/**
 * DB config: query timing (optional) and re-exports from lib/mongodb.
 * All connection logic lives in lib/mongodb.js (global cache for Vercel).
 */

const { connectDB, mongoose } = require('../lib/mongodb');

// Optional: log Mongo query duration (set MONGODB_QUERY_TIMING=1 to enable)
const QUERY_TIMING = process.env.MONGODB_QUERY_TIMING === '1';

if (QUERY_TIMING) {
  const originalQueryExec = mongoose.Query.prototype.exec;
  mongoose.Query.prototype.exec = function (cb) {
    const label = `mongo:${this.model?.modelName || 'Model'}:${this.op ?? 'query'}`;
    console.time(label);
    const result = originalQueryExec.apply(this, arguments);
    if (result && typeof result.then === 'function') {
      result.then(() => console.timeEnd(label), () => console.timeEnd(label));
    } else {
      console.timeEnd(label);
    }
    return result;
  };
  const originalAggregateExec = mongoose.Aggregate.prototype.exec;
  mongoose.Aggregate.prototype.exec = function (cb) {
    const label = 'mongo:Aggregate:exec';
    console.time(label);
    const result = originalAggregateExec.apply(this, arguments);
    if (result && typeof result.then === 'function') {
      result.then(() => console.timeEnd(label), () => console.timeEnd(label));
    } else {
      console.timeEnd(label);
    }
    return result;
  };
}

// Backward compatibility: connectMongo === connectDB
module.exports = { connectMongo: connectDB, connectDB, mongoose };
