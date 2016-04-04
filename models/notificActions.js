/**
 * Created by comp on 3/21/2015.
 */

var log = require('../lib/log.js')(module),
    connection = require('../lib/db.js').connection,
    async = require('async'),
    common = require('../lib/commonFunctions.js'),
    User = connection.model('NoSoloUser'),
    Notification = require('./../data/notificationSchema.js'),
    Socket = require('../lib/socket.js'),
    Activity = connection.model('NoSoloActivity'),
    Chat = connection.model('NoSoloChat'),
    ChatBroker = require('./chatBroker.js'),
//notification types
    LIKE_ACTIVITY = 1,
    JOIN_ACTIVITY = 2,
    REJECT_ACTIVITY = 3,
    ACTIVITY_UPDATED = 4,
    MESSAGE_FROM_SYSTEM = 5,
    REMOVED_FROM_ACTIVITY = 6,
    USER_JOINS_ACTIVITY = 7,
    USER_LEAVE_ACTIVITY = 8,
    ACTIVITY_RECUR = 9,
    REJECT_RECUR = 10,
    UPDATE_APP = 11,
    ACTIVITY_REMINDER = 12,
//recurStatus:
    /*JOINED = 1,
    DISCLAIMED = 2,*/
    NOSOLO_ID = '100009647204771',
    NOSOLO_NAME = 'noSolo',
    JOINED = ' joined ',
    JOINED_USERS_FIELDS = '_id surname familyName imageUrl birthDate gender about activityCreatedNumber activityJoinedNumber',
    CREATOR_FIELDS = '_id surname familyName imageUrl'
/*,
 SHOULD_FIND = 'find it in FES',
 FIND_ACT = 'find activity and join'*/
    ;

function changeRecurStatus(recurUsersObj, userId, status){
    var recurUsers = common.deepObjClone(recurUsersObj);
    for(var i = 0; i < recurUsers.length; i++){
        if(recurUsers[i].userId == userId){
            recurUsers[i].recurStatus = status;
        }
    }
    return recurUsers;
};

function createSpecialData(user, activityId){
    var resUser = common.deepObjClone(user);
    delete resUser.activitiesCreated;
    delete resUser.activitiesDisliked;
    delete resUser.activitiesLiked;
    delete resUser.activitiesJoined;
    delete resUser.settings;
    delete resUser.noSoloId;
    delete resUser.notifications;
    delete resUser.socialToken;
    delete resUser.uniqueDeviceId;
    delete resUser.__v;

    resUser['activityId'] = activityId;
    resUser['userId'] = user._id;

    return resUser;
};

