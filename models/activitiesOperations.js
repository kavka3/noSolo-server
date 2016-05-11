
//GLOBAL VARIABLES AND CONSTANTS
{
    var log = require('../lib/log.js')(module),
        async = require('async'),
        common = require('../lib/commonFunctions.js'),
        Chat = require('../data/chatSchema.js'),
        Activity = require('../data/activitySchema.js'),
        ChatBroker = require('./chatBroker.js'),
        User = require('../data/userSchema.js'),
        Tag = require('./tagsOperations.js'),
        Socket = require('../lib/socket.js'),
        Notify = require('./notificActions.js'),
        Invite = require('../data/inviteSchema.js'),
        mongoose = require('mongoose'),
        commandDictionary = require('./serverDictionaryOperations.js').dictionary,
        createMessage = require('./serverDictionaryOperations.js').createMessage,
        urlShorter = require('../lib/urlShorter.js'),
        ActivityOperations = null,

        RADIUS = 6371,//earth radius in km
        DELAY = 2000,
        COUNTER = 3,
        JOINED_USERS_FIELDS = '_id surname familyName imageUrl birthDate gender about activityCreatedNumber activityJoinedNumber',
        CREATOR_FIELDS = '_id surname familyName imageUrl systemLanguage',
        TAG_FIELDS = '_title imageUrl tagCategory tagDictionary',

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

        TODAY = 41,
        STARTED = 42,
        TOMORROW = 43,
        //see common functions to continue
        AT = 51,
        ON = 52,
        GOING = 53,
        AM = 54,
        PM = 55,
        INTERESTING_IN = 56,
        WHITESPACE = ' ',

        JOINED = ' joined ',
        NOSOLO_ID = '100009647204771',
        NOSOLO_NAME = 'noSolo'
        ;
}

