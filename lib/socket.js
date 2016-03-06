var log = require('./log.js')(module),
    async = require('async'),
    common = require('./commonFunctions.js'),
    url = require('url'),
    redis = require('redis'),
    adapter = require('socket.io-redis'),
    User = require('../models/userOperations.js'),
    ChatManager = require('../models/chatBroker.js'),
    Notify = require('../models/notificationManager.js'),
    Pusher = require('./apns.js'),
    Activity = require('../data/activitySchema.js'),
    SocketOperations = null,
    incr = 0
    ;

var DELAY = 10000,
    MESSAGES_LIMIT = 999,
    CHAT_CLOSED = 'chat is closed by activity creator',
    ADD_TO_CHAT = 'addToChat',
    REMOVE_FROM_CHAT = 'remove from chat',
    SOCKET_ID = 0,
    CHAT_ID = 1,
    USER_ID = 2,
    DELIM = ';'
    ;

var io, chatSocket, notifySocket,
    chatSocketKeeper,
    newMessagesKeeper = {},
    socketAdapter = {},
    newNotifyKeeper = {},
    RedisSender,
    RedisReceiver;

function setAdapter(){
    if(!common.isEmpty(process.env.REDISCLOUD_URL)){
        log.info('in set adapter heroku');
        var redisURL = url.parse(process.env.REDISCLOUD_URL );
        var client = redis.createClient;
        var pub = client(redisURL.port, redisURL.hostname, { auth_pass: redisURL.auth.split(":")[1] });
        var sub = client(redisURL.port, redisURL.hostname, { detect_buffers: true, auth_pass: redisURL.auth.split(":")[1] });
        socketAdapter = io.adapter(adapter({ pubClient: pub, subClient: sub }));
        RedisSender = client(redisURL.port, redisURL.hostname, { auth_pass: redisURL.auth.split(":")[1] });
        RedisReceiver = client(redisURL.port, redisURL.hostname, { auth_pass: redisURL.auth.split(":")[1] });
    }
    else{
        log.info('in set adapter local');
        socketAdapter = io.adapter(adapter({ host: 'localhost', port: 6379 }));
        RedisSender = redis.createClient();
        RedisReceiver = redis.createClient();
    }
    RedisReceiver.subscribe(ADD_TO_CHAT);
    RedisReceiver.subscribe(REMOVE_FROM_CHAT);
    RedisReceiver.on('message', function (channel, message){
        log.info('IN REDIS RECEIVER: ');
        console.log(message);
        var params = message.split(DELIM);
        if(channel == ADD_TO_CHAT){
            addToChat(params[SOCKET_ID], params[CHAT_ID], params[USER_ID]);
        }else if(channel == REMOVE_FROM_CHAT){
            removeFromChat(params[SOCKET_ID], params[CHAT_ID]);
        }
    });
};
//checked
function joinChats(userId, socket){
    User.findUser(userId, function (err, user, affected){
        if (err){
            socket.emit('chat joined', {result: 'error', data: err.message});
        }
        else {
            var resultMessages = [];
            var iteratorI = function (userChat, callbackI){
                var chatMessages = {};
                ChatManager.getUnreadMessages(userChat, user._id, /*socket.id,*/ function (err, messages, isClosed){
                    if (err && err.message != 'Chat is not found'){
                        log.error(err.message);
                        callbackI(err);
                    }
                    else {
                        if(/*messages && */!isClosed){
                            chatMessages = {chatId: userChat, messages: messages};
                            resultMessages.push(chatMessages);
                        }
                        if(!isClosed){
                            //log.info('User join chat: ' + userChat);
                            socket.join(userChat, function(err){
                                if (err){ callbackI(err); }
                                else{ callbackI(); }
                            });
                        }
                        else{ log.info('chat is closed'); callbackI(); }


                    }
                })
            };
            async.series([
                    function (callback) {
                        if(user.activitiesJoined){
                            async.each(user.activitiesJoined, iteratorI, function(err){
                                if (err){ log.error(err);callback(err); }
                                else{ callback(); }
                            })
                        }
                        else{callback(new Error('user data is incorrect')); }
                    },
                    function(callback) {
                        log.info('user socket connect success');
                        newMessagesKeeper['userId'] = userId;
                        newMessagesKeeper['messages'] = resultMessages;
                        socket.emit('chat joined', {result: 'success', data: resultMessages});
                        callback();
                    }
                ]
                ,function(err){
                    if(err){
                        log.error(err.message);
                        socket.emit('chat joined', {result: 'error', data: err.message});
                    }
                })

        }
    });
};

