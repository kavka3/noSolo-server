var log = require('../lib/log.js')(module),
    async = require('async'),
    common = require('../lib/commonFunctions.js'),
    Chat = require('./../data/chatSchema.js'),
    Activity = require('./../data/activitySchema.js'),
    User = require('./../data/userSchema.js'),
    Tag = require('./tagsOperations.js'),
    Socket = require('../lib/socket.js'),
    Notify = require('./notificActions.js'),
    Invite = require('./../data/inviteSchema.js'),
    mongoose = require('mongoose'),
    commandDictionary = require('./serverDictionaryOperations.js').dictionary,
    checkLanguage = require('./serverDictionaryOperations.js').checkLanguage,
    createMessage = require('./serverDictionaryOperations.js').createMessage,


    RADIUS = 6371,//earth radius in km
    CHAT_CLOSED = 'chat is closed by activity creator',
    NOT_APPROVED = 0,
    DELAY = 2000,
    COUNTER = 3,
    JOINED_USERS_FIELDS = '_id surname familyName imageUrl birthDate gender about activityCreatedNumber activityJoinedNumber',
    CREATOR_FIELDS = '_id surname familyName imageUrl',

    //ids of server commands
    CHANGED_TIME = 9,
    MULTI_PARAMS_MSG = 10,
    MULTI_PARAMS_MSG_OTHERS = 11,
    CHANGED_LOCATION = 12,
    CHANGED_MAX_MEMBERS_FOR_OTHERS = 13,
    CHANGED_MAX_MEMBERS = 14,
    JOIN_APPROVE_YES = 15,
    JOIN_APPROVE_NO = 16,
    CHANGED_TAGS = 17,
    CHANGED_PRIVATE_NO = 18,
    CHANGED_PRIVATE_NO_FOR_OTHERS = 19,
    CHANGED_PRIVATE_YES = 20,
    CHANGED_DESCRIPTION = 21,
    CHANGE_DESCRIPTION_1 = 22,
    CHANGE_DESCRIPTION_2 = 23,
    CHANGED_TITLE = 24,
    NTF_MULTI_MSG = 25,
    TIME_CHANGED_NTF = 26,
    ACTIVITY_CHANGED_NTF_1 = 27,
    ACTIVITY_CHANGED_NTF_2 = 28,
    ACTIVITY_NTF_CREATOR = 29,
    MAX_MEMBERS_NTF = 35,
    YOU = 34,
    CHANGE_TITLE_1 = 36,
    CHANGE_TITLE_2 = 37,
    FROM = 39,
    TO = 40,

    NOSOLO_ID = '100009647204771',
    NOSOLO_NAME = 'noSolo',
    NOSOLO_CHAT = '198803877117851',
    WELCOME_MESSAGE = 30,
    WELCOME_ACTIVITY_MESSAGE = 31,
    WELCOME_TITLE = 32,
    WELCOME_DESCRIPTION = 33,
    WELCOME_URL = 'https://s3.amazonaws.com/nosoloimages/Smile.jpg',
    WELCOME_LOCATION = [34.85992, 32.33292],
    ActivityOperations = null
    ;

function calculateDistance(cords1, cords2){
    Math.degrees = function(rad)
    {
        return rad*(180/Math.PI);
    };
    Math.radians = function(deg)
    {
        return deg * (Math.PI/180);
    };
    var lat1 =   Math.radians(cords1[1]),
        lat2 = Math.radians(cords2[1]),
        deltaLong = Math.radians(cords2[0] - cords1[0]);

    var distance =
        Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1)*Math.cos(lat2) * Math.cos(deltaLong)) * RADIUS;

    return distance;
};

function getAddressee(activity){
    var addrs = common.deepObjClone(activity.joinedUsers);
    var index = addrs.indexOf(activity.creator);
    addrs.splice(index, 1);
    //console.log('IN GET ADDRESSEE: ', addrs);

    return addrs;
};