module.exports = {
    userIn: userIn,
    prepareToUpdate: prepareToUpdate,
    getMyActivities: getMyActivities,
    //search by any criteria return activity array
    universalActivitySearch: universalActivitySearch,
    //changes any criteria in existing activity, !not working with arrays now!
    universalActivityUpdate: function(activityObj, callback){
        Activity.findByIdAndUpdate(activityObj._id, activityObj, {new: true, upsert: true})
            .populate('creator', CREATOR_FIELDS)
            .populate('joinedUsers', JOINED_USERS_FIELDS)
            .populate('followingUsers', JOINED_USERS_FIELDS)
            .populate('tags', TAG_FIELDS)
            .exec(function(err, resAct){
                if (err) { callback(err); }
                else if(common.isEmpty(resAct)){
                    callback(new Error('activity not found'));
                }
                else{
                    var activityClone = common.deepObjClone(resAct);
                    activityClone['tags'] = common.convertTags(resAct.tags, resAct.creator.systemLanguage);
                    sendUpdateNtf(activityClone, activityObj['creatorName'], activityObj['changedField'], activityObj);
                    callback(null, activityClone);
                }
            })
    },
    updateImage: function(activity, callback){
        var activityObj = common.deepObjClone(activity);
        delete activityObj._id;
        if(activityObj.creator){ activityObj.creator = activity.creator._id; }
        Activity.findByIdAndUpdate(activity._id, activityObj, {upsert: true, new: true})
            .populate('creator', CREATOR_FIELDS)
            .populate('joinedUsers', JOINED_USERS_FIELDS)
            .populate('followingUsers', JOINED_USERS_FIELDS)
            .populate('tags', TAG_FIELDS)
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
                    var activityClone = common.deepObjClone(resAct);
                    activityClone['tags'] = common.convertTags(resAct.tags, resAct.creator.systemLanguage);
                    sendUpdateNtf(activityClone, activityObj['creatorName'], activityObj['changedField'], activityObj);
                    callback(null, activityClone);
                }
            })
    },
    discover : discover,
    //remove user from activity and chat change user fields
    removeUserFromActivity: function(activityId, userId, isRemove, callbackDone){
        async.waterfall([
                function(callback){
                    Activity.findByIdAndUpdate(activityId,
                        {
                            $pull: {
                                joinedUsers: userId,
                                activitiesLiked: { activityId: activityId },
                                followingUsers: userId
                            }
                        }, { new: true })
                        .populate('creator', CREATOR_FIELDS)
                        .populate('joinedUsers', JOINED_USERS_FIELDS)
                        .populate('followingUsers', JOINED_USERS_FIELDS)
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
                            else{ callback(null, activity); }
                        })
                },
                function(activity, callback){
                    User.findByIdAndUpdate(userId, {$pull:{ activitiesJoined: mongoose.Types.ObjectId(activityId) } },
                        {new: true}, function(err, changedUser){
                            if (err){ callback(err); }
                            else{
                                Socket.removeFromChat(userId, activityId);
                                Notify.leaveActivity(activity, changedUser);
                                callback(null, activity, changedUser);
                            }
                        });
                },
                function(activity, user, callback){
                    common.removeUserFromTask(activity._id, user._id);
                    callback(null, activity, user);
                },
                function(activity, user, callback){
                    if(isRemove){
                        Socket.sendMyActivityLeave(userId, activity._id, activity.title, activity.creator, new Date(),
                        function(){
                            callback(null, activity, user);
                        });
                    }
                    else{
                        callback(null, activity);
                    }
                }
            ],
            function(err, activity){
                if(err){ callbackDone(err); }
                else{ callbackDone(null, activity); }
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
    createActivity: createActivity,
    inviteToActivity: function(link, userId, activityId, isSingle, inviteType, isParticipant, callbackDone){
        async.waterfall([
            //create invite
            function(callback){
                var inviteObj = {creator: userId, activity: activityId, inviteType:inviteType };
                if(isSingle != 1){ inviteObj['isSingle'] = isSingle; }
                var invite = new Invite(inviteObj);
                invite.save(function(err, inviteRes){
                    if(err){callback(err); }
                    else{ console.log('INVITE SAVED: ', inviteRes);callback(null, inviteRes._id); }
                })
            },
            //tinify link
            function(inviteId, callback){
                var longLink = link + inviteId;
                urlShorter.minimizeUrl(longLink, function(err, resLink){
                    if(err){ callback(err); }
                    else{ callback(null, resLink) }
                })
            },
            //create message
            function(resLink, callback){
                createInviteMessage(userId, activityId, isParticipant, function(err, resMessage){
                    if(err){ callback(err); }
                    else{ callback(null, resLink, resMessage) }
                })
            }
        ],
        function(err, resLink, resMessage){
            if(err){
                console.error(err);
                callbackDone(err);
            }
            else{
                console.log('invite link minified', resLink, resMessage);
                callbackDone(null, resLink, resMessage);
            }
        });

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
                            else{ callbackEach(null); }
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

(function checkDictionary(){
    if(common.isEmpty(commandDictionary)){
        var serverCommands = require('./serverDictionaryOperations.js');
        serverCommands.getDictionary(function(err, resDict){
            if(err){ log.error(err); }
            else{
                commandDictionary = resDict;
                console.log('GOT dictionary in activity operations'/*, commandDictionary*/);
            }
        })
    }
}());

function getMyActivities(actIds, userId, callback){
    var query = Activity
        .find({ '_id': { $in: actIds } })
        .populate('joinedUsers', JOINED_USERS_FIELDS)
        .populate('creator', CREATOR_FIELDS)
        .populate('followingUsers', JOINED_USERS_FIELDS)
        ;
    query.exec(function(err, resActivities){
        if (err){ callback(err); }
        else{
            var actArr = convertTags(resActivities);
            callback(null, actArr);
        }
    });
};

function universalActivitySearch(criteria, value, callback){
    var searchObj = {};
    searchObj[criteria] = value;
    var query = Activity
        .find(searchObj)
        .populate('joinedUsers', JOINED_USERS_FIELDS)
        .populate('creator', CREATOR_FIELDS)
        .populate('followingUsers', JOINED_USERS_FIELDS);
    query.exec(function(err, resActivities){
        if (err){ callback(err); }
        else{
            var actArr = convertTags(resActivities);
            callback(null, actArr);
        }
    })
};

function prepareToUpdate(obj){
    var resObj = common.deepObjClone(obj);
    delete resObj['$$hashKey'];
    resObj.creator = obj.creator._id;
    resObj['creatorName'] = obj.creator.surname;
    if(resObj.tags && resObj.tags.length == 0){
        delete resObj.tags;
        delete resObj.tagsByLanguage;
        delete resObj.joinedUsers;
    }
    else if(!common.isEmpty(resObj.tags)){
        var arr = [];
        for(var i = 0; i < obj.tags.length; i++){
            if(obj.tags[i]._title != undefined){
                arr.push(obj.tags[i]._title);
            }
        }
        resObj.tagsByLanguage = obj.tags;
        if(!common.isEmpty(arr)){ resObj.tags = arr; }
        var tagsByLang = [];
        for(var i = 0; i < obj.tags.length; i++){
            var tagObj = {};
            tagObj['name'] = obj.tags[i]['name'];
            tagObj['imageUrl'] = obj.tags[i]['imageUrl'];
            tagObj['tagCategory'] = obj.tags[i]['tagCategory'];
            tagObj['_title'] = obj.tags[i]['_title'];
            tagsByLang.push(tagObj);
        }
        resObj.tagsByLanguage = tagsByLang;
    }
    return resObj;
};

function discover(location, user, callbackDone){
    async.waterfall([
        function(callback){
            var searchDistance = (user.radius / RADIUS),
                startLimit = new Date();
            startLimit.setHours(startLimit.getHours() + 72);

            var query = Activity
                .find({ location : { $nearSphere : location, $maxDistance: searchDistance } })
                .where('_id').nin(user.activitiesJoined)
                .where('timeFinish').gt(Date.now())
                .where('timeStart').lt(startLimit)
                .where('isPrivate').ne(true)
                .populate('joinedUsers', JOINED_USERS_FIELDS)
                .populate('creator', CREATOR_FIELDS)
                .populate('followingUsers', JOINED_USERS_FIELDS)
            ;
            query.exec(function(err, resActivities){
                if (err) { callback(err); }
                else {
                    var activities = prepareActivities(resActivities);
                    callback(null, activities);
                }
            })
        },
    ], function(err, activities){
        if(err){ callbackDone(err); }
        else{ callbackDone(null, activities); }
    })
};

function convertTags(activities){
    var res = [];
    for(var i = 0; i < activities.length; i++){
        var actObj = common.deepObjClone(activities[i]);
        delete actObj['tagsByLanguage'];
        actObj.tags = activities[i]['tagsByLanguage'];
        res.push(actObj);
    }

    return res;
};

function prepareActivities(activities){
    var res = [];
    for(var i = 0; i < activities.length; i++){
        if(activities[i].joinedUsers.length < activities[i].maxMembers ){
            var actObj = common.deepObjClone(activities[i]);
            delete actObj['tagsByLanguage'];
            actObj.tags = activities[i]['tagsByLanguage'];
            res.push(actObj);
        }
    }
    return res;
};

function createActivity(activity, isFb, callbackDone){
    async.waterfall([
            function(callback){
                var createdActivity = new Activity(activity);
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
                User.findByIdAndUpdate(createdActivity.creator,
                    { $push:{ activitiesCreated: createdActivity._id, activitiesJoined: createdActivity._id},
                        $inc:{ activityCreatedNumber: 1 } }, { new: true, upsert: true },
                    function(err, user){
                        if (err) { callback(err); }
                        else if(common.isEmpty(user)){ callback(new Error('User is not found')); }
                        else if (user.activitiesJoined.indexOf(createdActivity._id) > -1) {
                            createdActivity.save(function (err, createdActivity) {
                                if(err){ callback(err); }
                                else{ callback(null, createdActivity, activityChat, user); }
                            });
                        }
                        else{ callback(new Error("can't save user changes")); }
                    });
            },
            function(createdActivity, activityChat, user, callback){
                ChatBroker.createChatBox(createdActivity.creator, createdActivity._id, function(err){
                    if(err){callback(err)}
                    else{ callback(null, createdActivity, activityChat, user) }
                })
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
                var activityCopy = common.deepObjClone(createdActivity);
                var creator = {
                    _id: user._id,
                    surname: user.surname,
                    imageUrl: user.imageUrl,
                    familyName: user.familyName
                };
                activityCopy['creator'] = creator;
                activityCopy.joinedUsers = [creator];
                activityCopy['tags'] = createdActivity.tagsByLanguage;

                callbackDone(null, activityCopy);
            }
        })
};

function userIn(userId, activityId, callbackDone){
    async.waterfall([
            function(callback){
                Activity.findOne({_id: activityId}, function(err, resAct){
                    if(err){ callback(err); }
                    else if(common.isEmpty(resAct)){ callback(new Error('Activity is not found')); }
                    else{ callback(null, resAct) }
                });
            },
            function(resAct, callback){
                if(!common.existInArray(resAct.joinedUsers, userId)){ callback(null, resAct) }
                else{ callback(new Error('user already join activity')); }
            },
            function(resAct, callback){
                Activity.findOneAndUpdate({ _id: resAct._id },
                    {
                        $push: { joinedUsers: userId }
                    },
                    {new: true})
                    .populate('creator', CREATOR_FIELDS)
                    .populate('joinedUsers', JOINED_USERS_FIELDS)
                    .populate('followingUsers', JOINED_USERS_FIELDS)
                    .exec(function (err, changedAct) {
                        if (err) { callback(err) }
                        else {
                            if(changedAct.maxMembers < 21 && changedAct.joinedUsers.length > changedAct.maxMembers){
                                Activity.findOneAndUpdate({ _id: resAct._id },
                                    {$pull: {joinedUsers: userId}},
                                    function (err) {
                                        if(err){ callback(err); }
                                        else{callback(new Error('no spots left')); }
                                    });
                            }
                            else{
                                Socket.addToChat(userId, resAct._id);
                                callback(null, changedAct);
                            }
                        }
                    });
            },
            function(resAct, callback){
                User.findByIdAndUpdate(userId,
                    { $push:{ activitiesJoined: activityId }, $inc:{ activityJoinedNumber: 1 } },
                    { upsert: true, new: true }, function(err, resUser){
                        if (err) { callback(err); }
                        else if (common.isEmpty(resUser)) { callback(new Error('User is not found')); }
                        else {
                            var message = resUser.surname + JOINED;
                            var messageForPush = resUser.surname + JOINED + resAct.title;
                            Socket.sendNewMember(NOSOLO_ID, NOSOLO_NAME, resAct._id, message, resUser._id, messageForPush);
                            callback(null, resAct, resUser);

                        }
                    });
            },
            function(resAct, resUser, callback){
                if(resUser.settings.isSendReminder && resUser.settings.multipleReminders &&
                    resUser.settings.multipleReminders.length > 0){
                    common.setMultipleReminder(resUser, resAct, callback);
                }
                else if(resUser.settings.isSendReminder && resUser.settings.reminderTime > 0){
                    common.setReminder(resUser, resAct, callback);
                }
                else{ callback(null, resAct); }
            }
        ],
        function(err, resAct){
            if(err){ callbackDone(err) }
            else{
                callbackDone(null, resAct);
            }
        });
};

function sendUpdateNtf(activity, creatorSurname, changedFields, oldActivity){
    if(!common.isEmpty(changedFields)){
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
                                        console.log('Push message', pushMsg);
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
                    Socket.sendToCreator(activity.creator._id, NOSOLO_ID, NOSOLO_NAME, activity._id, resultMessage, null, true);
                }
            })

        }
    }
};

