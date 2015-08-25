/**
 * Created by ignat on 3/11/2015.
 */

var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId,

    notificationSchema =  new Schema({
        creator: {
            type: String,
            ref: 'NoSoloUser',
            required: true
        },
        creationTime: {
            type: Date,
            default: Date.now,
            required: true
        },
        addressee: [{
            type: String,
            ref: 'NoSoloUser'
        }],
        notificationType:{
           /*
            LIKE_ACTIVITY = 1,
            JOIN_ACTIVITY = 2,
            REJECT_ACTIVITY = 3,
            ACTIVITY_UPDATED = 4,
            MESSAGE_FROM_SYSTEM = 5,
            REMOVED_FROM_ACTIVITY = 6,
            USER_JOINS_ACTIVITY = 7,
            USER_LEAVE_ACTIVITY = 8,
            ACTIVITY_RECUR = 9,
            REJECT_RECUR = 10
            */
            type: Number,
            required: true
        },
        specialData:{
            type: Schema.Types.Mixed
        }
    });

module.exports = connection.model('NoSoloNotification', notificationSchema);

