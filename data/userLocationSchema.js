/**
 * Created by Ignat on 8/23/2015.
 */

var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;

var userLocation = new Schema({
    userId: {
        type: String,
        ref: 'NoSoloUser'
    },
    userLocation: [{
        type: [Number],
        index: '2dsphere'
    }],
    locationTime: [{
        type: Date
    }]
});

module.exports = connection.model('UserLocation', userLocation);