function sendUpdateNtf(activity, creatorSurname, changedFields, oldActivity){
    var usersIds = activity.joinedUsers.map(function(user){
        return user._id;
    });
    var message =  [{ commandId: MULTI_PARAMS_MSG }],
        forEveryBody = true,
        shouldSend = true,
        messageForOthers = [{ param: creatorSurname } , { commandId: MULTI_PARAMS_MSG_OTHERS }],
        messageForPush = null
        ;
        //notification = null,
        //ntfAddressee = getAddressee(activity);
    ;

    //console.log('IN CHANGE FIELDS:', changedFields[0]);

    switch(changedFields[0]){
        case 'timeStart':case 'timeFinish': {
        var iterator = function(user, callbackI){
            if(user.settings.isSendReminder && user.settings.multipleReminders &&
                user.settings.multipleReminders.length > 0){
                common.setMultipleReminder(user, activity, callbackI);
            }
            else if(user.settings.isSendReminder && user.settings.reminderTime > 0){
                common.setReminder(user, activity, callbackI);
            }
            else{ callbackI(null); }
        };
        common.deleteReminder(activity._id, function(err){
            if(err){log.error(err);}
            else{
                async.waterfall([
                    function(callback){
                        User.find({ '_id': {$in: usersIds } }, function(err, resUsers){
                           if(err){ callback(err); }
                            else{ callback(null, resUsers); }
                        });
                    },
                    function(users, callback){
                        async.eachSeries(users, iterator, function(err, res){
                            if(err){ callback(err); }
                            else{ callback(null); }
                        })
                    }
                ],
                function(err){
                    if(err){log.error(err); }
                    else{ log.info('ACTIVITY OPERATIONS ACTIVITY REMINDERS UPDATED'); }
                })
            }
        });
        if(changedFields.length <= 2){
            message = [{commandId: YOU},{commandId: CHANGED_TIME } ];
            messageForOthers = [{ param: creatorSurname},  { commandId: CHANGED_TIME }];

        }

    };break;
        case 'location': {
            if(changedFields.length == 1){
                message = [{ commandId: CHANGED_LOCATION }];
                messageForOthers = [{ commandId: ACTIVITY_CHANGED_NTF_1}, {param: creatorSurname}, { commandId: ACTIVITY_CHANGED_NTF_2 }];

            }

        };break;
        case 'maxMembers':{
            if(changedFields.length == 1){
                var maxMembers = activity.maxMembers < 21? activity.maxMembers: 'unlimited';
                message =  [{ commandId: YOU} , { commandId: CHANGED_MAX_MEMBERS} , { param: maxMembers }];
                messageForOthers = [{ param: creatorSurname }, { commandId: CHANGED_MAX_MEMBERS }, { param: maxMembers }];
                //console.log('CHANGE MAXMEMBERS UPDATE', messageForOthers);
            }

        };break;
        case 'isApprovalNeeded':{
            if(changedFields.length == 1) {
                if (activity.isApprovalNeeded) { message = [{ commandId: JOIN_APPROVE_YES }]; }
                else { message = [{ commandId: JOIN_APPROVE_NO }]; }
            }
            forEveryBody = false;
        };break;
        case 'tags':{
           /* if(changedFields.length == 1) { message = [{ commandId: CHANGED_TAGS }]; }
            forEveryBody = false;*/
            shouldSend = false;
        };break;
        case 'isPrivate':{
            //console.log('IN PRIVATE CASE: ', activity);
            if(changedFields.length == 1) {
                if(activity.isPrivate){
                    message = [{ commandId: YOU }, { commandId: CHANGED_PRIVATE_YES }];
                    messageForOthers = [{ param: creatorSurname }, { commandId: CHANGED_PRIVATE_YES }];
                }
                else{
                    message = [{ commandId: CHANGED_PRIVATE_NO }];
                    messageForOthers = [{ commandId: CHANGED_PRIVATE_NO_FOR_OTHERS }];
                }
            }
        };break;
        case 'description': {
            if(changedFields.length == 1) {
                message = [{ commandId: CHANGED_DESCRIPTION}];
                messageForOthers = [{ commandId: CHANGE_DESCRIPTION_1 }, { param: creatorSurname }, { commandId: CHANGE_DESCRIPTION_2 }];
            }
        };break;
        case 'title':{
            if(changedFields.length == 1) {
                message = [{ commandId: CHANGED_TITLE }];
                messageForOthers = [ { commandId: CHANGE_TITLE_1 }, { param: creatorSurname }, { commandId: CHANGE_TITLE_2 } ];
                messageForPush = [
                    { param: creatorSurname },
                    { commandId: CHANGE_TITLE_2 },
                    { commandId: FROM },
                    { param: oldActivity.title },
                    { commandId: TO },
                    { param: activity.title }
                ]
            }
        };break;

        default: shouldSend = false; break;

    }
    //console.log('IN CHANGE FIELDS SHOULD SEND', shouldSend);
    //TODO 1 make processing to client side should send message with all languages and choose language to show message in app see todo 2 at the end of the file
    /*server should do:
     if(shouldSend){
     if(forEveryBody){
     Socket.sendToOthers(messageForOthers, activity._id, activity.creator);
     }
     Socket.sendToCreator(activity.creator, NOSOLO_ID, NOSOLO_NAME, activity._id, message);
     }
    *
    * */
    if(shouldSend){
        if(forEveryBody){
            var users = User.find({ '_id': { $in: usersIds } },
                function(err, resUsers){
                    if(err){log.error(err); }
                    else{
                        resUsers.forEach(function(user){
                            if(user._id != activity.creator._id){
                                var resultMessage = createMessage(user.systemLanguage, messageForOthers);
                                var pushMsg = null;
                                if(messageForPush){
                                    pushMsg = createMessage(user.systemLanguage, messageForPush );
                                    //console.log('Push message', pushMsg);
                                }
                                Socket.sendToCreator(user._id, NOSOLO_ID, NOSOLO_NAME, activity._id, resultMessage, pushMsg);
                            }
                        });
                    }
                });
        }
        user = User.findById(activity.creator._id, function(err, resUser){
            if(err){ log.error(err); }
            else{
                var resultMessage = createMessage(resUser.systemLanguage, message);
                Socket.sendToCreator(activity.creator._id, NOSOLO_ID, NOSOLO_NAME, activity._id, resultMessage);
            }
        })

    }


};

function checkDictionary(){
    if(common.isEmpty(commandDictionary)){
        var serverCommands = require('./serverDictionaryOperations.js');
        serverCommands.getDictionary(function(err, resDict){
            if(err){ log.error(err); }
            else{
                commandDictionary = resDict;
                //console.log('GOT dictionary in activity operations'/*, commandDictionary*/);
            }
        })
    }
}

