/**
 * Created by Ignat on 3/31/2015.
 */

var mongoose = require('../lib/db.js').mongoose;
var connection = require('../lib/db.js').connection;
var Schema = mongoose.Schema;

var tagAvatar = new Schema({
    _title: [ Schema.Types.Mixed ], //newValue, Date of changes
    activities: [ Schema.Types.Mixed ],
    tagDictionary: [Schema.Types.Mixed],
    tagCategory: [Schema.Types.Mixed],
    created: {
        type: Date,
        required: true,
        default: Date.now()
    },
    deleted: Date
});

module.exports = connection.model('tagAvatar', tagAvatar);
