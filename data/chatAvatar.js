/**
 * Created by Ignat on 3/31/2015.
 */

var mongoose = require('../lib/db.js').mongoose;
var connection = require('../lib/db.js').connection;
var Schema = mongoose.Schema;

var chatAvatar = new Schema({
        usersInChat: [ Schema.Types.Mixed ], //newValue, Date of changes
        messages: [ Schema.Types.Mixed ],
        messageBox: [ Schema.Types.Mixed ],
    created: {
        type: Date,
        required: true,
        default: Date.now()
    },
    deleted: Date
    });

module.exports = connection.model('ChatAvatar', chatAvatar);