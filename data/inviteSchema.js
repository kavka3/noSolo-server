/**
 * Created by Ignat on 6/4/2015.
 */

var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    common = require('../lib/commonFunctions.js'),
    Schema = mongoose.Schema,
    async = require('async'),
    ObjectId = mongoose.Types.ObjectId
    ;

var invite = new Schema({
    creator:{
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