/*function addUserToBox(userId, socketId){
    Notify.addToBox(userId, socketId);
};*/

function addToSocketBox(userId, socketId){
Notify.addToSocketBox(userId, socketId)
};

/*function removeFromBox(socketId){
    Notify.removeFromBox(socketId, function(err){
        if(err){ log.error(err); }
        else{ ; }
    });
};*/

function removeFromChatBox(socketId){
    Notify.removeFromSocketBox(socketId, function(err){
        if(err){ log.error(err); }
        else{ ; }
    })
};
//checked

function saveForOne(userId, notificationId){//TODO change for one transaction
    User.pushNtf(userId, notificationId, function(err, ntf){
        if(err){ log.error(err.message + ' user: ' + userId + ' notifyId: ' + notificationId) }
        else{ /*log.info('NTF SAVED: '); console.log(result)*/ }
    });
    /*User.findUser(userId, function(err, resUser){
        if(err){ log.error(err); }
        else{
            resUser.notifications.push(notificationId);
            User.universalUserUpdate(resUser, function(err, result){
                if(err){ log.error(err.message + ' user: ' + userId + ' notifyId: ' + notificationId) }
                else{ log.info('NTF SAVED: '); console.log(result) }
            })
        }
    });*/

};

function saveForGroup(addresses, notifyId){
    log.info('SAVE FOR GROUP');
    console.log(addresses);
    for(var i = 0; i < addresses.length; i++){
        saveForOne(addresses[i], notifyId);
    }
};

function getSocket(socketId){
    log.info('IN GET SOCKET');
    for(var i = 0; i < io['nsps']['/']['sockets'].length; i++) {
        console.log("IN FOR: " + io['nsps']['/']['sockets'][i]['id']);
        if(io['nsps']['/']['sockets'][i]['id'] == socketId) { return  io['nsps']['/']['sockets'][i]; }
    }
    return null;
};

function removeFromChat(socketId, chatId){
    var socket = getSocket(socketId);
    if(!common.isEmpty(socket)){
        socket.leave(chatId);
        log.info('user leave chat: ' + chatId);
    }
    else{log.info('socket not found: ' + socketId); }
}

function addToChat(socketId, chatId, userId){
    var socket = getSocket(socketId);
    if(!common.isEmpty(socket)){
        log.info('user join chat: ' + chatId);
        socket.join(chatId);
        ChatManager.addUserToChat(chatId, userId, function(err, messages){
            if(err){
                log.error(err);
                socket.emit('new chat added', { result: 'error', data: err.message });
            }
            else{
                console.log('new chat added', messages);
                socket.emit('new chat added', {result: 'success', data:{ chatId: chatId, messages: messages } });
            }
        });
       /* ChatManager.getUnreadMessages(chatId, userId, function(err, messages){
            if(err){socket.emit('new chat added', { result: 'error', data: err.message }) }
            else{ socket.emit('new chat added', {result: 'success', data:{chatId: chatId, messages: messages } }); }
        });*/
    }
    else{
        log.error('there is no socket available: ' + userId + ' ' + chatId);
    }
};

//in this version for everybody check arch from 30.06 to previous
function sendNtfToChat(message){
    async.waterfall([
            function(callback){
                Activity.findById(message.chatId, function(err, resAct){
                    if(err){ callback(err); }
                    else{
                        if(!common.isEmpty(resAct)){
                            var index = resAct.joinedUsers.indexOf(message.creator);
                            log.info('SEND NTF TO CHAT:', index);
                            if(index > -1){ resAct.joinedUsers.splice(index, 1); }
                            callback(null, resAct.joinedUsers)
                        }
                        else{ callback(new Error('In save ntf for chat: ' + message.chatId + ' activity not found') ); }
                    }
                })
            },
            function(users, callback){
                Notify.getDeviceIds(users, function(err, udIds){
                    if(err){ callback(err); }
                    else{
                        if(!common.isEmpty(udIds)){ Pusher.sendMessage(udIds, message); }
                        callback(null);
                    }
                })
            }
        ],
        function(err){
            if(err){ log.error(err); }
        });

};

