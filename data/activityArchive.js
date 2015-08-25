/**
 * Created by Ignat on 3/31/2015.
 */
var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;

var activityArchive = new Schema({
    title: [ Schema.Types.Mixed ], //newValue, Date of changes
    description: [ Schema.Types.Mixed ],
    imageUrl: [ Schema.Types.Mixed ],
    location  : [ Schema.Types.Mixed ],
    creator : [ Schema.Types.Mixed ],
    tags : [ Schema.Types.Mixed ],
    joinedUsers : [ Schema.Types.Mixed ],
    timeStart: [ Schema.Types.Mixed ],
    timeFinish: [ Schema.Types.Mixed ],
    isApprovalNeeded: [ Schema.Types.Mixed ],
    isTimeFlexible: [ Schema.Types.Mixed ],
    isGroup:[ Schema.Types.Mixed ],
    isLocationSecret: [ Schema.Types.Mixed ],
    isTimeSecret:[ Schema.Types.Mixed ],
    maxMembers: [ Schema.Types.Mixed ],
    distance: [ Schema.Types.Mixed ],
    isPrivate: [ Schema.Types.Mixed ],
    created: {
        type: Date,
        required: true,
        default: Date.now()
    },
    deleted: Date,
    parentId: {
        type: String,
        ref: 'NoSoloActivity',
        required: true
    }
});

module.exports = connection.model('activityArchive', activityArchive);