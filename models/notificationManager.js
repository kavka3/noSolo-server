/**
 * Created by comp on 3/19/2015.
 */
var log = require('../lib/log.js')(module),
    connection = require('../lib/db.js').connection,
    async = require('async'),
    common = require('../lib/commonFunctions.js'),
    NotificationBox = require('../lib/redisConnection.js').client,
    LocalStorage = [],
    SocketStorage = [],
    User = connection.model('NoSoloUser')
  ;



function getIds(users){
    var udids = [];
    if(!common.isEmpty(users)){
        for(var i = 0; i < users.length; i++){
            if(users[i]['settings']['isNtfApproved'] && users[i].uniqueDeviceId){
                for(var j = 0; j < users[i].uniqueDeviceId.length; j++ ){
                    var deviceId = users[i].uniqueDeviceId[j];
                    deviceId['systemLanguage'] = users[i].systemLanguage;
                    udids.push(deviceId);
                }
            }
        }
    }
    return udids;
};

function getIdsToOne(user){
    var udid = [];
    if(user != null){
        if(user['settings']['isNtfApproved']){
            for(var j = 0; j < user.uniqueDeviceId.length; j++ ){
                udid.push(user.uniqueDeviceId[j]);
            }
        }
    }
    return udid;
};

var NotificationManager = {
    clearRedis: function(callback){
        NotificationBox.del('chat_socketIds', NotificationBox.print);
        NotificationBox.del('socket_chatIds', NotificationBox.print);
        NotificationBox.hgetall('chat_socketIds', function(result){
            console.log(result);
            callback();
        });
    },

    /*addToBox: function(userId, socketId){
        //NotificationBox[userId] = socketId;
        NotificationBox.hmset('user_socketIds', userId, socketId, redis.print);
        NotificationBox.hmset('socket_userIds', socketId, userId, redis.print);
        NotificationBox.hmget('user_socketIds', userId, function(err, resId){
            if(err){log.error(err); }
            else{ log.info('SOCKET ADDED TO BOX: ' + userId + ' ' + resId); }
        });
        LocalStorage.push(socketId);
    },*/

    addToSocketBox: function(userId, socketId){
        NotificationBox.hmset('chat_socketIds', userId, socketId, NotificationBox.print);
        NotificationBox.hmset('socket_chatIds', socketId, userId, NotificationBox.print);
        NotificationBox.hmget('chat_socketIds', userId, function(err, resId){
            if(err){log.error(err); }
            else{ log.info('SOCKET ADDED TO SOCKET BOX: ' + userId + ' ' + resId); }
        });
        SocketStorage.push(socketId);
    },

    removeFromSocketBox: function(socketId, callbackDone){
        async.series([
                function(callback){
                    NotificationBox.hget('socket_chatIds', socketId, function(err, userId){
                        if(err){ callback(err); }
                        else{
                            NotificationBox.hdel('chat_socketIds', userId, function(){
                                NotificationBox.print;
                                log.info('USER LEAVE APP: ' + userId);
                            });
                            NotificationBox.hdel('socket_chatIds', socketId, function(){
                                NotificationBox.print;
                                log.info('SOCET CLEARED: ' + userId);
                                callback();
                            });
                        }
                    });
                },
                function(callback){
                    //NotificationBox.hdel('socket_chatIds', socketId, redis.print);
                    var index = SocketStorage.indexOf(socketId);
                    if(index > -1){
                        SocketStorage.splice(index, 1);
                    }
                    callback();
                }
            ],
            function(err){
                if(err){ callbackDone(err); }
                else{ callbackDone(); }
            });

    },
    //checked
    clearLocal: function(callback){
        var iterator = function(socketId, callbackI){
                NotificationManager.removeFromSocketBox(socketId, function(err){
                    if(err){ callbackI(err); }
                    else{ callbackI(); }
                })
            };
        async.eachSeries(LocalStorage, iterator, function(err){
            if(err){ callback(err); }
            else{ console.log('CLEAR DONE');callback(); }
        });
    },

    chatBoxToOne: function(userId, callback){
        log.info('IN CHATBOX', userId);
        if(userId){
            NotificationBox.hmget('chat_socketIds', userId, function(err, socketAddress){
                if(err){ log.error(err); callback(err) }
                else{
                    //log.info('SOCKET FOUND');
                    if(socketAddress[0] != null){
                        console.log('SOCKET FOUND', socketAddress);
                        callback(null, socketAddress);
                    }
                    else{
                        console.log('SOCKET NOT FOUND');
                        callback(null, null);
                    }
                }
            });
        }
        else{
            log.error('chatBoxToOne: there is no userId');
            callback(new Error('no user Id in chatbox'));
        }

    },

    chatBoxToGroup: function(userIds, callbackDone){
        async.waterfall([
                function(callback){
                    NotificationBox.hkeys('chat_socketIds', function(err, boxKeys){
                        if(err){ callback(err); }
                        else{ callback(null,boxKeys) }
                    });
                },
                function(boxkeys, callback){
                    var notInSystem = [],
                        inSystem = [];
                    inSystem = common.getArraysIntersection(userIds, boxkeys);
                    notInSystem = common.getArraysDifference(userIds, boxkeys);
                    callback(null, inSystem, notInSystem);
                },
                function(inSystem, notInSystem, callback){
                    if(inSystem && inSystem.length > 0){
                        NotificationBox.hmget('chat_socketIds', inSystem, function(err, groupBox){
                            if(err){ callback(err); }
                            else{ callback(null, groupBox, notInSystem ); }
                        });
                    }
                    else{ callback(null, null, notInSystem );  }
                }
            ],
            function(err, groupBox, notInSystem){
                if(err){ callbackDone(err); }
                else{
                    log.info('box created');
                    if(groupBox && groupBox.length > 0){
                        callbackDone(null, groupBox, notInSystem);
                    }
                    else{
                        callbackDone(null, null, notInSystem);
                    }
                }
            });
    },

   /* getBox: function(users, callback){
        var usersInBox = Object.keys(NotificationBox);
        var usersNotInSystem = common.arrayDifference(users, usersInBox);
        callback(usersInBox, usersNotInSystem);
    },*/

    addToSystemBox: function(notificationId, userId){
        NotificationBox.sadd(notificationId, userId);
    },

   /* getSystemBox: function(notificationId){
        if(SystemNotificationBox[notificationId]){
            return(SystemNotificationBox[notificationId]);
        }
        else return [];
    },*/

    getNotInSystem: function(notificationId, users, callback){
        NotificationBox.smembers(notificationId, function(err, inSystem){
            if(err){ log.error(err); }
            else{
                NotificationBox.DEL(notificationId, NotificationBox.print);
                callback(common.arrayDifference(users, inSystem));
            }
        });
       /* var notInSystem = [];
        if(SystemNotificationBox[notificationId]){
            notInSystem = common.arrayDifference(users, SystemNotificationBox[notificationId]);
        }
        return notInSystem;*/
    },

    removeNotifications: function(userId, notifications, callback){
        User.findById(userId, function(err, resUser){
            if(err){
                log.error('IN REMOVE NTF',err.message);
                callback(err);
            }
            else{
                var notificationsId = [];
                for(var i = 0; i < notifications.length; i++){
                    if(notifications[i] != null){
                        notificationsId.push(notifications[i]['_id']);
                    }
                }
                var resNotification = common.arrayDifference(notificationsId, resUser.notifications);
                if(!resNotification){ resNotification = []; }
                resUser.notifications = resNotification;
                resUser.save(function(err, result){
                    if(err){
                        log.error('IN REMOVE NTF',err.message);
                        callback(err);
                    }
                    else{
                        callback(null);
                    }
                })
            }
        })
    },

    getDeviceIds: function(userIds, callback) {
        if( Object.prototype.toString.call( userIds ) === '[object Array]' ){
            User.find({ '_id': {$in: userIds } }
                , function (err, resUsers){
                    if(err){
                        log.info(err.message);
                        callback(err);
                    }
                    else{
                        //console.log('getDeviceIds', resUsers);
                        var devicesIds = getIds(resUsers);
                        callback(null, devicesIds);
                    }
                }
            );
        }
        else{
            User.findOne({ _id: userIds }, function(err, resUser){
                if(err){
                    log.info(err.message);
                    callback(err);
                }
                else{
                    //log.info('in user find:');
                    //console.log(resUser);
                    var devicesIds = getIdsToOne(resUser);
                    callback(null, devicesIds);
                }
            })
        }


    }



};

module.exports = NotificationManager;


