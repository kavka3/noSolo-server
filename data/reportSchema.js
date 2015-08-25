/**
 * Created by Ignat on 6/14/2015.
 */

var mongoose = require('../lib/db.js').mongoose;
var connection = require('../lib/db.js').connection;
var Schema = mongoose.Schema;

var reportSchema = new Schema({
    userId:{
        type: String,
        ref: 'NoSoloUser'
    },
    activityId:{
        type: Schema.Types.ObjectId,
        ref: 'NoSoloActivity'
    },
    reportType:{
        type: Number
    },
    message:{
        type: String
    },
    isSent:{
        type: Boolean,
        default: false
    },
    isFinished:{
        type: Boolean,
        default: false
    }

});

module.exports = connection.model('NoSoloReport', reportSchema);

/*
1,'Inappropriate'
2,'Wrong Location'
3,'Place is closed or private'
4,'Copyright Infringement'
5,'other'
6, 'subscribe'
*/