checkDictionary();

module.exports = ActivityOperations = {

    //search activities that user wants to join
    getPending: function(actIds, userId, callback){
        var query = Activity
            .find({ '_id': { $in: actIds } })
            .populate('joinedUsers', JOINED_USERS_FIELDS)
            .populate('creator', CREATOR_FIELDS)
        ;
            //.limit(100);
        query.exec(function(err, resActivity){
            if (err){
                log.error(err);
                callback(err);
            }
            /*else if(common.isEmpty(resActivity)){
             log.info('activity is not found');
             callback(null, 'activity is not found');
             }*/
            else{
                var i = 0, length = resActivity.length, actArr = [];
                var time = new Date();
                var now = time.getTime();
                for(; i < length; i++){
                    var index = resActivity[i]['joinedUsers'].filter(function(uObj){
                        //console.log("IN INDEX: ", uId, userId);
                        return uObj._id == userId;
                    });
                    //console.log('INDEX: ', index, resActivity[i].title);
                    var TF = new Date(resActivity[i]['timeFinish']);
                    if(index.length > 0 || TF > time){
                        //console.log('Compare time:', TF, time, resActivity[i].title);
                        var actObj = common.deepObjClone(resActivity[i]);
                        delete actObj['tagsByLanguage'];
                        actObj.tags = resActivity[i]['tagsByLanguage'];
                        actArr.push(actObj);
                    }
                };
                callback(null, actArr);
            }
        })
    },

    //search by any criteria return activity array
    universalActivitySearch: function(criteria, value, callback){
        var searchObj = {};
        searchObj[criteria] = value;
        var query = Activity
            .find(searchObj)
            .populate('joinedUsers', JOINED_USERS_FIELDS)
            .populate('creator', '_id surname familyName imageUrl')
            //.populate('tags', '_title tagDictionary imageUrl')
            .limit(100);
        query.exec(function(err, resActivity){
            if (err){
                log.error(err);
                callback(err);
            }
            /*else if(common.isEmpty(resActivity)){
             log.info('activity is not found');
             callback(null, 'activity is not found');
             }*/
            else{
                var i = 0, length = resActivity.length, actArr = [];
                for(; i < length; i++){
                    var actObj = common.deepObjClone(resActivity[i]);
                    //if(!common.isEmpty(resActivity[i]['tagsByLanguage'])){}
                    delete actObj['tagsByLanguage'];
                    actObj.tags = resActivity[i]['tagsByLanguage'];
                    actArr.push(actObj);
                };
                //console.log('IN RETURN ', actArr);
                callback(null, actArr);
            }
        })
    },

    //changes any criteria in existing activity, !not working with arrays now!
    universalActivityUpdate: function(activityObj, callback){
        //var activityObj = common.deepObjClone(activity);
        //delete activityObj._id;
        //if(activityObj.creator){ activityObj.creator = activityObj.creator._id; }
        Activity.findByIdAndUpdate(activityObj._id, activityObj, {new: true, upsert: true})
            .populate('creator', CREATOR_FIELDS)
            .populate('joinedUsers', JOINED_USERS_FIELDS)
            .exec(function(err, resAct){
                if (err) {
                    log.error(err);
                    callback(err);
                }
                else if(common.isEmpty(resAct)){
                    log.info('activity is not found');
                    callback(null, 'activity is not found');
                }
                else{
                    //Notify.changeActivityNotify(resAct, activityObj['changedField'], activityObj['creatorName']);
                    sendUpdateNtf(resAct, activityObj['creatorName'], activityObj['changedField'], activityObj);
                    callback(null, resAct);
                }
            })
    },

    updateImage: function(activity, callback){
        var activityObj = common.deepObjClone(activity);
        delete activityObj._id;
        if(activityObj.creator){ activityObj.creator = activity.creator._id; }
        Activity.findByIdAndUpdate(activity._id, activityObj, {upsert: true, new: true}, function(err, resAct){
            if (err) {
                log.error(err);
                callback(err);
            }
            else if(common.isEmpty(resAct)){
                log.info('activity is not found');
                callback(new Error('activity is not found'));
            }
            else{
                //updateUserLAUrl(resAct.creator, activityObj.imageUrl);
                callback(null, resAct);
            }
        })
    },

    //discover activity
    searchLocation : function(requestObj, callbackDone){
        async.waterfall([
            function(callback){
                var searchDistance = (requestObj.radius / RADIUS),
                    startSearch = new Date();
                startSearch.setSeconds(-30);
                var dateFinish = new Date();
                dateFinish.setHours(86);
                var query = Activity
                    .find({ location : { $nearSphere : requestObj.cords, $maxDistance: searchDistance }})
                    .where('timeFinish').gt(Date.now()).lt(dateFinish)
                    //.where('created').lt(startSearch)
                    .where('_id').nin(requestObj.notFindArray)
                    .where('isPrivate').ne(true)
                    //.where('joinedUsers').size(4)
                    .populate('joinedUsers', JOINED_USERS_FIELDS)
                    .populate('creator', '_id surname familyName imageUrl')
                    //.populate('tags', '_title tagDictionary imageUrl')
                    //.limit(100);
                query.exec(function(err, resActivity){
                    if (err) {
                        log.error(err);
                        callback(err);
                    }
                    /* else if(common.isEmpty(resActivity)){
                     log.info('activity is not found');
                     callback(null, 'activity is not found');
                     }*/
                    else {
                        var i = 0, length = resActivity.length, actArr = [];
                        for(; i < length; i++){
                            if(resActivity[i].joinedUsers.length < resActivity[i].maxMembers){
                                var actObj = common.deepObjClone(resActivity[i]);
                                delete actObj['tagsByLanguage'];
                                actObj.tags = resActivity[i]['tagsByLanguage'];
                                actArr.push(actObj);
                            }
                        };
                        //console.log('IN RETURN ', actArr);
                        callback(null, actArr);
                    }
                })
            },
            function(activities, callback){
                var activitiesIds = activities.map(function(activity){
                    return activity._id/*mongoose.Types.ObjectId(activity._id)*/;
                });
                //console.log('Discover user update activitiesIds', activitiesIds);
                requestObj.user.discoveredActivities = activitiesIds;
                requestObj.user.save(function(err, resUser){
                    if(err){ callback(err) }
                    else{
                        //console.log('Discover user update', resUser);
                        callback(null, activities)
                    }
                })
            }

        ], function(err, activities){
            if(err){
                log.error(err);
                callbackDone(err);
            }
            else{ callbackDone(null, activities) }
        })
    },

    //remove user from activity and chat change user fields
    removeUserFromActivity: function(activityId, userId, callbackDone){
        console.log('IN REMOVE USER FROM ACTIVITY');
        async.waterfall([
                function(callback){
                    Activity.findByIdAndUpdate(activityId,
                        { $pull: { joinedUsers: userId, activitiesLiked: { activityId: activityId } } }, { new: true })
                        .populate('creator', CREATOR_FIELDS)
                        .populate('joinedUsers', JOINED_USERS_FIELDS)
                        .exec(function(err, activity){
                                if(err){ callback(err); }
                                else if(common.isEmpty(activity)){ callback(new Error('Activity not found')); }
                                else{ callback(null, activity); }
                            })
                },
                function(activity, callback){
                    Chat.findByIdAndUpdate(activityId, {$pull: { usersInChat: userId } },  {new: true},
                        function(err, chat){
                            if(err){ callback(err); }
                            else{
                                console.log('AFTER CHAT CHANGES', chat);
                                callback(null, activity)
                            }
                        })
                },
                function(activity, callback){
                    User.findByIdAndUpdate(userId, {$pull:{ activitiesJoined: mongoose.Types.ObjectId(activityId) } },
                        {new: true}, function(err, changedUser){
                            if (err){
                                log.error(err);
                                callback(err);
                            }
                            else{
                                Socket.removeFromChat(userId, activityId);
                                Notify.leaveActivity(activity, changedUser);
                                callback(null, activity, changedUser);
                            }
                        });
                },
                function(activity, user, callback){
                    common.removeUserFromTask(activity._id, user._id);
                    callback(null, activity);
                }
            ],
            function(err, activity){
                if(err){
                    log.error(err);
                    callbackDone(err);
                }
                else{
                    Socket.sendMyActivityLeave(userId, activity._id);
                    callbackDone(null, activity);
                }
            })
    },

    //delete in cascade style: with activity userFields, chat and tags;
    deleteActivity: function(activityId, callback){
        var query = Activity
                .find({_id: activityId })
                .populate('creator', '_id surname')
            ;
        query.exec(function(err, result){
            if (err) {
                log.error(err);
                callback(err);
            }
            if (result == null || result.length == 0) {
                log.error('Activity is not found');
                callback(new Error('Activity is not found'));
            }
            else {
                Activity.findById(activityId, function(err, resAct) {
                    if (err){
                        log.error(err);
                        callback(err);
                    }
                    else if(!common.isEmpty(resAct)){
                        resAct.remove(function(err, res){
                            if(err){
                                log.error(err);
                                callback(err);
                            }
                            else{
                                log.info('activity found and deleted: ' + result[0]._id);
                                Socket.chatClosed(activityId, result[0].joinedUsers, result[0].creator._id, result[0].title, result[0].creator.surname);
                                common.deleteReminder(activityId, function(err, res){});
                                log.info('activity deleted');
                                callback(null);
                            }
                        })
                    }
                });
            }
        });
    },
    //creates new activity from old one, change chat id, send request to user join to new activity
    recurActivity: function(activityId, newTimeStart, newTimeFinish, changedFields, callbackResult){
        async.waterfall([
                //get parent activity and check if time start in past, clear id, joinedUsers
                function(callback){
                    Activity.findById(activityId, function(err, resAct, affected){
                        if(err){ callback(err); }
                        else if(resAct == null && resAct.length == 0){
                            callback(new Error('Activity is not found'));
                        }
                        else{
                            var now = new Date();
                            if(resAct.timeStart >= now){
                                callback(new Error('It is no possible to recover activity in present or future'));
                            }
                            else{
                                callback(null, resAct);
                            }
                        }
                    });
                },
                //create new activity
                function(activity, callback){
                    var activityObj = JSON.parse(JSON.stringify(activity));
                    activityObj.timeStart = newTimeStart;
                    activityObj.timeFinish = newTimeFinish;
                    delete activityObj._id;
                    activityObj.joinedUsers = [];
                    //change activity fields
                    if(!common.isEmpty(changedFields)){
                        for(var key in changedFields){
                            if(key !== 'joinedUsers' && key !== '_id'){
                                activityObj[key] = changedFields[key];
                            }
                        }
                    }
                    //find if all members should be joined to new activity
                    activityObj.recurUsers = [];
                    var recurUsers = [];
                    if(!common.isEmpty(changedFields.joinedUsers)){
                        recurUsers = common.getArraysIntersection(activity.joinedUsers, changedFields.joinedUsers);
                    }
                    else{
                        recurUsers = activity.joinedUsers.slice();
                    }
                    for(var i = 0; i < recurUsers.length; i++){
                        activityObj.recurUsers.push({ userId: recurUsers[i], recurStatus: NOT_APPROVED }) ;
                    }
                    activityObj.isRecur = true;
                    delete activityObj.created;
                    ActivityOperations.createActivity(activityObj, function(err, newActivity){
                        if(err){ callback(err); }
                        else{
                            log.info('activity created: ' + newActivity._id);
                            callback(null, newActivity, activity.creator, recurUsers); }
                    });
                },
                //find new activity chat
                function(newActivity, creatorId, recurUsers, callback){
                    Chat.findById(newActivity._id, function(err, newChat, affected){
                        if(err){ callback(err); }
                        else if(common.isEmpty(newChat)){
                            callback(new Error('Chat not found: ' + newActivity._id));
                        }
                        else{ callback(null, newActivity, newChat, creatorId, recurUsers); }
                    });
                },
                //change chat: copy all story of parent chat to new one and close parent one
                function(newActivity, newChat, creatorId, recurUsers, callback){
                    Chat.findById(activityId, function(err, resChat, affected){
                        if(err){ callback(err); }
                        else if(common.isEmpty(resChat)){
                            callback(new Error('Chat not found: ' + activityId));
                        }
                        else{
                            for(var key in resChat._doc){
                                if(key !== '_id' && key !== '__v' && key !== 'usersInChat'){
                                    newChat[key] = resChat[key];
                                }
                            }
                            newChat.save(function(err, newChat){
                                if(err){ callback(err); }
                                else{
                                    resChat.chatStatus = false;
                                    resChat.save(function(err){
                                        if(err){  callback(err); }
                                        else{
                                            Socket.sendToChat(creatorId, activityId, CHAT_CLOSED);
                                            setTimeout(function(){
                                                log.info('chat is closing now');
                                                for(var i = 0; i < resChat.usersInChat.length; i++){
                                                    Socket.removeFromChat(resChat.usersInChat[i], activityId);
                                                }
                                            }, 5000);

                                            callback(null, newActivity, recurUsers);
                                        }
                                    });
                                }
                            });
                        }
                    })
                },
                //send notify to all members
                function(newActivity, recurUsers, callback){
                    Notify.activityRecur(newActivity.creator, newActivity._id, recurUsers);
                    callback(null, newActivity);
                }
            ],
            function(err, newActivity){
                if(err){
                    log.error(err);
                    callbackResult(err);
                }
                else{
                    log.info('Activity recur done: ' + activityId + ": " + newActivity._id);
                    callbackResult(null, newActivity);
                }
            }
        );
    },

    findActivity: function(activityId, callback){
        Activity.findById(activityId, function(err, resActivity){
            if(err){
                log.error(err);
                callback(err);
            }
            else if(resActivity == null || resActivity.length == 0){
                log.error('Activity not found: ' + activityId);
                callback(new Error('Activity not found: ' + activityId));
            }
            else{
                callback(null, resActivity);
            }

        })
    },

    getAllActivities: function(callback){
        Activity.find({},function(err, activityIds){
            if(err){ callback(err) }
            else{ callback(null, activityIds); }
        })
    },

    //creates activity,activity chat, updates creator and tags: adds activity, returns created
    createActivity: function(activity, isWelcome, callbackDone){
        //counting attempts to save activity
        var attemptToSave = 0;
        function tryToSave(createdActivity, activityChat, callback){
            var start = Date.now();
            log.info('TRYING TO SAVE ACTIVITY: ');
            //console.log(createdActivity);
            User.findByIdAndUpdate(createdActivity.creator,
                { $push:{ activitiesCreated: createdActivity._id, activitiesJoined: createdActivity._id}, $inc:{ activityCreatedNumber: 1 } },
                { new: true, upsert: true }, function(err, user){
                    if (err) { callback(err); }
                    else if (common.isEmpty(user)) { callback(new Error('User is not found')); }
                    else {
                        if(user.activitiesJoined.indexOf(createdActivity._id) > -1){
                            createdActivity.save(function(err, createdActivity){
                                if(err){ callback(err); }
                                else{ callback(null, createdActivity, activityChat, user); }
                            })
                        }
                        else if(attemptToSave < COUNTER){
                            log.info('CANT GET ACTIVITY TIME: ', Date.now() - start);
                            //console.log(createdActivity._id, user);
                            attemptToSave++;
                            log.info('RISING COUNTER: ', attemptToSave);
                            setTimeout(tryToSave(createdActivity, activityChat, callback), DELAY);
                        }
                        else(callback(new Error("can't save user changes")))
                    }
                });
        };
        log.info('TRYING TO SAVE ACTIVITY:');
        console.log(activity);
        async.waterfall([
                function(callback){
                    //console.log('IN WATERFALL: ', activity)
                    var createdActivity = new Activity(activity);
                    //console.log('Created activity', createdActivity);
                    var activityChat = new Chat( { _id: createdActivity._id, usersInChat:[activity.creator] });
                    createdActivity.joinedUsers.push(activity.creator);
                    callback(null, createdActivity, activityChat);
                },
                function(createdActivity, activityChat, callback){
                    activityChat.save(function(err, activityChat){
                        if(err){callback(err)}
                        else{ callback(null, createdActivity, activityChat) }
                    })
                },
                function(createdActivity, activityChat, callback){
                    tryToSave(createdActivity, activityChat, callback);
                },
                function(createdActivity, activityChat, user, callback){
                    Socket.addToChat(createdActivity.creator, activityChat._id);
                    callback(null, createdActivity, user);

                },
                function(createdActivity, user, callback){
                    if(!isWelcome){
                        if(user.settings.isSendReminder && user.settings.multipleReminders &&
                            user.settings.multipleReminders.length > 0){
                            common.setMultipleReminder(user, createdActivity, callback);
                        }
                        else if(user.settings.isSendReminder && user.settings.reminderTime > 0){
                            common.setReminder(user, createdActivity, callback);
                        }
                        else{ callback(null, createdActivity, user); }
                    }
                    else{ callback(null, createdActivity, user); }
                },
                function(createdActivity, user, callback){
                    if(common.isEmpty(createdActivity.tags)){
                        callback(null, createdActivity, user);
                    }
                    else{
                        Tag.addActivities({tags: createdActivity.tags, activityId: createdActivity._id},
                            function (err) {
                                if (err) { callback(err); }
                                else { callback(null, createdActivity, user); }
                            });
                    }
                }
            ],
            function(err, createdActivity, user){
                if(err){
                    log.error(err);
                    callbackDone(err);
                }
                else{
                    log.info('ACTIVITY CREATED');
                    //delete createdActivity.creator;
                    var activityCopy = common.deepObjClone(createdActivity);
                    var creator ={
                        _id: user._id,
                        surname: user.surname,
                        imageUrl: user.imageUrl,
                        familyName: user.familyName
                    };
                    activityCopy['creator'] = creator;
                    activityCopy.joinedUsers = [creator];
                    //console.log(activityCopy);
                    //console.log(user);
                    if(!isWelcome){
                        var userLang = checkLanguage(user.systemLanguage);
                        console.log("USER LANGUAGE:", userLang, commandDictionary );
                        Socket.sendToCreator(user._id, NOSOLO_ID, NOSOLO_NAME, activityCopy._id,
                            commandDictionary[userLang][WELCOME_MESSAGE] );
                    }
                    callbackDone(null, activityCopy);
                }
            })
    },

    inviteToActivity: function(userId, activityId, isSingle, callbackDone){
        var inviteObj = {creator: userId, activity: activityId };
        if(isSingle != 1){ inviteObj['isSingle'] = isSingle; }
        var invite = new Invite(inviteObj);
        invite.save(function(err, inviteRes){
            if(err){callbackDone(err); }
            else{ console.log('INVITE SAVED: ', inviteRes);callbackDone(null, inviteRes._id); }
        })
    },

    acceptInvite: function(inviteId, /*userId, */callbackDone){
        async.waterfall([
                function(callback){
                    Invite.findById(inviteId, function(err, invite){
                        if(err){ callback(err); }
                        else if(common.isEmpty(invite)){ callback(new Error('Invite not found')); }
                        else{ callback(null, invite); }
                    })
                },
                /*function(invite, callback){
                 if(!invite.isDone){
                 Notify.joinApprove(null, userId
                 , invite.activity, null, function(err){
                 if(err){ callback(err) }
                 else{ callback(null, invite); }
                 });
                 }
                 else{ callback(new Error('Invite already closed')); }

                 },*/
                function(invite, callback){
                    if(invite.isSingle){
                        invite.isDone = true;
                        invite.save(function(err, result){
                            if(err){callback(err); }
                            else{ callback(null); }
                        })
                    }
                    else{ callback(null);}
                }
            ],
            function(err){
                if(err){
                    log.error(err);
                    callbackDone(err);
                }
                else{
                    log.info('Invite processed');
                    callbackDone(null);
                }
            })
    },

    checkPlaces: function(activityId, callback){
        Activity.findById(activityId)
            .populate('joinedUsers', JOINED_USERS_FIELDS)
            .exec(function(err, resAct){
                if(err){ callback(err); }
                else if(common.isEmpty(resAct)){ callback(new Error('activity not found')); }
                else{
                    //log.info('checkPlaces');
                    if(resAct.joinedUsers.length >= resAct.maxMembers){ callback(null, false); }
                    else{ callback(null, true, resAct); }
                }
            })
    },

    getCurrent: function(callback){
        var date = new Date(2015, 11, 27);
        var arr = ['198803877117851','198803877117851'];
        var query = Activity
            .find({})
            .where('timeStart').gt(date)
            .where('fbId').exists(false)
            .where('creator').nin(arr)
            .populate('joinedUsers',
            '_id surname familyName imageUrl currentLocation')
            .populate('creator', '_id surname familyName imageUrl currentLocation')

        query.exec(function(err, resActivities){
            if(err){ callback(err); }
            else{ callback(null, resActivities); }
        })
    },

    createWelcomeActivity: function(userId, userLang, creatorId, title, description, imageUrl, location, isAdmin, callbackDone){
        var checkedLang = checkLanguage(userLang);
        var aTitle = title? title: commandDictionary[checkedLang][WELCOME_TITLE],
            aDesc = description? description : commandDictionary[checkedLang][WELCOME_DESCRIPTION],
            aImage = imageUrl? imageUrl : WELCOME_URL,
            aLocation = location? location : WELCOME_LOCATION,
            aCreator = creatorId? creatorId : NOSOLO_CHAT
        ;
        async.waterfall([
                function(callback){
                    log.info('create WelcomeActivity userId', userId);
                    var startTime = new Date();
                    var finishTime = new Date();
                    finishTime.setHours(24);
                    var welcomeActivity = {
                        title: aTitle,
                        description: aDesc,
                        imageUrl: aImage,
                        location: aLocation,
                        creator: aCreator,
                        timeStart: startTime,
                        timeFinish: finishTime,
                        maxMembers: 2,
                        isPrivate: true
                    };
                    ActivityOperations.createActivity(welcomeActivity, true, function(err, resAct){
                        if(err){
                            log.error(err);
                            callback(err);
                        }
                        else{callback(null, resAct);}
                    });
                },
                function(resAct, callback){
                    Chat.findByIdAndUpdate(resAct._id, { $push: { usersInChat: userId }, $set: { crm: { isSupport: true } } },
                        { new: true },
                        function(err, resChat){
                            if(err){ callback(err); }
                            else{
                                //console.log('Support Chat created:', resChat);
                                callback(null, resAct);
                            }
                        })
                },
                function(resAct, callback){
                    User.findByIdAndUpdate(userId,{ $push: { activitiesJoined: resAct._id } }, {new: true},
                        function(err, resUser){
                            if(err){ callback(err); }
                            else{ callback(null, resAct, resUser); }
                        })
                },
                function(resAct, resUser, callback){
                    Activity.findByIdAndUpdate(resAct._id, {$push: { joinedUsers: userId } }, { new: true },
                    function(err, changedAct){
                        if(err){ callback(err); }
                        else{ callback(null, resUser, changedAct); }
                    })
                },
                function( resUser, resAct, callback){
                    if(!isAdmin){
                        Socket.addToChat(userId, resAct._id);
                        setTimeout(function(){
                            //message for joiner not for creator
                            var finalMessage = commandDictionary[checkedLang][WELCOME_ACTIVITY_MESSAGE];
                            Socket.sendToCreator(userId, NOSOLO_ID, NOSOLO_NAME, resAct._id, finalMessage);
                        }, 2000);
                    }
                    callback(null, resAct, resUser)
                }

        ],
        function(err, resAct, resUser){
            if(err){
                console.error('WELCOME ACTIVITY ERROR: ', err);
                if(callbackDone){ callbackDone(err); }
            }
            else{
                log.info('welcome activity created for user: ' + resUser._id);
                if(callbackDone){ callbackDone(null, resAct); }
            }

        });

    },

    removeUserActivities: function(userId, callbackDone){
        async.waterfall([
                function(callback){
                    Activity.find({creator: userId}, function(err, resActs){
                        if(err){ callback(err); }
                        else{ callback(null, resActs); }
                    })
                },
                function(resActs, callback){
                    async.eachSeries(resActs, function(activity, callbackEach){
                        ActivityOperations.deleteActivity(activity._id, function(err){
                            if(err){ callbackEach(err); }
                            else{ callback(null); }
                        },
                            function(err){
                                if(err){ callback(err); }
                                else{ callback(null); }
                            }
                        )
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
    }

};

//TODO 2 old version of function should change it with todo 1
/*
 CHANGED_TIME = ' changed the time of the activity',
 MULTI_PARAMS_MSG = 'You changed some details in the activity',
 MULTI_PARAMS_MSG_OTHERS = ' changed some details in the activity\n check it out',
 CHANGED_LOCATION = 'You changed the location',
 CHANGED_MAX_MEMBERS_FOR_OTHERS = 'More spots are now available, invite your friends!',
 CHANGED_MAX_MEMBERS = ' changed the # of participants to ',
 JOIN_APPROVE_YES = 'You really made sure people would show up for the fun',
 JOIN_APPROVE_NO = 'You just made it easier for others to join IN',
 CHANGED_TAGS = 'You re-defined the tags on this one',
 CHANGED_PRIVATE_NO = 'You changed the visibility of this activity to public, making it available for other noSoloers to join on the fun.',
 CHANGED_PRIVATE_NO_FOR_OTHERS = 'This activity is now public, increasing the chances of this activity happening!',
 CHANGED_PRIVATE_YES = ' changed this activity to private invite your friends to join it',
 CHANGED_DESCRIPTION = 'You described this activity differently ',
 CHANGE_DESCRIPTION_1 = 'For better or for best, ',
 CHANGE_DESCRIPTION_2 = ' changed the info on this activity',
 CHANGED_TITLE = 'You changed the title',
 NTF_MULTI_MSG = 'some details in activity changed. Check it out',
 TIME_CHANGED_NTF = 'activity time changed',
 ACTIVITY_CHANGED_NTF_1 = 'Heads up ',
 ACTIVITY_CHANGED_NTF_2 = ' changed the location',
 ACTIVITY_NTF_CREATOR = 'activity location changed',
 MAX_MEMBERS_NTF = '# of participants changed',
 YOU = 'You',
 CHANGE_TITLE_1 = 'if this isn’t spontaneous enough, ',
 CHANGE_TITLE_2 = ' just renamed the activity',

 NOSOLO_ID = '100009647204771',
 NOSOLO_NAME = 'noSolo',
 NOSOLO_CHAT = '198803877117851',
 WELCOME_MESSAGE = 'Activity successfully created\n Tap on "Info" and invite friends to join IN on the fun!',
 WELCOME_ACTIVITY_MESSAGE = 'Welcome to noSolo here you can tell us what you want',
 WELCOME_TITLE = 'Chat with noSolo',
 WELCOME_DESCRIPTION = 'Tell us how we can help you',
 WELCOME_URL = 'https://s3.amazonaws.com/nosoloimages/Smile.jpg',
 WELCOME_LOCATION = [34.85992, 32.33292],
 ActivityOperations = null

function sendUpdateNtf(activity, creatorSurname, changedFields){
    var message = MULTI_PARAMS_MSG,
        forEveryBody = true,
        shouldSend = true,
        messageForOthers = creatorSurname + MULTI_PARAMS_MSG_OTHERS,
        notification = null,
        ntfAddressee = getAddressee(activity);
    ;

    console.log('IN CHANGE FIELDS:', changedFields[0]);

    switch(changedFields[0]){
        case 'timeStart':case 'timeFinish': {
        var iterator = function(user, callbackI){
            if(user.settings.isSendReminder && user.settings.multipleReminders &&
                user.settings.multipleReminders.length > 0){
                common.setMultipleReminder(user, activity, callbackI);
            }
            else if(user.settings.isSendReminder && user.settings.reminderTime > 0){
                common.setReminder(user, activity, callbackI);
            }
            else{ callbackI(null); }
        };
        common.deleteReminder(activity._id, function(err){
            if(err){log.error(err);}
            else{
                async.waterfall([
                        function(callback){
                            User.find({ '_id': {$in: activity.joinedUsers } }, function(err, resUsers){
                                if(err){ callback(err); }
                                else{ callback(null, resUsers); }
                            });
                        },
                        function(users, callback){
                            async.eachSeries(users, iterator, function(err, res){
                                if(err){ callback(err); }
                                else{ callback(null); }
                            })
                        }
                    ],
                    function(err){
                        if(err){log.error(err); }
                        else{ log.info('ACTIVITY OPERATIONS ACTIVITY REMINDERS UPDATED'); }
                    })
            }
        });
        if(changedFields.length <= 2){
            message = YOU + CHANGED_TIME;
            messageForOthers = creatorSurname + CHANGED_TIME;
            notification = TIME_CHANGED_NTF;
        }
        else{ notification = NTF_MULTI_MSG; }
    };break;
        case 'location': {
            if(changedFields.length == 1){
                message = CHANGED_LOCATION;
                messageForOthers = ACTIVITY_CHANGED_NTF_1 + creatorSurname + ACTIVITY_CHANGED_NTF_2;
                notification = ACTIVITY_NTF_CREATOR;
            }
            else{ notification = NTF_MULTI_MSG; }
        };break;
        case 'maxMembers':{
            if(changedFields.length == 1){
                var maxMembers = activity.maxMembers < 21? activity.maxMembers: 'unlimited';
                message =  YOU + CHANGED_MAX_MEMBERS + maxMembers;
                messageForOthers = creatorSurname + CHANGED_MAX_MEMBERS + maxMembers;
                notification = MAX_MEMBERS_NTF;
            }
            else{ notification = NTF_MULTI_MSG; }
        };break;
        case 'isApprovalNeeded':{
            if(changedFields.length == 1) {
                if (activity.isApprovalNeeded) { message = JOIN_APPROVE_YES; }
                else { message = JOIN_APPROVE_NO; }
            }
            forEveryBody = false;
        };break;
        case 'tags':{
            if(changedFields.length == 1) { message = CHANGED_TAGS; }
            forEveryBody = false;
        };break;
        case 'isPrivate':{
            //console.log('IN PRIVATE CASE: ', activity);
            if(changedFields.length == 1) {
                if(activity.isPrivate){
                    message = YOU + CHANGED_PRIVATE_YES;
                    messageForOthers = creatorSurname + CHANGED_PRIVATE_YES;
                }
                else{
                    message = CHANGED_PRIVATE_NO;
                    messageForOthers = CHANGED_PRIVATE_NO_FOR_OTHERS;
                }
            }
        };break;
        case 'description': {
            if(changedFields.length == 1) {
                message = CHANGED_DESCRIPTION;
                messageForOthers = CHANGE_DESCRIPTION_1 + creatorSurname + CHANGE_DESCRIPTION_2;
            }
        };break;
        case 'title':{
            if(changedFields.length == 1) {
                message = CHANGED_TITLE;
                messageForOthers = CHANGE_TITLE_1 + creatorSurname + CHANGE_TITLE_2;
            }
        };break;

        default: shouldSend = false; break;

    }*/
