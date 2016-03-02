/**
 * Created by Ignat on 1/26/2016.
 */


var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;

var archive = {
    parentId: {
        type: String,
        ref: 'NoSoloActivity',
        required: true
    },
    instances: [ Schema.Types.Mixed ]
};

module.exports = connection.model('republishArchive', archive);