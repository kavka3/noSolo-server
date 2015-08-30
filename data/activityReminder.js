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
    ]
});

module.exports = connection.model('ReminderTask', reminder);
