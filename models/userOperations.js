var log = require('../lib/log.js')(module),
    crypt = require('bcrypt-nodejs'),
    async = require('async'),
    connection = require('../lib/db.js').connection,
    common = require('../lib/commonFunctions.js'),
    Notification = require('./../data/notificationSchema.js'),
    User = connection.model('NoSoloUser'),//User = require('./../data/userSchema.js'),
    UserLocation = require('./../data/userLocationSchema.js'),
    YEARMILLS = 31557600000//24 * 3600 * 365.25 * 1000,
    FB = require('fb')
    ;


function getMinAge(userBirthday){
    var age = (Math.round(((Date.now()  - new Date(userBirthday))/YEARMILLS)/2 + 7));
    return age < 0 ? 0 : age;
};
function getAge(userBirthday){
   return  (Math.round((Date.now()  - new Date(userBirthday))/YEARMILLS));
};

function checkFields(userArgs){

    if(userArgs.hasOwnProperty("_id") && userArgs.hasOwnProperty("socialToken") && userArgs.hasOwnProperty("surname")
        && userArgs.hasOwnProperty("familyName") ){
        return true;
    }
    else{
        return false;
    }
};

function exchangeToken(userId, shortToken, callback){
    var clientId = null,
        clientSecret = null;
    if(!process.env.FB_CLIENT_ID || !process.env.FB_CLIENT_SECRET){
        console.log('IN SET FB LOCAL');
        var config = require('../config/config');
        clientId = config.fb.clientId;
        clientSecret = config.fb.clientSecret;
    }
    else{
        clientId = process.env.FB_CLIENT_ID;
        clientSecret = process.env.FB_CLIENT_SECRET;
    }
    FB.api('oauth/access_token', {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'fb_exchange_token',
        fb_exchange_token: shortToken
    }, function (res) {
        if(!res || res.error) {
            var resErr = !res ? 'FB error occurred' : res.error;
            log.error(resErr);
            callback(resErr)
        }
        else{
            var accessToken = res.access_token;
            var expires = res.expires ? res.expires : 0;
            console.log('FB EXCHANGE SUCCESS', accessToken, expires);
            callback(null, accessToken, expires);
        }
    });
};