function getTimeComponents(time){
    //console.log('timeParams init', time);
    var timeParams = null;
    var day = null;
    var date = null;

    var timeDif = common.getTimeDifference(time);
    var difference = timeDif.daysDiff;
    var isSameWeek = timeDif.isSameWeek;
    var hours = timeDif.hours;
    var minutes = timeDif.minutes;
    var weekDay = timeDif.weekDay;
    var formattedDate = timeDif.formattedDate;

    if(difference < 0){ day = STARTED; }
    else if(difference == 0){ day = TODAY; }
    else if(difference < 2 ){ day = TOMORROW }
    else if(isSameWeek){ day = weekDay; }
    else{ date = formattedDate; }

    if(day && difference >= 0){
        timeParams = [{ commandId: day }, { commandId: AT }, { param: hours }, { param: ':' }, { param: minutes }];
    }
    else if(day && difference < 0){
        timeParams = [{ commandId: day }];
    }
    else if(date){
        timeParams = [{ commandId: ON }, { param: date }, { commandId: AT },
            { param: hours }, { param: ':' }, { param: minutes }];
    }
    //console.log('timeParams result', timeParams);
    return timeParams;
};

function createInviteMessage(userId, activityId, isParticipant, callbackDone){
    async.waterfall([
            //check user language
            function(callback){
                User.findById(userId, 'systemLanguage', function(err, resUser){
                    if(err){ callback(err); }
                    else if(!common.isEmpty(resUser)){ callback(null, resUser.systemLanguage); }
                    else{ callback(new Error('user not found')); }
                })
            },
            //find activity
            function(userLang, callback){
                Activity.findById(activityId, function(err, resActivity){
                    if(err){ callback(err); }
                    else if(!common.isEmpty(resActivity)){ callback(null, userLang, resActivity); }
                    else{ callback(new Error('activity not found')) }
                })
            },
            //create message
            function(userLang, resActivity, callback){
                //console.log('create message to invite', isParticipant);
                var commandId = isParticipant? GOING: INTERESTING_IN;
                var messageComponents = [
                    {commandId: commandId},
                    {param: resActivity.title}
                ];
                var time = null;
                /*if(resActivity.localTimeStart){
                 time = resActivity.localTimeStart;
                 }*/
                //else{
                var date = new Date(resActivity.timeStart);
                time = date;
                //}
                var timeComponents = getTimeComponents(time);
                var resMessageParams = messageComponents.concat(timeComponents);
                resMessageParams.push({ param: WHITESPACE });
                var resMessage = createMessage(userLang, resMessageParams);
                callback(null, resMessage);
            }
        ],
        function(err, resMessage){
            if(err){ callbackDone(err); }
            else{ callbackDone(null, resMessage); }
        })

};