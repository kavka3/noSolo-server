/**
 * Created by Ignat on 3/31/2015.
 */

var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;

var userAvatarSchema = new Schema({
    socialToken: [ Schema.Types.Mixed ], //newValue, Date of changes
    noSoloId: [ Schema.Types.Mixed ],
    surname: [ Schema.Types.Mixed ],
    familyName:[ Schema.Types.Mixed ],
    birthDate:[ Schema.Types.Mixed ],
    gender: [ Schema.Types.Mixed ],
    email: [ Schema.Types.Mixed ],
    imageUrl: [ Schema.Types.Mixed ],
    firstGeoLogin: [ Schema.Types.Mixed ],
    currentLocation: [ Schema.Types.Mixed ],
    preferredAgeMin:[ Schema.Types.Mixed ],
    preferredAgeMax: [ Schema.Types.Mixed ],
    activitiesCreated: [ Schema.Types.Mixed ],
    activitiesLiked:[ Schema.Types.Mixed ],
    activitiesDisliked: [ Schema.Types.Mixed ],
    activitiesJoined: [ Schema.Types.Mixed ],
    tagsPreferences: [ Schema.Types.Mixed ],
    userContacts: [ Schema.Types.Mixed ],
    radius:[ Schema.Types.Mixed ],
    rating: [ Schema.Types.Mixed ],
    ranking: [ Schema.Types.Mixed ],
    userLanguage:[ Schema.Types.Mixed ],
    systemLanguage: [ Schema.Types.Mixed ],
    about: [ Schema.Types.Mixed ],
    settings: [ Schema.Types.Mixed ],
    uniqueDeviceId: [ Schema.Types.Mixed ],
    notifications: [ Schema.Types.Mixed ],
    created: {
        type: Date,
        required: true,
        default: Date.now()
    },
    deleted: Date,
    parentId: {
        type: String,
        ref: 'NoSoloUser',
        required: true
    }
});

module.exports = connection.model( 'userArchive', userAvatarSchema );
