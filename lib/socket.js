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
    incr = 0
    ;

var DELAY = 10000,
    MESSAGES_LIMIT = 999,
    CHAT_CLOSED = 'chat is closed by activity creator',
    ADD_TO_CHAT = 'addToChat',
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
    RedisReceiver.on('message', function (channel, message){
        if(channel == ADD_TO_CHAT){
            log.info('IN REDIS RECEIVER: ');
            console.log(message);
            var params = message.split(DELIM);
            addToChat(params[SOCKET_ID], params[CHAT_ID], params[USER_ID]);
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

function addToChat(socketId, chatId, userId){
    var socket = getSocket(socketId);
    if(!common.isEmpty(socket)){
        log.info('user join chat: ' + chatId);
        socket.join(chatId);
        ChatManager.addUserToChat(chatId, userId, function(err){
            if(err){
                log.error(err);
                socket.emit('new chat added', { result: 'error', data: err.message });
            }
            else{ socket.emit('new chat added', {result: 'success', data:{ chatId: chatId, messages: null } }); }
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
function sendNtfToChat(/*chatId,*//*inChat,*/ message){
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
function sendMessageToChat(userId, userName, chatId, message, messageId, isNtf, notForCreator){
    console.log('NOW IN CHAT: ', io['nsps']['/']['adapter']['rooms'][chatId]);
    //var inChat = io['nsps']['/']['adapter']['rooms'][chatId];
    if(common.isEmpty(io['nsps']['/']['sockets'])){ log.error('Socket is empty'); }
    else{
        var msgIdChecked = messageId;
        if(!messageId){ msgIdChecked = getMsgId(userId); }
        ChatManager.createMessage(userId, userName, chatId, message, msgIdChecked, notForCreator, function(err, resultMessage){
            if(err){
                log.error(err);
                io.to(chatId).emit('error message', err.message);
            }
            else{
                io.to(chatId).emit('message for everybody', resultMessage);
                if(isNtf){  sendNtfToChat(resultMessage); }
            }
        });
    }
};

function sendMessageToCreator(socketId, chatId, message, userId, userName, creatorId){
    if(common.isEmpty(io['nsps']['/']['sockets'])){ log.error('Socket is empty'); }
    else{
        var messageId = getMsgId(userId);
        ChatManager.createMessage(userId, userName, chatId, message, messageId, { notForCreator : false, activityCreator: creatorId, notForOthers: true },
            function(err, resultMessage){
            if(err){
                log.error(err);
                io.to(chatId).emit('error message', err.message);
            }
            else{
                io.to(socketId).emit('message for everybody', resultMessage);
                //sendNtfToChat(/*chatId,*//*inChat,*/ resultMessage);//in this version for everybody check arch from 30.06 to previous
            }
        });
    }

};

var socketModule = {
    sendToRedis: function(msg){
        RedisSender.publish('instances', 'start');
    },

    socketObj: function(server) {
        io = require('socket.io').listen(server);
        io.set('transports', ['websocket']);
        setAdapter();
        /*chatSocket = io.of('/chat');
        notifySocket = io.of('/notifications');*/

        io.on('connection', function(socket){
            socket.emit('response', {result: "success"});
            //chatSocketKeeper = socket;
            log.info('socket connected: ' + socket.id);
                //console.log(io['nsps']['/']['sockets'][0].id);

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
                log.info('new message: ' + data);
                sendMessageToChat(data.creator, data.userName, data.chatId, data.messageText, data._id, true);
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
                ChatManager.messageBoxUpdate(newMessagesKeeper, function(err){
                    if(err){
                        log.error(err.message);
                    }
                    else{
                        log.info('messages updated');
                    }
                });
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

    notifyToOne: function(notification, callback){
        console.log('IN NOTIFY TO ONE: ', notification.addressee);
        Notify.chatBoxToOne(notification.addressee, function(err, socketAddress){
            if(err){ callback(err); }
            else{
                console.log('IN CHATBOX RES: ', socketAddress);
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
                console.log('IN CHATBOX RES AFTER LOOP: ');
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
                var socket = getSocket(socketId);
                if(!common.isEmpty(socket)){
                    socket.leave(chatId);
                    log.info('user leave chat: ' + userId, + ' ' + chatId);
                }
                else{log.error('socket not found: ' + socketId); }
            }
        });
    },

    addToChat: function(userIds, chatId, callbackDone){
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
                    RedisSender.publish(ADD_TO_CHAT, message,function(err, result){
                        if(err){
                            log.error(err);
                            if(callbackDone){ callbackDone(err); }
                        }
                        else{
                            log.info('User added to chat: ' + result);
                            if(callbackDone){ callbackDone(null); }
                        }
                    });
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

    sendToChat: function(userId, userName, chatId, message, sendNtf){
        sendMessageToChat(userId, userName, chatId, message, sendNtf);
    },
    //uses as send message to chat to any single user
    sendToCreator: function(userId, noSoloId, noSoloName, chatId, message){
        Notify.chatBoxToOne(userId, function(err, socketId){
            if(err){ log.error(err); }
            else{
                log.info('IN SEND MESSAGE TO CREATOR',socketId, chatId, message, userId, noSoloName);
                sendMessageToCreator(socketId, chatId, message, noSoloId, noSoloName, userId);
            }
        })

    },

    sendToOthers: function(message, chatId, activityCreator){
        sendMessageToChat('100009647204771', 'noSolo', chatId, message, false, true,
            { notForCreator: true, activityCreator: activityCreator });
    },

    sendNewMember: function(noSoloId, nosoloName, chatId, message, userId){
        sendMessageToChat(noSoloId, nosoloName, chatId, message, false, false,
            { notForCreator: false, joinedUser: userId });
    },

    chatClosed: function(chatId, userIds){
        Notify.chatBoxToGroup(userIds, function(err, socketIds){
            if(err){log.error(err); }
            else{
                io.to(chatId).emit('chat closed', {result: 'success', data:{ chatId: chatId, messages: null } });
                if(!common.isEmpty(socketIds)){
                    for(var i = 0; i < socketIds.length; i++){
                        var socket = getSocket(socketIds[i]);
                        if(!common.isEmpty(socket)){
                            socket.leave(chatId);
                            log.info('chat closed: ' + chatId);
                        }
                        else{log.error('socket not found: ' + socketIds[i]); }
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




