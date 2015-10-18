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
        unique: true,
        required: true
    },
    socialToken: {
        type: String,
        required: true,
        default: 'some token'
    },
   /* noSoloId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true,
        default: new ObjectId
    },*/
    surname: {
        type: String,
        required: true
    },
    familyName: {
        type: String,
        required: true
    },
    birthDate: {
        type: Date/*,
        required: true*/
    },
    gender: {
        type: String,
        required: true
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
module.exports = UserMaster = connection.model('NoSoloUser', userSchema);

function saveAvatarChanges(self){
    UserMaster.findById(self._id, function(err, resUser, affected){
        if(err){
            log. error(err);
        }
        else{
            Avatar.findOne({ parentId: self._id }, function(err, oldAvatar, affected){
                if(err){
                    log.error(err);
                }
                else if(common.isEmpty(oldAvatar)){
                    var newAvatar = new Avatar();
                    for(var key in newAvatar._doc) {
                        if(key != '_id' && key != '__v'){
                            newAvatar._doc[key][newAvatar._doc[key].length] = ({ createdValue: self[key],
                                created: new Date().toUTCString() });
                        }
                    }
                    newAvatar.parentId = self._id;
                    newAvatar.save(function(err){
                        if(err)log.error(err);
                        else log.info('avatar created: ' + self._id);
                    });
                }
                else{
                    common.saveArchiveInstance(oldAvatar, self);
                }
            });
        }
    });
};

userSchema.pre('save', function(next){
    var self = this;
    saveAvatarChanges(self);
    next();
});



