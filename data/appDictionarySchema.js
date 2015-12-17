/**
 * Created by Ignat on 9/28/2015.
 */

var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    Schema = mongoose.Schema/*,
    ObjectId = mongoose.Types.ObjectId*/
    ;

var appDictionary = {
    control:{
        type: String,
        required: true
    },
    command:{
        type: String,
        required: true
    },
    cmdDictionary: Schema.Types.Mixed
};

module.exports = connection.model('AppDictionary', appDictionary);