function getMsgId(userId){
    var timeStamp = Math.floor(Date.now() / 1000) + incr++;
    console.log('SocketSevise messadeId: ', userId + timeStamp);
    return userId + 'S' + timeStamp;
};

//checked
function sendMessageToChat(userId, userName, chatId, message, messageId, isNtf, notForCreator, messageForPush, messageType, imageUrl, tbNlImageUrl, messageTime){
    console.log('NOW IN CHAT: ', io['nsps']['/']['adapter']['rooms'][chatId]);
    //var inChat = io['nsps']['/']['adapter']['rooms'][chatId];
    if(common.isEmpty(io['nsps']['/']['sockets'])){ log.error('Socket is empty'); }
    else{
        var msgIdChecked = messageId;
        if(!messageId){ msgIdChecked = getMsgId(userId); }
        var type = messageType? messageType: 'text';
        var messageText = message,
            pushMsg = messageForPush;

        if(messageType == 'image'){
            pushMsg = userName + ' send a photo';
            messageText = ' send a photo';
        }
        var url = imageUrl? imageUrl: null;
        ChatManager.createMessage(userId, userName, chatId, messageText, msgIdChecked, notForCreator, type, url, tbNlImageUrl, messageTime, function(err, resultMessage){
            if(err){
                log.error(err);
                io.to(chatId).emit('error message', err.message);
            }
            else{
                console.log('SOCKET sendMessageToChat', resultMessage);
                io.to(chatId).emit('message for everybody', resultMessage);
                if(isNtf && !messageForPush){ sendNtfToChat(resultMessage); }
                else{
                    var pushMessage = ChatManager.createPushMessage(userId, userName, chatId, pushMsg);
                    sendNtfToChat(pushMessage);
                }
            }
        });
    }
};

function sendMessageToCreator(socketId, chatId, message, userId, userName, creatorId, pushMessage,
                              messageType, imageUrl, tbNlImageUrl, messageTime){
    if(common.isEmpty(io['nsps']['/']['sockets'])){ log.error('Socket is empty'); }
    else{
        var messageId = getMsgId(userId);
        //userId, userName, chatId, message, messageId, notForCreator, messageType, imageUrl, tbNlImageUrl, callback
        var notForCreator = { notForCreator : false, activityCreator: creatorId, notForOthers: true},
            type = messageType? messageType: "text";
        ChatManager.createMessage(userId, userName, chatId, message, messageId, notForCreator, type, imageUrl, tbNlImageUrl, messageTime,
            function(err, resultMessage){
            if(err){
                log.error(err);
                io.to(chatId).emit('error message', err.message);
            }
            else{
                io.to(socketId).emit('message for everybody', resultMessage);
                if(pushMessage){
                    var finalPush = ChatManager.createPushMessage(userId, userName, chatId, pushMessage);
                    sendPushToOne(creatorId, finalPush);
                }
                else{
                    sendPushToOne(creatorId, resultMessage);
                }

                //sendNtfToChat(/*chatId,*//*inChat,*/ resultMessage);//in this version for everybody check arch from 30.06 to previous
            }
        });
    }

};

function sendPushToOne(creatorId, message){
    Notify.getDeviceIds(creatorId, function(err, udId){
        if(err){ log.error(err); }
        else{
            Pusher.sendMessage(udId, message);
        }
    })
};