//has been changed: add activityLiked processing, sends notification to group
function addUserToActivity(activityCreator, activityId, userId, isRecur, callbackDone){
    async.waterfall([
            function(callback){
                Activity.findOne({_id: activityId}, function(err, resAct, affected){
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
                if(!activityCreator && resAct.isApprovalNeeded){
                    callback(new Error('need to approve'));
                }
                else{
                    callback(null, resAct);
                }
            },
            function(resAct, callback){
                    //log.info('notificActions IN ADD USER TO ACTIVITY');
                    Activity.findOneAndUpdate({ _id: resAct._id },
                        {
                            $push: { joinedUsers: userId },
                            $pull: { followingUsers: userId }
                        },
                        {new: true}) //, upsert: true, runValidators: true
                        .populate('creator', CREATOR_FIELDS)
                        .populate('joinedUsers', JOINED_USERS_FIELDS)
                        .populate('followingUsers', JOINED_USERS_FIELDS)
                        .exec(function (err, changedAct) {
                            if (err) {
                                callback(err)
                            }
                            else {
                                if(changedAct.joinedUsers.length > changedAct.maxMembers){
                                    Activity.findOneAndUpdate({ _id: resAct._id },
                                        {$pull: {joinedUsers: userId}},
                                        {upsert: true}, function (err, canceledUpdate) {
                                            if(err){
                                                log.error('notificActions IN Remove USER FROM ACTIVITY: Cant update activity ', canceledUpdate._id);
                                                callback(err);
                                            }
                                            else{callback(new Error('no spots left')); }
                                        })
                                }
                                else{
                                    console.log('USER ADDED TO ACTIVITY ', changedAct.title);
                                    callback(null, changedAct);

                                }
                            }
                        });

                /*resAct.joinedUsers.push(userId);
                if(isRecur){ resAct.recurUsers = changeRecurStatus(resAct.recurUsers, userId, JOINED); }
                Socket.addToChat(userId, resAct._id);
                resAct.save(function(err) {
                    if(err){ callback(err) }
                    else{ callback(null, resAct) }
                });*/
            },
            function(resAct, callback){
                ChatBroker.createChatBox(userId, activityId, function(err){
                    if(err){ callback(err); }
                    else{callback(null, resAct); }
                })
            },
            function(resAct, callback){
                Socket.addToChat(userId, resAct._id);
                callback(null, resAct);
            },
            function(resAct, callback){
                User.findByIdAndUpdate(userId,
                    { $push:{ activitiesJoined: activityId },
                        $pull: { activitiesLiked: { activityId: activityId } }, $inc:{ activityJoinedNumber: 1 } },
                    { upsert: true, new: true }, function(err, resUser){
                        if (err) { callback(err); }
                        else if (common.isEmpty(resUser)) { callback(new Error('User is not found')); }
                        else {
                            var specialData = createSpecialData(resUser, activityId);
                            specialData['joiningActivityTitle'] = resAct.title;
                            /*var sendUser = common.deepObjClone(resUser);
                            sendUser['activityId'] = activityId;*/
                            /*var notification =
                                Notification({ creator: resAct.creator, addressee: resAct.creator
                                    , notificationType: USER_JOINS_ACTIVITY, specialData: specialData });
                            notification.save(function(err){ if(err)log.error(err.message) });
                            Socket.notifyToOne(notification);*/
                            var message = resUser.surname + JOINED;
                            var messageForPush = resUser.surname + JOINED + resAct.title;
                            //Socket.sendToChat(NOSOLO_ID, NOSOLO_NAME, resAct._id, message, false);
                            Socket.sendNewMember(NOSOLO_ID, NOSOLO_NAME, resAct._id, message, resUser._id, messageForPush);
                            /*setTimeout(function(){
                                //message for joiner not for creator
                                Socket.sendToCreator(userId, NOSOLO_ID, NOSOLO_NAME, activityId, 'You joined.');
                            }, 2000);*/
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

function getAllUsers(callback){
    User.find({}, '_id', function(err, users, affected){
        if(err){ callback(err); }
        else{
            var usersIds = [];
            for(var i = 0; i < users.length; i++){
                usersIds.push(users[i]._id);
            }
            callback(null, usersIds);
        }
    })
}

module.exports =  NotificationOperations = {
    likeActivity: function(userId, activityId, activityCreator, message, creatorSurname, title, callbackRes){
        async.waterfall([
                function(callback){
                    User.findByIdAndUpdate(userId,  { $push: { activitiesLiked: { activityId: activityId
                            , isApproved: false } } },
                        { safe: true, upsert: true, new: true }, function(err, resUser){
                            if(err){ callback(err); }
                            else{ callback(null, resUser); }
                        })
                },
                function(user, callback){
                    var specialData = createSpecialData(user, activityId);
                    specialData['creatorSurname'] = creatorSurname;
                    specialData['joiningActivityTitle'] = title;
                    specialData['message'] = message;
                    var newNotify = Notification({ creator: userId , addressee: activityCreator
                        , notificationType: LIKE_ACTIVITY, /*specialData: {  activityId: activityId, user: user*//*, joiningActivityTitle: SHOULD_FIND*/
                        specialData: specialData }); /*{ activityId: activityId, userId: user._id, imageUrl: user.imageUrl,
                        surname: user.surname, message: message, creatorSurname: creatorSurname, joiningActivityTitle: title } }*/
                    newNotify.save(function(err){
                        if(err){callback(err);}
                        else{callback(null, newNotify);}
                    })
                },
                /*function(notify, callback){
                    User.findByIdAndUpdate(activityCreator, { $push: { notifications: notify._id } },
                        {safe: true, upsert: true, new: true}, function(err, resUser){
                            if(err){ callback(err); }
                            else{ callback(null, notify);}
                        })
                },*/
                function(notify, callback){
                    Socket.notifyToOne(notify, function(err){
                        if(err){callback(err); }
                        else{ callback(null); }
                    })
                }
            ],
            function(err){
                if(err){
                    log.error(err);
                    callbackRes(err);
                }
                else{
                    console.log('LIKE ACTIVITY: success');
                    callbackRes(null);
                }
            })
    },

    joinApprove: function(activityCreator, joiningUser, activityId, notificationId, callbackResult){
        async.waterfall([
                function(callback){
                    addUserToActivity(activityCreator, activityId, joiningUser, false, function(err, resAct){
                        if(err){ callback(err); }
                        else{ callback(null, resAct); }
                    })
                },
                function(activity, callback){
                    if(activityCreator){
                        var notification = new Notification({ creator: activityCreator , addressee: joiningUser
                            , notificationType: JOIN_ACTIVITY, specialData: { activityId: activityId, activityTitle: activity.title } });
                        notification.save(function(err){ if(err)log.error(err.message) });
                        Socket.notifyToOne(notification, function(err){
                            if(err){ callback(err); }
                            else{ callback(null); }
                        })
                    }
                    else{ callback(null, activity); }
                }
            ],
            function(err, activity){
                if(err){
                    log.info(err);
                    callbackResult(err) ;
                }
                else{
                    callbackResult(null, activity);
                }
            }
        )
    },

    joinDisapprove: function(activityCreator, joiningUser, activityId, notificationId, activityTitle, callbackResult){
        async.series([
                function(callback){
                    User.findByIdAndUpdate(activityCreator, { $pull: {notifications: notificationId } },
                        function(err, result){
                            if(err){ callback(err); }
                            else{ callback(null);}
                        })
                },
                function(callback){
                    User.findByIdAndUpdate(joiningUser, {  $push: { activitiesDisliked: activityId  } },
                        function(err, result){
                            if(err){ callback(err); }
                            else{ callback(null) }
                        })
                },
                /*
                function(callback){
                    var notification = Notification({ creator: activityCreator , addressee: joiningUser
                        , notificationType: REJECT_ACTIVITY, specialData: {activityId: activityId,
                            joiningActivityTitle: activityTitle} });
                    notification.save(function(err){ if(err)log.error(err.message) });
                    Socket.notifyToOne(notification, function(err){
                        if(err){ callback(err); }
                        else{ callback(null); }
                    })
                }*/
            ],
            function(err){
                if(err){
                    log.info(err);
                    callbackResult(err) ;
                }
                else{
                    callbackResult(null);
                }
            }
        )
    },

    changeActivityNotify: function(activity, /*changes,*/ creatorName, addressee, ntfMessage){
        var specialData = common.deepObjClone(activity);
        specialData.activityId = activity._id;
        //specialData['changedFields'] = changes;
        specialData['creatorName'] = creatorName;
        specialData['ntfMessage'] = ntfMessage;

        var notification = Notification({ creator: activity.creator , addressee: addressee
            , notificationType: ACTIVITY_UPDATED, specialData: specialData });
        notification.save(function(err){ if(err)log.error(err.message) });
        Socket.notifyToGroup(notification);
    },
    //ntf to all users
    sendSystemMessage: function(message, title, callback){
        var notification = Notification({ creator: 'NoSolo', notificationType: MESSAGE_FROM_SYSTEM
            , specialData: {message: message, title: title} });
        log.info('New system message: ');
        console.log(notification);
        notification.save(function(err){
            if(err){
                log.error(err.message), callback(err)
            }
        });
        getAllUsers(function(err, users){
            if(err){
                log.error(err.message);
                callback(err);
            }
            else{
                Socket.notifyToAll(users, notification);
                callback(null);
            }
        })
    },

    messageToRemoved: function(userId, activityTitle/*, callbackRes*/){
        async.waterfall([
                function(callback){
                    var newNotify = Notification({ creator: 'NoSolo' , addressee: userId
                        , notificationType: REMOVED_FROM_ACTIVITY, specialData: activityTitle });
                    newNotify.save(function(err){
                        if(err){callback(err);}
                        else{callback(null, newNotify);}
                    })
                },
                function(notify, callback){
                    Socket.notifyToOne(notify, function(err){
                        if(err){ callback(err); }
                        else{ callback(null); }
                    })
                }
            ],
            function(err){
                if(err){
                    log.error(err.message);
                    /*callbackRes(err);*/
                }
                else{
                    log.info('message to removed sent');
                    /*callbackRes(null);*/
                }
            })

    },

    leaveActivity: function(activity, user){
      /*  var specialData = createSpecialData(user, activity._id);
        specialData['joiningActivityTitle'] = activity.title;
        var notification = Notification({ creator: activity.creator , addressee: activity.creator
            , notificationType: USER_LEAVE_ACTIVITY, specialData: specialData });
        notification.save(function(err){ if(err)log.error(err.message) });
        Socket.notifyToOne(notification);*/
        var message = user.surname + ' left';
        var pushMessage = user.surname + ' left ' + activity.title;
        Socket.sendToChat(NOSOLO_ID, NOSOLO_NAME, activity._id, message, false, false, pushMessage);
    },

    activityRecur: function(creatorId, activityId, recurUsers){
        var notification = Notification({ creator: creatorId , addressee: recurUsers
            , notificationType: ACTIVITY_RECUR, specialData: { activityId: activityId } });
        notification.save(function(err){
            if(err){log.error(err); }
            else{ Socket.notifyToGroup(notification); }
        });
    },

    recurConfirm: function(userId, activityId, callback){
        addUserToActivity(activityId, userId, true, function(err, resAct){
            if(err){callback(err);}
            else{
                callback(null, resAct);
            }
        })
    },

    recurReject: function(userId, activityId, callbackRes){
        async.waterfall([
                function(callback){
                    Activity.findById(activityId, function(err, resAct){
                        if(err){ callback(err); }
                        else{ callback(null, resAct); }
                    });
                },
                function(resAct, callback){
                    resAct.recurUsers = changeRecurStatus(resAct.recurUsers, userId, DISCLAIMED);
                    resAct.save(function(err){
                        if(err){ callback(err); }
                        else{ callback(null, resAct.creator); }
                    });
                },
                function(creator, callback){
                    var notification = Notification({ creator: creator , addressee: creator
                        , notificationType: REJECT_RECUR, specialData: {activityId: activityId} });
                    notification.save(function(err){
                        if(err){ callback(err); }
                        else{ callback(null, notification)}
                    });
                },
                function(notification, callback){
                    Socket.notifyToOne(notification, function(err){
                        if(err){callback(err)}
                        else{
                            callbackRes(null);
                            callback(null);
                        }
                    });
                }
            ],
            function(err){
                if(err){
                    log.error(err);
                    callbackRes(err);
                }
            }
        );
    },

    sendUpdateMessage: function(canContinue, message, iosLink, androidLink){
        async.waterfall([
                function(callback){
                    var newNotify = Notification({ creator: 'noSolo' , addressee: 'everybody'
                        , notificationType: UPDATE_APP,
                        specialData: { canContinue: canContinue,
                            message: message, iosLink: iosLink, androidLink: androidLink } });
                    newNotify.save(function(err, resNtf){
                        if(err){callback(err);}
                        else{callback(null, resNtf);}
                    })
                },
                function(ntfs, callback){
                    User.find({}, function(err, users, affected){
                        if(err){ callback(err); }
                        else{ callback(null, ntfs, users) }
                    })
                },
                function(ntf, users, callback){
                    var iterator = function(user, callbackI){
                        console.log('SAVING: ', ntf._id);
                        User.update({_id: user._id}, { $set: { 'notifications': ntf._id } }, { upsert: true },
                            function(err, res){
                                if(err){ callbackI(err); }
                                else{ console.log(res);callbackI(null) }

                            });
                        /*user.notifications.push(ntf._id);
                         console.log('USER: ', user);
                         user.save(function(err,rersult){
                         if(err){callbackI(err); }
                         else{callbackI(null); }
                         })*/
                    };
                    async.eachSeries(users, iterator, function(err, result){
                        if(err){ callback(err); }
                        else{ console.log('USERS UPDATED: ', result); callback(null); }
                    })
                    /*User.update({}, { $set: { 'notifications': ntf._id } }, { upsert: true },
                     function(err, res){
                     if(err){ callback(err); }
                     else{ console.log(res);callback(null) }

                     })*/
                }
            ],
            function(err){
                if(err){log.error(err); }
                else{ log.info('Notification saved'); }
            })
    },

    SystemNtftoOne: function(userId, message, title){
        var notification = Notification({ creator: NOSOLO_ID, addressee: userId, notificationType: MESSAGE_FROM_SYSTEM
            , specialData: {message: message, title: title, imageUrl: 'https://s3.amazonaws.com/nosoloimages/uicon.png'} });

        notification.save(function(err){
            if(err){
                log.error(err.message);
            }
            else{
                Socket.notifyToOne(notification, function(err){
                    if(err){ log.error(err); }
                })
            }
        });

    }
};




