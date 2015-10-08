/**
 * Created by Ignat on 10/6/2015.
 */

var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    log = require('../lib/log.js')(module),
    async = require('async'),
    common = require('../lib/commonFunctions.js'),
//autoIncrement = require('mongoose-autoinc'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId,
    Avatar = require('./userArchive.js');

//autoIncrement.initialize(connection, mongoose);

var userSchema = new Schema({
    _id: {
        type: String,
        unique: true
    },
    socialToken: {
        type: String,
        default: 'some token'
    },
    surname: {
        type: String
    },
    familyName: {
        type: String
    },
    birthDate: {
        type: Date
    },
    gender: {
        type: String
    },
    email: {
        type: String
    },
    imageUrl:{
        type: String,
        default: "https://s3.amazonaws.com/nosoloimages/udefault.jpg"
    },
    firstGeoLogin: {
        type: [Number],
        index: '2dsphere'
    },
    currentLocation: {
        type: [Number],
        index: '2dsphere'
    },
    preferredAgeMin:{
        type: Number,
        default: 20
    },
    preferredAgeMax: {
        type: Number,
        default: 40
    },
    activitiesCreated: [{
        type: Schema.Types.ObjectId,
        ref: 'NoSoloActivity'
    }],
    activityCreatedNumber:{
        type:Number,
        default: 0
    },
    activitiesLiked: [{
        type: Schema.Types.Mixed,
        default: {activityId: null, isApproved: false}//activity id and for joined true or false
    }],
    activitiesDisliked: [{
        type: Schema.Types.ObjectId,
        ref: 'NoSoloActivity'
    }],
    activitiesJoined: [{
        type: Schema.Types.ObjectId,
        ref: 'NoSoloActivity'
    }],
    tagsPreferences: [{
        type: String,
        ref: 'NoSoloTag'
    }],
    userContacts: [{
        type: String,
        ref: 'NoSoloUser'
    }],
    radius:{
        type: Number,
        default: 2
    },
    rating: Number,
    ranking: Number,
    userLanguage: {
        type: String,
        required: true,
        default: 'eng'
    },
    systemLanguage: {
        type: String,
        required: true,
        default: 'eng'
    },
    about: {
        type: String
    },
    settings: {
        type: Schema.Types.Mixed,
        default: {
            'isNtfApproved': true,
            'joinApprovals': true,
            'joinRequests': true,
            'newActivities' : true,
            'newMessages': true,
            'isSendReminder': true,
            'reminderTime': 1,
            'multipleReminders': []
        }
    },
    uniqueDeviceId: [{
        type: Schema.Types.Mixed//type: 'ios' || 'android' && deviceId: String
    }],
    notifications: [{
        type: Schema.Types.ObjectId,
        ref: 'NoSoloNotification'
    }],
    lastVisit: Date,
    created: {
        type: Date,
        required: true,
        default: Date.now()
    },
    lastActivityUrl:{
        type: String,
        default: 'https://s3.amazonaws.com/nosoloimages/adefault.png'
    },
    currentLocation:{
        type: [Number],
        index: '2dsphere'
    },
    activityJoinedNumber:{
        type:Number,
        default: 0
    }
});

//userSchema.plugin(autoIncrement.plugin, 'NoSoloUser');
module.exports = connection.model('NoSoloTest', userSchema);
