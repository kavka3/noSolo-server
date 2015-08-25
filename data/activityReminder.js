/**
 * Created by Ignat on 8/25/2015.
 */

var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId
    ;

var reminder = new Schema({
    reminderTime:{
        type: Date
    },
    tasks:[
        {
            type: Schema.Types.Mixed // {userId: _id, activityId: _id, activityName: title}
        }
    ],
    userId:{
        type: String ,
        ref: 'NoSoloUser',
        required: true
    },
    activity:{
        type: Schema.Types.ObjectId,
        ref: 'NoSoloActivity',
        required: true
    },
    invitedUser:{
        type: String
    },
    isSingle:{
        type: Boolean,
        default: false
    },
    isDone:{
        type: Boolean,
        default: false
    },
    created:{
        type: Date,
        required: true,
        default: Date.now()
    },
    isAccepted:{
        type: Number,
        default: 0
    },
    comeByLink:{
        type: Number,
        default: 0
    }

});

module.exports = connection.model('NoSoloInvite', invite);
