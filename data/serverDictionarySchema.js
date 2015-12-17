/**
 * Created by Ignat on 11/11/2015.
 */


var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    Schema = mongoose.Schema
    ;

var serverDictionary = {
    _id:{
        type: Number,
        required: true,
        unique: true
    },
    control:{
        type: String,
        required: true
    },
    cmdDictionary: Schema.Types.Mixed
};

module.exports = connection.model('ServerDictionary', serverDictionary);
