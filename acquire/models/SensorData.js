const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
    features: [Number],
    featureCount: Number,
    scalerVersion: String,

    createdAt: { type: Date, default: Date.now },
    targetDate: Date,
    source: String,

    dailyValues: [Number],
    daysUsed: [String],
    
    kunnaMeta: {
        alias: String,
        name: String
    },
    fetchMeta: {
        timeStart: Date,
        timeEnd: Date
    },
    
});

module.exports = mongoose.model('SensorData', SensorDataSchema);