var socketModule = {
    sendToRedis: function(msg){
        RedisSender.publish('instances', 'start');
    },

    socketObj: function(server) {
        io = require('socket.io').listen(server);
        io.set('transports', ['websocket']);
        setAdapter();
        SocketOperations = require('../models/SocketOperations.js');
        /*chatSocket = io.of('/chat');
        notifySocket = io.of('/notifications');*/

        io.on('connection', function(socket){
            socket.emit('response', {result: "success"});
            //chatSocketKeeper = socket;
            log.info('socket connected: ' + socket.id);
                //console.log(io['nsps']['/']['sockets'][0].id);

            socket.on('join data', function(data){
                log.info('join data', data.userId);
                SocketOperations.sendMyActivities(data.userId, function(err, resActs){
                    if(err){
                        log.error(err);
                        socket.emit('my activities', { result: 'error', data: err })
                    }
                    else{
                        //log.info('SOCKET My Activities: ', resActs);
                        //console.log(activities);
                        socket.emit('my activities', { result: 'success', data: resActs })
                    }
                })
            });

            socket.on('join chats', function(data){
                log.info('user and socket in chat: ' + data.userId + ' ' + socket.id);
                joinChats(data.userId, socket);
                addToSocketBox(data.userId, socket.id);
                log.info('socket connected to chat: ' + socket.id);
            });

            socket.on('join notify', function(data){
                log.info('user and socket in notify: ' + data.userId + ' ' + socket.id);
                Notify.getAllNotifications(data.userId, function(err, notifications){
                    if(err){ log.error(err.message); }
                    else{ socket.emit('unread notifications', { result: 'success', data: notifications }); }
                });
            });

            socket.on('new message', function(data){
                console.log('socket new message: ', data);
                //userId, userName, chatId, message, messageId, isNtf, notForCreator, messageForPush, messageType, imageUrl, tbNlImageUrl, messageTime
                sendMessageToChat(data.creator, data.userName, data.chatId, data.messageText, data._id, true, false, false,
                    data.messageType, data.imageUrl, data.tbNlImageUrl, data.messageTime);
            });

            socket.on('got message', function(data){
                log.info('userId, chatId, messageId: ' + data.userId, + ' ' + data.chatId + ' ' + data.messageId);
                ChatManager.addMessageResponse(data, function(err, result){
                    if(err){
                        ;
                    }
                });
            });

            socket.on('echoConnected', function(data){
                log.info('got check from test client', data);
            });

            socket.on('echoMessage', function(data){
                log.info('echoSent', data);
                socket.emit('test server', data);
            });

            socket.on('got notification', function(data){
                if(Object.prototype.toString.call( newNotifyKeeper[data.notificationId] ) === '[object Array]'){
                    if(newNotifyKeeper[data.notificationId].length == 1){
                        delete(newNotifyKeeper[data.notificationId]);
                        log.info('GOT NOTIFICATION. REMOVE IT');
                        console.log(data);
                    }else{
                        var index = newNotifyKeeper[data.notificationId].indexOf(data.notificationId);
                        newNotifyKeeper[data.notificationId].splice(index, 1);
                        log.info('GOT NOTIFICATION. REMOVE IT');
                        console.log(data);
                    }
                }
                else{
                    delete(newNotifyKeeper[data.notificationId]);
                    log.info('GOT NOTIFICATION. REMOVE IT');
                    console.log(data);
                }
            });

            socket.on('got all messages', function(data){
                log.info('client get all messages: ' + data.userId);
                /*ChatManager.messageBoxUpdate(newMessagesKeeper, function(err){
                    if(err){
                        log.error(err.message);
                    }
                    else{
                        log.info('messages updated');
                    }
                });*/
            });

            socket.on('disconnect', function(){
                removeFromChatBox(socket.id);
            });

            socket.on('got all notifications', function(data){
                Notify.removeNotifications(data.userId, data.data, function(err){
                    if(err){ ; }
                    else{ log.info('notifications removed: ' + data.userId); }
                });
            });

            socket.on('got system notification', function(data){
                log.info('got from system: ' + data.notificationId + data.userId);
                Notify.addToSystemBox(data.notificationId, data.userId);
            });
        });


    },

    sendMyActivityUpdate: function(activityId, response, discoveredUsers){
        //console.log('Sending activity update', response);
        io.to(activityId).emit('my activities update', response);
    },

    sendMyActivityDelete: function(activityId, response){
        console.log('Sending activity delete', response);
        io.to(activityId).emit('my activities delete', response);
    },

    sendMyActivityAdd: function(userId, activity){
        Notify.chatBoxToOne(userId, function(err, socketId){
            if(err){ log.error(err); }
            else{
                log.info('sendMyActivityAdd', userId, socketId);
                io.to(socketId).emit('my activities add', {result: 'success', data: activity});
            }
        })
    },

    sendMyActivityLeave: function(userId, activityId, title, creator, time){
        Notify.chatBoxToOne(userId, function(err, socketId){
                if(err){ log.error(err); }
                else{
                    log.info('sendMyActivityLeave', userId, socketId);
                    io.to(socketId).emit('my activities leave', {
                        result: 'success',
                        data: {
                            activityId: activityId,
                            title: title,
                            creator: creator,
                            time: time
                        }
                    });
                }
        })
    },

    notifyToOne: function(notification, callback){
        console.log('IN NOTIFY TO ONE: ', notification.addressee);
        Notify.chatBoxToOne(notification.addressee, function(err, socketAddress){
            if(err){ callback(err); }
            else{
                //console.log('IN CHATBOX RES: ', socketAddress);
                if(!common.isEmpty(socketAddress)){
                    log.info(' IN CHATBOX RES send notify to socket: ' + socketAddress);
                    io.to(socketAddress).emit('notification', notification);
                    newNotifyKeeper[notification._id] = notification.addressee;
                    if(callback){ callback(null); }
                }
                else {
                    //if(notification.notificationType != 1){//because type 1 was already saved in notifyActions: like activity
                    saveForOne(notification.addressee, notification._id);
                    //console.log('IN CHATBOX RES NTF SAVED FOR ONE: ', notification);
                    if(callback){ callback(null); }
                    //}
                    //var message = Pusher.setMessage(notification);//sdf

                }
                //console.log('IN CHATBOX RES AFTER LOOP: ');
                Notify.getDeviceIds(notification.addressee, function (err, udid) {
                    if (err) { callback(err); }
                    else {
                        Pusher.sendNtf(udid, notification, function (result) {
                            log.info('push done');
                            if(callback){ callback(null); }
                        })
                    }
                });
            }
        });
    },

    notifyToGroup: function(notification){
        Notify.chatBoxToGroup(notification.addressee, function(err, groupBox, notInSystem){
            if(err){ log.error(err); }
            else{
                if(groupBox){
                    for(var i = 0; i < groupBox.length; i++){
                        log.info('send notify to socket: ' + groupBox[i]);
                        io.to(groupBox[i]).emit('notification', notification);
                        newNotifyKeeper[notification._id] = groupBox;
                    }
                }
                console.log('IN RESPONSE FROM get box: ' + notInSystem);
                saveForGroup(notInSystem, notification._id);
                //var message = Pusher.setMessage(notification);
                Notify.getDeviceIds(notification.addressee, function(err, udids){
                    if(err){log.error(err); }
                    else{
                        Pusher.sendNtf(udids, notification);
                    }
                });
            }
        })
    },

    notifyToAll: function(users, notification){
        log.info('IN notify to all');
        io.emit('notification from system', notification);
        Notify.getDeviceIds(users, function(err, udids){
            if(udids.length < 999){
                Pusher.sendNtf(udids, notification, function(result){
                    log.info('push done');
                })
            }
            else{
                var length = Math.round( (udids.length/MESSAGES_LIMIT) );
                var index = 0;
                for(var i = 0; i < length; i++){
                    var udidsSlice = udids.slice(index, MESSAGES_LIMIT);
                    Pusher.sendNtf(udidsSlice, notification, function(result){
                        log.info('push done');
                    });
                    index += MESSAGES_LIMIT;
                }
            }
        });
        /*setTimeout( function(){
                Notify.getNotInSystem(notification._id, users, function(err, notInSystem){
                    if(err){ log.error(err); }
                    else{
                        if(notInSystem.length > 0){
                            //var message = Pusher.setMessage(notification);
                            Notify.getDeviceIds(notInSystem, function(err, udids){
                                if(udids.length < 999){
                                    Pusher.sendNtf(udids, notification, function(result){
                                        log.info('push done');
                                    })
                                }
                                else{
                                    var length = Math.round( (udids.length/MESSAGES_LIMIT) );
                                    var index = 0;
                                    for(var i = 0; i < length; i++){
                                        var udidsSlice = udids.slice(index, MESSAGES_LIMIT);
                                        Pusher.sendNtf(udidsSlice, notification, function(result){
                                            log.info('push done');
                                        });
                                        index += MESSAGES_LIMIT;
                                    }
                                }
                            });
                        }
                        else{
                            log.info('there are no addresses to push');
                        }
                    }
                });
            }
            ,DELAY);*/
    },

    removeFromChat: function(userId, chatId){
        Notify.chatBoxToOne(userId, function(err, socketId){
            if(err){ log.info('socket not found: ' + userId); }
            else{
                var message = socketId + DELIM + chatId + DELIM + userId;
                RedisSender.publish(REMOVE_FROM_CHAT, message);
            }
        });
    },

    addToChat: function(userIds, chatId){
        if(Object.prototype.toString.call(userIds) != '[object Array]'){
            log.info('IN ADD TO CHAT: ' + userIds);
            Notify.chatBoxToOne(userIds, function(err, socketId){
                log.info('IN GET BOX RESULT: ');
                console.log(socketId);
                if(socketId === 'socket not found' || common.isEmpty(socketId))
                { log.info('socket not found: ' + userIds); }
                else{
                    //addToChat( socketId[0], chatId, userIds);
                    console.log('IN ADD TO CHAT:', socketId);
                    var message = socketId + DELIM + chatId + DELIM + userIds;
                    RedisSender.publish(ADD_TO_CHAT, message);
                }
            });
        }
        else{
            Notify.chatBoxToGroup(userIds, function(err, socketIds, notInSystem){
                if(err){log.error(err); }
                else if(socketIds){
                    for(var userId in socketIds){
                        //addToChat(socketIds[userId], chatId, userId);
                        var message = socketIds[userId] + DELIM + chatId + DELIM + userId;
                        RedisSender.publish(ADD_TO_CHAT, message);
                    }
                }
            })
        }
    },

    sendToChat: function(userId, userName, chatId, message, sendNtf, notForCreator, pushMessage){
        //userId, userName, chatId, message, messageId, isNtf, notForCreator, messageForPush, messageType, imageUrl, tbNlImageUrl, messageTime
        sendMessageToChat(userId, userName, chatId, message, null, sendNtf, notForCreator, pushMessage, null, null, null, null);
    },
    //uses as send message to chat to any single user
    sendToCreator: function(userId, noSoloId, noSoloName, chatId, message, pushMessage){
        Notify.chatBoxToOne(userId, function(err, socketId){
            if(err){ log.error(err); }
            else{
                log.info('IN SEND MESSAGE TO CREATOR',socketId, chatId, message, userId, noSoloName);
                //socketId, chatId, message, userId, userName, creatorId, pushMessage,messageType, imageUrl, tbNlImageUrl, messageTime
                sendMessageToCreator(socketId, chatId, message, noSoloId, noSoloName, userId, pushMessage, null, null, null, null);
            }
        })

    },

    sendToOthers: function(message, chatId, activityCreator){
        //userId, userName, chatId, message, messageId, isNtf, notForCreator, messageForPush, messageType, imageUrl
        sendMessageToChat('100009647204771', 'noSolo', chatId, message, false, true,
            { notForCreator: true, activityCreator: activityCreator }, null, null, null);
    },

    sendNewMember: function(noSoloId, nosoloName, chatId, message, userId, messageForPush){
        //userId, userName, chatId, message, messageId, isNtf, notForCreator, messageForPush, messageType, imageUrl, tbNlImageUrl, messageTime
        sendMessageToChat(noSoloId, nosoloName, chatId, message, false, false,
            { notForCreator: false, joinedUser: userId }, messageForPush, null, null, null, null);
    },

    chatClosed: function(chatId, userIds, creatorId, title, creatorName){
        Notify.chatBoxToGroup(userIds, function(err, socketIds){
            if(err){log.error(err); }
            else{
                if(!common.isEmpty(socketIds) && chatId != undefined && io != undefined){
                    io.to(chatId).emit('chat closed', {result: 'success', data:{ chatId: chatId, messages: null, creatorId: creatorId, activityTitle: title, creatorName: creatorName } });
                    for(var i = 0; i < socketIds.length; i++){
                        var socket = getSocket(socketIds[i]);
                        if(!common.isEmpty(socket)){
                            socket.leave(chatId);
                            log.info('chat closed: ' + chatId);
                        }
                        else{log.info('socket not found: ' + socketIds[i]); }
                    }
                }

            }
        })
    },

    closeConnection: function(){
        console.log('TRYING TO CLOSE SOCKET');
        io.close();
        console.log('SOCKET CLOSED');
    }
};

module.exports = socketModule;




