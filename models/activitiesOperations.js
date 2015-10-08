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

    RADIUS = 6371,//earth radius in km
    CHAT_CLOSED = 'chat is closed by activity creator',
    NOT_APPROVED = 0,
    DELAY = 2000,
    COUNTER = 3,

    WELCOME_MESSAGE = 'Activity successfully created\n Tap on "Info" and invite friends to join IN on the fun!',
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
    CHANGED_TITLE = 'You changed the title',
    NTF_MULTI_MSG = 'some details in activity changed. Check it out'

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
    console.log('IN GET ADDRESSEE: ', addrs);

    return addrs;
};

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
            message = 'You' + CHANGED_TIME;
            messageForOthers = creatorSurname + CHANGED_TIME;
            notification = 'activity time changed';
        }
        else{ notification = NTF_MULTI_MSG; }
    };break;
        case 'location': {
            if(changedFields.length == 1){
                message = CHANGED_LOCATION;
                messageForOthers = 'Heads up ' + creatorSurname + ' changed the location';
                notification = 'activity location changed'
            }
            else{ notification = NTF_MULTI_MSG; }
        };break;
        case 'maxMembers':{
            if(changedFields.length == 1){
                var maxMembers = activity.maxMembers < 21? activity.maxMembers: 'unlimited';
                message =  'You ' + CHANGED_MAX_MEMBERS + maxMembers;
                messageForOthers = creatorSurname + CHANGED_MAX_MEMBERS + maxMembers;
                notification = '# of participants changed'
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
                    message = 'You' + CHANGED_PRIVATE_YES;
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
                messageForOthers = 'For better or for best, ' + creatorSurname + ' changed the info on this activity' ;
            }
        };break;
        case 'title':{
            if(changedFields.length == 1) {
                message = CHANGED_TITLE;
                messageForOthers = 'if this isn’t spontaneous enough, ' + creatorSurname + ' just renamed the activity' ;
            }
        };break;

        default: shouldSend = false; break;

    }
    console.log('IN CANGE FIELDS SHOULD SEND', shouldSend);
    if(shouldSend){
        if(forEveryBody){ Socket.sendToOthers(messageForOthers, activity._id, activity.creator); }
        Socket.sendToCreator(activity.creator, '100009647204771', 'noSolo', activity._id, message);
        //if(notification){ Notify.changeActivityNotify(activity, creatorSurname, ntfAddressee, notification); }
    }


};

module.exports = ActivityOperations = {

    //search activities that user wants to join
    getPending: function(actIds, userId, callback){
        var query = Activity
            .find({ '_id': { $in: actIds } })
            .populate('joinedUsers',
            '_id surname familyName imageUrl birthDate gender about activityCreatedNumber activityJoinedNumber')
            .populate('creator', '_id surname familyName imageUrl')
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
            .populate('joinedUsers',
            '_id surname familyName imageUrl birthDate gender about activityCreatedNumber activityJoinedNumber')
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
        Activity.findByIdAndUpdate(activityObj._id, activityObj, {new: true, upsert: true}, function(err, resAct){
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
                sendUpdateNtf(resAct, activityObj['creatorName'], activityObj['changedField']);
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
    searchLocation : function(requestObj, callback){
        var searchDistance = (requestObj.radius / RADIUS),
            startSearch = new Date();
        startSearch.setSeconds(-30);
        var query = Activity
            .find({ location : { $nearSphere : requestObj.cords, $maxDistance: searchDistance }})
            .where('timeFinish').gt(Date.now())
            //.where('created').lt(startSearch)
            .where('_id').nin(requestObj.notFindArray)
            .where('isPrivate').ne(true)
            //.where('joinedUsers').size(4)
            .populate('joinedUsers', '_id surname familyName imageUrl birthDate gender about activityCreatedNumber activityJoinedNumber')
            .populate('creator', '_id surname familyName imageUrl')
            //.populate('tags', '_title tagDictionary imageUrl')
            .limit(100);
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

    //remove user from activity and chat change user fields
    removeUserFromActivity: function(activityId, userId, callbackDone){
        async.waterfall([
                function(callback){
                    Activity.findByIdAndUpdate(activityId,
                        { $pull: { joinedUsers: userId, activitiesLiked: { activityId: activityId } } }, { new: true },
                        function(err, activity){
                            if(err){ callback(err); }
                            else if(common.isEmpty(activity)){ callback(new Error('Activity not found')); }
                            else{ callback(null, activity); }
                        })
                },
                function(activity, callback){
                    Chat.findByIdAndUpdate(activityId, {$pull: { joinedUsers: userId }},
                        function(err, chat){
                            if(err){ callback(err); }
                            else{ callback(null, activity) }
                        })
                },
                function(activity, callback){
                    User.findByIdAndUpdate(userId, {$pull:{ activitiesJoined: activityId } },
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
                    callbackDone(null, activity);
                }
            })
    },

    //delete in cascade style: with activity userFields, chat and tags;
    deleteActivity: function(activityId, callback){
        Activity.findById(activityId, function(err, result, affected){
            if (err) {
                log.error(err);
                callback(err);
            }
            if (result == null || result.length == 0) {
                log.error('Activity is not found');
                callback(new Error('Activity is not found'));
            }
            else {
                log.info('activity found: ' + result.title);
                result.remove(function(err) {
                    if (err){
                        log.error(err);
                        callback(err);
                    }
                    Socket.chatClosed(activityId, result.joinedUsers);
                    common.deleteReminder(activityId, function(err, res){});
                    log.info('activity deleted');
                    callback(null);
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
    createActivity: function(activity, callbackDone){
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
                            console.log(createdActivity._id, user);
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
                    console.log('Created activity', createdActivity);
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
                    if(user.settings.isSendReminder && user.settings.multipleReminders &&
                        user.settings.multipleReminders.length > 0){
                        common.setMultipleReminder(user, createdActivity, callback);
                    }
                    else if(user.settings.isSendReminder && user.settings.reminderTime > 0){
                        common.setReminder(user, createdActivity, callback);
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
                    //console.log(createdActivity);
                    //console.log(user);
                    Socket.sendToCreator(user._id,'100009647204771', 'noSolo', createdActivity._id, WELCOME_MESSAGE );
                    callbackDone(null, createdActivity);
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
        Activity.findById(activityId, function(err, resAct){
            if(err){ callback(err); }
            else if(common.isEmpty(resAct)){ callback(new Error('activity not found')); }
            else{
                log.info('checkPlaces', resAct);
                if(resAct.joinedUsers.length >= resAct.maxMembers){ callback(null, false); }
                else{ callback(null, true, resAct.title); }
            }
        })
    },

    getCurrent: function(callback){
        var query = Activity
            .find({})
            .where('timeFinish').gt(Date.now())
            .populate('joinedUsers',
            '_id surname familyName imageUrl currentLocation')
            .populate('creator', '_id surname familyName imageUrl currentLocation')

        query.exec(function(err, resActivities){
            if(err){ callback(err); }
            else{ callback(null, resActivities); }
        })
    }

};


