//global variables and constants
{
    var async = require('async'),
        common = require('./commonFunctions.js'),
        adapter = require('socket.io-redis'),
        url = require('url'),
        redis = require('redis'),
        User = require('../models/userOperations.js'),
        ChatManager = require('../models/chatBroker.js'),
        socketManager = require('../models/socketManager.js'),
        Pusher = require('./apns.js'),
        Activity = require('../data/activitySchema.js'),
        SocketOperations = null,
        incr = 0,
        ADD_TO_CHAT = 'addToChat',
        REMOVE_FROM_CHAT = 'remove from chat',
        SOCKET_ID = 0,
        CHAT_ID = 1,
        USER_ID = 2,
        DELIM = ';',
        io,
        RedisSender,
        RedisReceiver
        ;
}

module.exports = {
    socketObj: function(server) {
        io = require('socket.io').listen(server);
        io.set('transports', ['websocket']);
        setAdapter();
        SocketOperations = require('../models/SocketOperations.js');
        io.on('connection', function(socket){
            socket.emit('response', {result: "success"});

            socket.on('join data', function(data){
                SocketOperations.sendMyActivities(data.userId, function(err, resActs){
                    if(err){
                        console.error(err);
                        socket.emit('my activities', { result: 'error', data: err })
                    }
                    else{
                        var isFirstLoad = data.isFirstLoad? data.isFirstLoad: false;
                        joinChats(data.userId, socket, resActs, isFirstLoad);
                        addToSocketBox(data.userId, socket.id);
                    }
                })

            });

            socket.on('new message', function(data){
                sendMessageToChat(data.creator, data.userName, data.chatId, data.messageText, data._id, true, false, false,
                    data.messageType, data.imageUrl, data.tbNlImageUrl, data.messageTime);
            });

            socket.on('got message', function(data){
                ChatManager.addMessageResponse(data, function(err, result){
                    if(err){
                        console.error(err);
                    }
                });
            });

            socket.on('disconnect', function(){
                removeFromSocketBox(socket.id);
            });

            socket.on('get support chats', function(data){

                function joinIterator(chat, callbackI){
                    socket.join(chat._id, function(err){
                        if (err){ callbackI(err); }
                        else{ callbackI(); }
                    });
                };

                var result = {
                    result: 'success',
                    data: []
                };

                ChatManager.getSupportChats(data.adminId, function(err, resChats){
                    if(err){
                        result.result = 'error';
                        result.data = err;
                    }
                    else{
                        async.eachSeries(resChats, joinIterator, function(err, res){
                            if(err){
                                console.error(err);
                                result.result = 'error';
                                result.data = err;
                            }
                            else{
                                result.data = resChats;
                                socket.emit('support chats',result);
                            }
                        });
                    }

                });
            });
        });

    },

    sendMyActivityUpdate: function(activityId, response){
        io.to(activityId).emit('my activities update', response);
    },

    sendMyActivityDelete: function(activityId, response){
        io.to(activityId).emit('my activities delete', response);
    },

    sendMyActivityLeave: function(userId, activityId, title, creator, time, callback){
        socketManager.chatBoxToOne(userId, function(err, socketId){
            if(err){ console.error(err); }
            else{
                io.to(socketId).emit('my activities leave', {
                    result: 'success',
                    data: {
                        activityId: activityId,
                        title: title,
                        creator: creator,
                        time: time
                    }
                });
                callback(null);
            }
        })
    },

    removeFromChat: function(userId, chatId){
        socketManager.chatBoxToOne(userId, function(err, socketId){
            if(err){ console.log('socket not found: ' + userId); }
            else{
                var message = socketId + DELIM + chatId + DELIM + userId;
                removeFromChat(socketId, chatId);
                RedisSender.publish(REMOVE_FROM_CHAT, message);
            }
        });
    },

    addToChat: function(userIds, chatId, callback){
        if(Object.prototype.toString.call(userIds) != '[object Array]'){
            socketManager.chatBoxToOne(userIds, function(err, socketId){
                if(socketId === 'socket not found' || common.isEmpty(socketId))
                { console.log('socket not found: ' + userIds); }
                else{
                    var message = socketId + DELIM + chatId + DELIM + userIds;
                    RedisSender.publish(ADD_TO_CHAT, message);
                }
            });
        }
        else{
            socketManager.chatBoxToGroup(userIds, function(err, socketIds, notInSystem){
                if(err){console.error(err); }
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

    sendToOne: function(userId, noSoloId, noSoloName, chatId, message, pushMessage, isCreator){
        socketManager.chatBoxToOne(userId, function(err, socketId){
            if(err){ console.error(err); }
            else{
                //socketId, chatId, message, userId, userName, creatorId, pushMessage,messageType, imageUrl, tbNlImageUrl, messageTime
                sendMessageToOne(socketId, chatId, message, noSoloId, noSoloName, userId, pushMessage, null, null, null, null, isCreator);
            }
        })

    },

    sendNewMember: function(noSoloId, nosoloName, chatId, message, userId, messageForPush){
        //userId, userName, chatId, message, messageId, isNtf, notForCreator, messageForPush, messageType, imageUrl, tbNlImageUrl, messageTime
        sendMessageToChat(noSoloId, nosoloName, chatId, message, false, false,
            { notForCreator: false, joinedUser: userId }, messageForPush, null, null, null, null);
    },

    chatClosed: function(chatId, userIds, creatorId, title, creatorName){
        socketManager.chatBoxToGroup(userIds, function(err, socketIds){
            if(err){console.error(err); }
            else{
                if(!common.isEmpty(socketIds) && chatId != undefined && io != undefined){
                    io.to(chatId).emit('chat closed', {result: 'success', data:{ chatId: chatId, messages: null, creatorId: creatorId, activityTitle: title, creatorName: creatorName } });
                    for(var i = 0; i < socketIds.length; i++){
                        var socket = getSocket(socketIds[i]);
                        if(!common.isEmpty(socket)){
                            socket.leave(chatId);
                        }
                        else{console.log('socket not found: ' + socketIds[i]); }
                    }
                }

            }
        })
    },

    closeConnection: function(){ io.close(); }
};

function setAdapter(){
    if(!common.isEmpty(process.env.REDISCLOUD_URL)){
        var redisURL = url.parse(process.env.REDISCLOUD_URL );
        var client = redis.createClient;
        RedisSender = client(redisURL.port, redisURL.hostname, { auth_pass: redisURL.auth.split(":")[1] });
        RedisReceiver = client(redisURL.port, redisURL.hostname, { auth_pass: redisURL.auth.split(":")[1] });
        //set socket adapter for multi-nodes
        var pub = client(redisURL.port, redisURL.hostname, { auth_pass: redisURL.auth.split(":")[1] });
        var sub = client(redisURL.port, redisURL.hostname, { detect_buffers: true, auth_pass: redisURL.auth.split(":")[1] });
        io.adapter(adapter({ pubClient: pub, subClient: sub }));
    }
    else{
        RedisSender = redis.createClient();
        RedisReceiver = redis.createClient();
        io.adapter(adapter({ host: 'localhost', port: 6379 }));
    }
    RedisReceiver.subscribe(ADD_TO_CHAT);
    RedisReceiver.subscribe(REMOVE_FROM_CHAT);
    RedisReceiver.on('message', function (channel, message){
        var params = message.split(DELIM);
        if(channel == ADD_TO_CHAT){
            addToChat(params[SOCKET_ID], params[CHAT_ID], params[USER_ID]);
        }else if(channel == REMOVE_FROM_CHAT){
            removeFromChat(params[SOCKET_ID], params[CHAT_ID]);
        }
    });
};

function joinChats(userId, socket, resActs, isFirstLoad){
    User.findUser(userId, function (err, user){
        if (err){
            socket.emit('chat joined', {result: 'error', data: err.message});
        }
        else {
            var resultMessages = [];
            var iteratorI = function (userChat, callbackI){
                var chatMessages = {};
                ChatManager.getUnreadMessages(userChat, user._id, isFirstLoad, function (err, messages, isClosed){
                    if (err && err.message != 'Chat is not found'){
                        callbackI(err);
                    }
                    else {
                        if(!isClosed){
                            if(!common.isEmpty(messages)){
                                chatMessages = {chatId: userChat, messages: messages};
                                resultMessages.push(chatMessages);
                            }
                            socket.join(userChat, function(err){
                                if (err){ callbackI(err); }
                                else{ callbackI(); }
                            });
                        }
                        else{ callbackI(); }
                    }
                })
            };

            async.series([
                    function (callback) {
                        if(!common.isEmpty(user) && user.activitiesJoined){
                            async.each(user.activitiesJoined, iteratorI, function(err){
                                if (err){ callback(err); }
                                else{ callback(); }
                            })
                        }
                        else{callback(new Error('user data is incorrect')); }
                    },
                    function(callback) {
                        socket.emit('my activities', {
                            result: 'success',
                            data: {
                                activities: resActs,
                                chats: resultMessages
                            }
                        });
                        callback();
                    }
                ]
                ,function(err){
                    if(err){
                        console.error(err.message);
                        socket.emit('my activities', {result: 'error', data: err.message});
                    }
                })

        }
    });
};

function addToSocketBox(userId, socketId){
    socketManager.addToSocketBox(userId, socketId)
};

function removeFromSocketBox(socketId){
    socketManager.removeFromSocketBox(socketId, function(err){
        if(err){ console.error(err); }
    })
};

function getSocket(socketId){
    for(var i = 0; i < io['nsps']['/']['sockets'].length; i++) {
        if(io['nsps']['/']['sockets'][i]['id'] == socketId) {
            return  io['nsps']['/']['sockets'][i];
        }
    }
    return null;
};

function removeFromChat(socketId, chatId){
    var socket = getSocket(socketId);
    if(!common.isEmpty(socket)){
        socket.leave(chatId);
    }
    else{console.log('socket not found: ' + socketId); }
}

function addToChat(socketId, chatId, userId){
    var socket = getSocket(socketId);
    if(!common.isEmpty(socket)){
        socket.join(chatId);
        ChatManager.getUnreadMessages(chatId, userId, true, function(err, messages){
            if(err){
                socket.emit('new chat added', { result: 'error', data: err.message })
            }
            else{
                socket.emit('new chat added', {result: 'success', data:[{chatId: chatId, messages: messages }]});
            }
        });
    }
    else{
        console.log('there is no socket available: ' + userId + ' ' + chatId);
    }
};

function sendNtfToChat(message){
    async.waterfall([
            function(callback){
                Activity.findById(message.chatId, function(err, resAct){
                    if(err){ callback(err); }
                    else{
                        if(!common.isEmpty(resAct)){
                            var index = resAct.joinedUsers.indexOf(message.creator);
                            if(index > -1){ resAct.joinedUsers.splice(index, 1); }
                            callback(null, resAct.joinedUsers)
                        }
                        else{ callback(new Error('In save ntf for chat: ' + message.chatId + ' activity not found') ); }
                    }
                })
            },
            function(users, callback){
                socketManager.getDeviceIds(users, function(err, udIds){
                    if(err){ callback(err); }
                    else{
                        if(!common.isEmpty(udIds)){ Pusher.sendMessage(udIds, message); }
                        callback(null);
                    }
                })
            }
        ],
        function(err){
            if(err){ console.error(err); }
        });

};

function getMsgId(userId){
    var timeStamp = Math.floor(Date.now() / 1000) + incr++;

    return userId + 'S' + timeStamp;
};

function sendMessageToChat(userId, userName, chatId, message, messageId, isNtf, notForCreator, messageForPush, messageType, imageUrl,
                           tbNlImageUrl, messageTime){
    if(!common.isEmpty(io['nsps']['/']['sockets'])){
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
                console.error(err);
                io.to(chatId).emit('error message', err.message);
            }
            else{
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

function sendMessageToOne(socketId, chatId, message, userId, userName, creatorId, pushMessage,
                              messageType, imageUrl, tbNlImageUrl, messageTime, isCreator){
    if(!common.isEmpty(io['nsps']['/']['sockets'])){
        var messageId = getMsgId(userId);
        //userId, userName, chatId, message, messageId, notForCreator, messageType, imageUrl, tbNlImageUrl, callback
        var notForCreator = { notForCreator : false, activityCreator: creatorId, notForOthers: true},
            type = messageType? messageType: "text";
        ChatManager.createMessage(userId, userName, chatId, message, messageId, notForCreator, type, imageUrl, tbNlImageUrl, messageTime,
            function(err, resultMessage){
                if(err){
                    console.error(err);
                    io.to(chatId).emit('error message', err.message);
                }
                else{
                    if(isCreator){
                        resultMessage = common.deepObjClone(resultMessage);
                        resultMessage['isNotInAppNtf'] = true;
                    }
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
    socketManager.getDeviceIds(creatorId, function(err, udId){
        if(err){ console.error(err); }
        else{
            Pusher.sendMessage(udId, message);
        }
    })
};