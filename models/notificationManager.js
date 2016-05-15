/**
 * Created by comp on 3/19/2015.
 */
var connection = require('../lib/db.js').connection,
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
    addToSocketBox: function(userId, socketId){
        NotificationBox.hmset('chat_socketIds', userId, socketId, NotificationBox.print);
        NotificationBox.hmset('socket_chatIds', socketId, userId, NotificationBox.print);
        NotificationBox.hmget('chat_socketIds', userId, function(err, resId){
            if(err){console.error(err); }
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
                            });
                            NotificationBox.hdel('socket_chatIds', socketId, function(){
                                NotificationBox.print;
                                callback();
                            });
                        }
                    });
                },
                function(callback){
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
    clearLocal: function(callback){
        var iterator = function(socketId, callbackI){
                NotificationManager.removeFromSocketBox(socketId, function(err){
                    if(err){ callbackI(err); }
                    else{ callbackI(); }
                })
            };
        async.eachSeries(LocalStorage, iterator, function(err){
            if(err){ callback(err); }
        });
    },
    chatBoxToOne: function(userId, callback){
        if(userId){
            NotificationBox.hmget('chat_socketIds', userId, function(err, socketAddress){
                if(err){ callback(err) }
                else{
                    if(socketAddress[0] != null){
                        callback(null, socketAddress);
                    }
                    else{ callback(null, null); }
                }
            });
        }
        else{
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
                    if(groupBox && groupBox.length > 0){
                        callbackDone(null, groupBox, notInSystem);
                    }
                    else{
                        callbackDone(null, null, notInSystem);
                    }
                }
            });
    },
    addToSystemBox: function(notificationId, userId){
        NotificationBox.sadd(notificationId, userId);
    },
    removeNotifications: function(userId, notifications, callback){
        User.findById(userId, function(err, resUser){
            if(err){ callback(err); }
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
                    if(err){ callback(err); }
                    else{ callback(null); }
                })
            }
        })
    },
    getDeviceIds: function(userIds, callback) {
        if( Object.prototype.toString.call( userIds ) === '[object Array]' ){
            User.find({ '_id': {$in: userIds } }
                , function (err, resUsers){
                    if(err){ callback(err); }
                    else{
                        var devicesIds = getIds(resUsers);
                        callback(null, devicesIds);
                    }
                }
            );
        }
        else{
            User.findOne({ _id: userIds }, function(err, resUser){
                if(err){ callback(err); }
                else{
                    var devicesIds = getIdsToOne(resUser);
                    callback(null, devicesIds);
                }
            })
        }
    }
};

module.exports = NotificationManager;


