var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    common = require('../lib/commonFunctions.js'),
    Chat = require('./chatSchema.js'),
    Tags = require('./tagSchema'),
    Schema = mongoose.Schema,
    async = require('async'),
    ObjectId = mongoose.Types.ObjectId,
    User = require('./userSchema.js'),
    Avatar = require('./activityArchive.js');

function arrayLimit(val) {
    return val.length <= 10;
}

var activitiesSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    imageUrl:{
        type: String,
        default: 'https://s3.amazonaws.com/nosoloimages/adefault.png'
    },
    location  : {
        type: [Number],
        index: '2dsphere',
        required: true
    },
    creator : {
        type: String ,
        ref: 'NoSoloUser',
        required: true
    },
    tags : [{
        type: String,
        ref: 'NoSoloTag'
    }],
    tagsByLanguage: [
        {type: Schema.Types.Mixed}
    ],
    joinedUsers : [{
        type: String,
        ref: 'NoSoloUser'
    }],
    followingUsers: [{
        type: String,
        ref: 'NoSoloUser'
    }],
    recurUsers: [{
        type: Schema.Types.Mixed //userId, recurStatus: NOT_APPROVED: 0, JOINED: 1, DISCLAIMED: 2
    }],
    timeStart: {
        type: Date,
        required: true
    },
    timeFinish: {
        type: Date,
        required: true
    },
    activityDay:{
        type: Number //TODAY = 0, TOMORROW = 1, DAY_AFTER = 2
    },
    activityPartOfDay:{//MORNING = 0, AFTERNOON = 1, EVENING = 2
       type: Number
    },
    isApprovalNeeded: {
        type: Boolean,
        required: true,
        default: false
    },
    isTimeFlexible: {
        type: Boolean,
        required: true,
        default: true
    },
    isGroup:{
        type: Boolean,
        required: true,
        default: true
    },
    isLocationSecret: {
        type: Boolean,
        required: true,
        default: true
    },
    isTimeSecret:{
        type: Boolean,
        required: true,
        default: true
    },
    maxMembers:{
        type: Number,
        required: true,
        default: 21
    }, //Number, //21 for unlimited
    distance: {
        type: Number,
        default: 0
    },
    isPrivate: {
        type: Boolean,
        required: true,
        default: false
    },
    created: {
        type: Date,
        required: true,
        default: Date.now()
    },
    isRecur:{
        type: Boolean,
        required: true,
        default: false
    },
    parentActivity: {
        type: Schema.Types.ObjectId,
        ref: 'NoSoloActivity'
    },
    tagFace: [{ //BASETAG:0, COMPLEXTAG: 1, PARRENTTAG: 2, USERTAG: 3
        type: Number,
        required: true,
        default: 0
    }],
    fbId: {
        type: String
    },
    formattedAddress: {
        type: String,
        default: null
    }

});
//to define cascade behavior while delete obj
activitiesSchema.pre('remove', function(next){
    var self = this;
    async.series([
        function(callback){
            Chat.findByIdAndRemove(self._id, function(err){
                if(err){ callback(err); }
                else{ callback(null); }
            });
        },
        function(callback){
            Tags.update({ activities: self._id }, { $pull: { 'activities': self._id } }, { multi: true },
                function(err){
                if(err){ callback(err); }
                else{ callback(null); }
            });
        },
        function(callback){
            User.update(
                {_id: self.creator},  { $pull: { 'activitiesCreated': self._id } },
                function(err, result){
                    if(err){ callback(err); }
                    else{ callback(null); }
                })
        },
        function(callback){
            User.update(
                { activitiesJoined: self._id },  { $pull: { 'activitiesJoined': self._id } }, { multi: true },
                function(err){
                    if(err){ callback(err); }
                    else{ callback(null); }
                })
        },
        function(callback){
            User.update(
                { activitiesLiked: self._id },  { $pull: { 'activitiesLiked': self._id } }, { multi: true },
                function(err){
                    if(err){ callback(err); }
                    else{ callback(null); }
                })
        },
        function(callback){
            User.update(
                { activitiesDisliked: self._id },  { $pull: { 'activitiesDisliked': self._id } }, { multi: true },
                function(err){
                    if(err){ callback(err); }
                    else{ callback(null); }
                })
        },
    ],
    function(err, results){
        if(err){ console.error(err); next(); }
        else{ next() }
    })
});

module.exports = ActivityMaster = connection.model('NoSoloActivity', activitiesSchema);

function saveAvatarChanges(self){
    ActivityMaster.findById(self._id, function(err, resAct, affected){
        if(err){
            console.error(err);
        }
        else{
            Avatar.findOne({ parentId: self._id }, function(err, oldAvatar, affected){
                if(err){
                    console.error(err);
                }
                else if(oldAvatar == null || oldAvatar.length == 0){
                    var newAvatar = new Avatar();
                    for(var key in newAvatar._doc) {
                        if(key != '_id' && key != '__v'){
                            newAvatar._doc[key][newAvatar._doc[key].length] = ({ createdValue: self[key],
                                created: new Date().toUTCString() });
                        }
                    }
                    newAvatar.parentId = self._id;
                    newAvatar.save(function(err){
                        if(err)console.error(err);
                    });
                }
                else{
                    common.saveArchiveInstance(oldAvatar, self);
                }
            });

        }
    });
};

activitiesSchema.pre('save', function(next){
    var self = this;
    async.waterfall([
            function(callback){
                if(self.maxMembers <= self.joinedUsers.length){
                    callback(new Error('no spots left'));
                }
                else{ callback(); }
            },
            function(callback){
                saveAvatarChanges(self);
                callback();
            }
        ],
    function(err){
        if(err){ next(err); }
        else{ next(); }
    });
});