module.exports = {
    getAllUsers: function(callback){
       User.find({}, /*'_id surname familyName created',*/ function(err,users){
           if(err){ log.error(err), callback(err) }
           else{ callback(null, users) }
       })
    },

    signIn: function(userArgs, callbackDone){
        async.waterfall([
                function(callback){
                    User.findOne({_id: userArgs._id}, function (err, resUser){
                        if (err) { callback(err); }
                        else{
                            console.log('FIND USER:', resUser);
                            callback(null, resUser);
                        }
                    })
                },
                function(resUser, callback){
                    if(common.isEmpty(resUser)){
                        if(checkFields(userArgs)) {
                            //console.log('USER BIRTHDATE: ', userArgs.birthDate);
                            //var date = new Date(userArgs.birthDate);
                            //console.log('NEW DATE: ', date);
                            //userArgs.birthDate = date;
                            var savingUser = new User(userArgs);
                            if (!userArgs.preferredAgeMin) {
                                savingUser.preferredAgeMin = getMinAge(userArgs.birthDate);
                            }
                            if (!userArgs.preferredAgeMax) {
                                savingUser.preferredAgeMax = getAge(userArgs.birthDate) + getAge(userArgs.birthDate) -
                                    getMinAge(userArgs.birthDate);
                            }
                            callback(null, savingUser);
                        }
                        else{ callback(new Error('not enough fields to signUp')); }
                    }
                    else{ callback(null, resUser); }
                },
                function(resUser, callback){
                    if(userArgs.isTokenNeeded && userArgs.socialToken && userArgs.socialToken != 'some token'){
                        //console.log('IN ASK TOKEN');
                        exchangeToken(resUser._id, userArgs.socialToken, function(err, longToken, expires){
                            if(err){ callback(err); }
                            else{
                                resUser.socialToken = longToken;
                                callback(null, resUser);
                            }
                        })
                    }
                    else{ callback(null, resUser); }
                },
                function(resUser, callback){
                    //console.log('Saving user',  resUser);
                    resUser.lastVisit = new Date();
                    resUser.save(function(err, resUser){
                        if(err){ callback(err); }
                        else{ callback(null, resUser); }
                    })

                }
            ],
        function(err, resUser){
            if(err){
                log.error('SIGNIN ERROR: ' + err);
                callbackDone(err);
            }
            else{
                log.info('User logged: ' + resUser._id);
                callbackDone(null, resUser);
            }
        });
    },

    findUser: function(userId, callback) {
        User.findById(userId, function (err, result) {
            if (err) {
                log.error(err);
                callback(err);
            }
            if(result == null || result.length == 0){
                log.info('user is not found');
                callback(null,'user is not found');
            }
            else{
                callback(null, result);
            }
        });
    },

    deleteUser: function(userId, callback){
        User.findById(userId, function(err, user) {
            if (err){
                log.error(err);
                callback(err);
            }
            else{
                user.remove(function(err, obj){
                  if(err) {
                      log.error(err);
                      callback(err);
                  }
                    else{
                      log.info('user deleted: ' + userId);
                      callback(null);
                  }
                })
            }

        });
    },

    pushNtf: function(userId, ntfId, callback){
        User.findByIdAndUpdate(userId, { $push: { notifications: ntfId } }, {upsert: true, new: true},
        function(err, resNtf){
            if(err){
                log.error(err);
                callback(err);
            }
            else{
                //log.info('NTF SAVED: ', resNtf);
                callback(null, resNtf);
            }
        })
    },

    universalUserUpdate: function(userObj, callback){
        var changes = common.deepObjClone(userObj);
        delete changes._id;
        delete changes.__v;
        delete  changes.activitiesJoined;
        delete  changes.activitiesCreated;
        delete changes.activityCreatedNumber;
        delete changes.activitiesLiked;
        delete  changes.activitiesDisliked;
        delete changes.notifications;
        User.findByIdAndUpdate(userObj._id, changes,{upsert: true, new: true}, function(err, changed){
            if(err){ callback(err); }
            else if(common.isEmpty(changed)){ callback(new Error('User not found')) }
            else{ callback(null, changed); }
        })
    },

    currentLocationUpdate:function(userId, location, callbackDone){
        async.series([
            function(callback){
                User.findByIdAndUpdate(userId, {currentLocation: location},{upsert: true, new: true},
                    function(err, changed){
                    if(err){ callback(err); }
                    else if(common.isEmpty(changed)){ callback(new Error('User not found')) }
                    else{ callback(null); }
                })
            },
            function(callback){
                UserLocation.findOneAndUpdate({userId: userId},{$push:{ userLocation: location, locationTime: new Date() }},
                    {upsert: true, new: true}, function(err, changed){
                    if(err){ callback(err); }
                    else if(common.isEmpty(changed)){
                        callback(new Error('UserLocation not found'));
                    }
                    else{ callback(null); }
                })
            }
        ],
        function(err){
            if(err){
                log.error(err);
                callbackDone(err);
            }
            else{ callbackDone(null); }
        })

    },

    universalUserSearch: function(criteria, value, callback){
        var searchObj = {};
        searchObj[criteria] = value;
        User.find(searchObj,function(err, res, affected){
            if (err) {
                log.error(err);
                callback(err);
            }
            else if(res == null || res.length == 0){
                log.info('user is not found');
                callback(null, 'user is not found');
            }
            else{
                callback(null, res);
            }
        });
    },

    getUsersByList: function(userList, callback){
        User.find({ '_id': {$in: userList } }
            , function (err, resUsers){
                if(err){
                    log.info(err.message);
                    callback(err);
                }
                else{
                    callback(null, resUsers);
                }
            }
        );
    },

    saveDeviceId: function(userId, deviceType, deviceId, callback){
        User.findByIdAndUpdate(userId,{ uniqueDeviceId: { type: deviceType, deviceId: deviceId } }
            ,{upsert: true }, function(err, result){
                if(err){ callback(err); }
                else{ console.log('DEVICEID SAVED'); callback(null); }
            })
    },

    clearDeviceId: function(userId, callback){
        User.findByIdAndUpdate(userId, { uniqueDeviceId: [] }
            ,{upsert: true }, function(err, result){
                if(err){ callback(err); }
                else{ console.log('DEVICEID SAVED'); callback(null); }
            });
    }
};

function checkPass(pass, hash){
    return crypt.compareSync(pass, hash);
};

/*
old version of signin
User.findOne({_id: userArgs._id}, function (err, result) {
    if (err) {
        log.error(err);
        callback(err);
    }
    if(common.isEmpty(result)){
        if(checkFields(userArgs)){
            var savingUser = new User(userArgs);
            if(!userArgs.preferredAgeMin){
                savingUser.preferredAgeMin = getMinAge(userArgs.birthDate);
            }
            if(!userArgs.preferredAgeMax){
                savingUser.preferredAgeMax = getAge(userArgs.birthDate) + getAge(userArgs.birthDate) -
                    getMinAge(userArgs.birthDate);
            }
            savingUser.save(function(err, savingUser, affected){
                if (err) {
                    log.error(err.message);
                    callback(err);
                }
                else{
                    log.info('new user created: ' + savingUser._id);
                    callback(null, savingUser);
                }
            })
        }
        else{
            log.error('not enough fields to signUp: ' + userArgs._id);
            callback(new Error('not enough fields to signUp'));
        }

    }
    else{
        result.lastVisit = new Date();
        result.save(function(err){ if(err){log.error(err)} });
        log.info('user logged: ' + result._id);
        callback(null, result);
    }
});*/






