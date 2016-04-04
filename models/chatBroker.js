var log = require('../lib/log.js')(module),
    async = require('async'),
    common = require('../lib/commonFunctions.js'),
    Chat = require('./../data/chatSchema.js'),
    Message = require('./../data/messageSchema.js'),
    User = require('./userOperations.js'),
    MessageBox = require('../data/messageBox.js'),

    CHAT_CLOSED = 'chat is closed by activity creator',
    NOT_ENOUGH_FIELDS = 'not enough fields',
    NOSOLO_CHAT = '198803877117851'
    ;


function saveMessage(response, resultChat, messageBox, callback){
    resultChat.messageBox = messageBox;
    resultChat.save(function(err){
        if(err){
            log.error('in save ' + err);
            callback(err);
        }
        else{
            log.info('response saved: ' + response.userId + ' ' + resultChat._id + ' ' + response.messageId);
            callback(null);
        }
    })
};

function updateMessageBox(userId, chatId, messageId, callback, messages){
    MessageBox.findOneAndUpdate(
        {
            chatId: chatId,
            userId: userId
        },
        {
            lastMessageId: messageId
        },
        function(err, result){
            if(err){callback(err); }
            else{ callback(null, messages); }
        }
    )
};


var ChatManager = {
    createChatBox: function(userId, chatId, callback){
        MessageBox.find(
            {
                userId: userId,
                chatId: chatId
            }
            ,function(err, resBox){
                if(err){ callback(err); }
                else if(common.isEmpty(resBox)){
                    var messageBox = new MessageBox({
                        userId: userId,
                        chatId: chatId,
                        lastMessageId: null
                    });
                    messageBox.save(function(err){
                        if(err){ callback(err); }
                        else{ callback(null); }
                    })
                }
                else{ callback(null); }
            });
    },
    addUserToChat: function(chatId, userId, callbackDone){
        async.waterfall([
            function(callback){
                Chat.findById(chatId, function(err, resChat){
                    if(err){ callback(err); }
                    else if(common.isEmpty(resChat)){ callback(new Error('Chat is not found')); }
                    else{ callback(null, resChat); }
                })
            },
            function(resChat, callback){
                var messages = resChat.messages;
                if(!common.isEmpty(messages)){
                    /*Chat.findOneAndUpdate({ _id: chatId },
                     { $push: { messageBox :{userId: userId, messageId: messages[messages.length - 1]}} }, { upsert: true },
                     function (err, result) {
                     if(err){callback(err); }
                     else{ callback(null, messages); }
                     }
                     );*/
                    updateMessageBox(userId, chatId, messages[messages.length - 1], callback, messages);
                }
                else{ callback(null,null); }
            },
            /*function(messages, callback){
                if(!common.isEmpty(messages)){
                    Message.find({_id: {'$in': messages}}, function(err, resMessages){
                        if(err){ callback(err); }
                        else{ callback(null, resMessages); }
                    })
                }
                else{ callback(null, null); }
            }*/
        ],
        function(err, messages){
            if(err){callbackDone(err); }
            else{ /*console.log('CHAT CHANGED: ', resChat);*/ callbackDone(null, []); }
        })
    },

    getUnreadMessages: function(chatId, userId, callbackRes){
        async.waterfall([
                function(callback){
                    MessageBox.find({
                            chatId: chatId,
                            userId: userId
                        }
                        ,function(err, resBox){
                            if(err){ callback(err); }
                            else if(common.isEmpty(resBox)){
                                callback(new Error('No user messageBox: ' + chatId + ' ' + userId));
                            }
                            else{ callback(null, resBox); }
                        })
                },
                function(userBox, callback){
                    Chat.findById(chatId, function(err, resChat){
                        if(err){ callback(err); }
                        else if(common.isEmpty(resChat)){
                            callback(new Error('No chat found: ' + chatId));
                        }
                        else{ callback(null, userBox, resChat) }
                    })
                },
                function(userBox, chat, callback){
                    var messageIds = chat.messages,
                        messagesForSearch = [];
                    if(!common.isEmpty(messageIds)){
                        if(userBox.lastMessageId){
                            var index = messageIds.indexOf(userBox.lastMessageId);
                            if(index > -1){
                                messagesForSearch = messageIds.slice(index);
                            }
                            else{
                                messagesForSearch = messageIds;
                            }
                        }
                        else{
                            messagesForSearch = messageIds;
                        }
                    }
                    callback(null, messagesForSearch, userBox);
                },
                function(messageIds, userBox, callback){
                    if(!common.isEmpty(messageIds)){
                        Message.find(
                            {
                                _id: {$in: messageIds}
                            },
                            function(err, resMessages){
                                if(err){ callback(err); }
                                else{ callback(null, resMessages, userBox) }
                            }
                        )
                    }
                    else{
                        callback(null,null, userBox);
                    }
                },
                function(messages, userBox, callback){
                    if(!common.isEmpty(messages)){
                        var lastMessage = messages[messages.length - 1];
                        MessageBox.findByIdAndUpdate(
                            userBox._id,
                            { lastMessageId: lastMessage._id },
                            function(err){
                                if(err){ callback(err); }
                                else{ callback(null, messages); }
                            }
                        )
                    }
                    else{ callback(null, messages); }
                }
            ],
        function(err, resMessages){
            if(err){
                log.error(err);
                callbackRes(err);
            }
            else{ callbackRes(null, resMessages); }
        });
    },

    createPushMessage: function(userId, userName, chatId, messageForPush){
        return {
            creator: userId,
            userName: userName,
            chatId: chatId,
            messageText: messageForPush
        }
    },

    createMessage: function(userId, userName, chatId, message, messageId, notForCreator, messageType, imageUrl, tbNlImageUrl, messageTime, callback){
        if(common.isEmpty(userId) || common.isEmpty(userName) || common.isEmpty(chatId) || (messageType == 'text' && common.isEmpty(message))){
            callback(new Error(NOT_ENOUGH_FIELDS));
        }
        else{
            var nfc = notForCreator ? notForCreator : { notForCreator : false, activityCreator: null, notForOthers: false, joinedUser: false };
            var time = messageTime? messageTime: new Date().getTime();
            console.log('CREATING MESSAGE', messageId, userId, userName, chatId, message, nfc );
            var message = new Message({
                _id: messageId,
                creator: userId,
                userName: userName,
                chatId: chatId,
                messageText: message,
                messageTime: time,
                notForCreator: nfc,
                messageType: messageType,
                imageUrl: imageUrl,
                tbNlImageUrl: tbNlImageUrl
            });
            console.log('MESSAGE CREATED',message);
            message.save(function(err){
                if(err){
                    log.error(err);
                    callback(err);
                }
                else{
                    Chat.findByIdAndUpdate(chatId,{ $push:{ messages: message._id } }, { new: true, upsert: true },
                        function(err, result){
                        if(err){
                            log.error(err);
                            callback(err);
                        }
                        else if(common.isEmpty(result)){
                            log.error('Chat is not found: ' + chatId);
                            callback(new Error('Chat is not found' + chatId));
                        }
                        else{
                            log.info('message saved: ' + message.messageText);
                            //console.log('chat params', result);
                            if(result.crm.isSupport && message.creator != NOSOLO_CHAT){
                                /*var changedCrm = result.crm;
                                changedCrm.isSeen = false;*/
                                Chat.findByIdAndUpdate(chatId, { $set: { 'crm.$.isSeen' : false } }, {new: true},
                                    function(err, resChat){
                                        if(err){ log.error(err); }
                                        else{ console.log('support chat updated', resChat._id); }
                                    })
                            }
                            callback(null, message);
                        }
                    });
                }
            })
        }
    },

    addMessageResponse: function(response, callback) {
        if(response.userId && response.chatId && response.messageId){
            updateMessageBox(response.userId, response.chatId, response.messageId, callback)
        }
        else{ callback(new Error('cannot save message response: ' + response.messageId + ',' + response.chatId)); }
    },

    /*messageBoxUpdate: function(data, callback){
        var iterator = function(chat, callbackI){
            if(!common.isEmpty(chat.messages) && chat.messages[chat.messages.length - 1]['_id'] != null){
                log.info('ADDING MESSAGE: ');
                console.log(chat.messages[chat.messages.length - 1]['_id']);
                Chat.findOneAndUpdate({ _id: chat.chatId, 'messageBox.userId': data.userId },
                    { $set: { 'messageBox.$.messageId': chat.messages[chat.messages.length - 1]['_id'] } }, { upsert: true },
                    function (err, result) {
                        if (err) {
                            callbackI(err);
                        }
                        else {
                            /!*log.info('response saved');
                            console.log(result);*!/
                            callbackI(null);
                        }
                    }
                );
            }
            else{
                callbackI(null);
            }
        };
        if(!common.isEmpty(data.messages)) {
            async.eachSeries(data.messages, iterator, function(err) {
                if(err) {
                    log.error(err);
                }
                log.info('messageBox changed');
                callback(null);
            });
        }
    },*/

    getSupportChats: function(userId, callbackDone){
        var uId = userId ? userId: NOSOLO_CHAT;
        var query = Chat
            .find({ usersInChat: uId }, '_id usersInChat messages crm')
            .populate('messages')
                .populate('usersInChat', '_id surname familyName imageUrl')

        ;
        query.exec(function(err, resChats){
            if(err){ callbackDone(err); }
            else{ callbackDone(null, resChats); }
        })
    },

    getChat: function(chatId, callbackDone){
        var query = Chat
                .findById(chatId, '_id usersInChat messages crm')
                .populate('messages')
                .populate('usersInChat', '_id surname familyName imageUrl')
            ;
        query.exec(function(err, resChat){
            if(err){ callbackDone(err); }
            else{ callbackDone(null, resChat); }
        })
    },

    updateSupportChat: function(chatId){
        Chat.findByIdAndUpdate(chatId, { $set: { 'crm.isSeen' : true } }, {new: true},
            function(err, resChat){
                if(err){ log.error(err); }
                else{ console.info('updateSupportChat support chat updated', resChat._id); }
            })
    }

};

module.exports = ChatManager;

/* 29.03.2016 change to separated messageBox
getUnreadMessages: function(chatId, userId, callbackRes){
    async.waterfall([
            function(callback){
                Chat.findById(chatId, function(err, resChat, affected){
                    if(err){ callback(err); }
                    else if(common.isEmpty(resChat)){ callback(new Error('Chat is not found')); }
                    else{
                        callback(null, resChat);
                    }
                });
            },
            function(chat, callback){
                if(!chat.chatStatus){
                    callback(null, new Message({messageText: CHAT_CLOSED}), true);
                }
                else if(chat.messages.length != 0){
                    var messageArray = null,
                        userBox = null;
                    for(var i = 0; i < chat.messageBox.length; i++){
                        if(chat.messageBox[i].userId == userId){
                            userBox = chat.messageBox[i];
                        }
                    }
                    if(!common.isEmpty(userBox) && !common.isEmpty(userBox.messageId)){
                        var messageInd = chat.messages.indexOf(userBox.messageId);
                        messageInd++;
                        //log.info('MESSAGE BOX CHECK id, indicator, msg-length : ' + chat._id + ' ' + messageInd + ' ' + chat.messages.length )
                        if(messageInd < chat.messages.length){
                            messageArray = chat.messages.slice(messageInd, chat.messages.length);
                        }
                        //callback(null, messageArray, null);
                    }
                    else{
                        messageArray = chat.messages;

                        /!*chat.messageBox.push({ userId: userId, messageId: null });
                         chat.save(function(err){
                         if(err){ callback(err); }
                         else{ log.info('user message box created: ' + userId); }
                         });*!/
                    }
                    if(userBox){
                        Chat.findOneAndUpdate({ _id: chatId, 'messageBox.userId': userId },
                            { $set: { 'messageBox.$.messageId': chat.messages[chat.messages.length - 1] } }, /!*{ upsert: true },*!/
                            function (err, result) {
                                if (err) {
                                    log.error(err);
                                    callback(err);
                                }
                                else {
                                    //log.info('user message box updated: ' + userId + ' ' + chatId);
                                    callback(null, messageArray, null);
                                }
                            }
                        );
                    }
                    else{
                        Chat.findOneAndUpdate({ _id: chatId },
                            { $push: { messageBox: { userId: userId, messageId: chat.messages[chat.messages.length - 1] } } },
                            function (err, result) {
                                if (err) {
                                    log.error(err);
                                    callback(err);
                                }
                                else {
                                    //log.info('user message box updated: ' + userId + ' ' + chatId);
                                    callback(null, messageArray, null);
                                }
                            }
                        );
                    }
                }
                else{
                    /!* log.info('there are no new messages for user: ' + userId + 'in chat: ' + chatId);*!/
                    callback(null, null, null);
                }
            },
            function(messageArray, isClosed, callback){
                var messages = [];
                var iteratorI = function(messageId, callbackI){
                    Message.findById(messageId, function (err, resMessage, affected){
                        if (err){ callback(err); }
                        else{
                            messages.push(resMessage);
                            callbackI();
                        }
                    });
                };
                if(!common.isEmpty(messageArray)){
                    async.eachSeries(messageArray, iteratorI, function (err) {
                        if(err){
                            log.error(err);
                        }
                        callback(null, messages, isClosed);
                    });
                }
                else{
                    callback(null, null, isClosed);
                }
            },
            function(messages, isClosed, callback){
                callbackRes(null, messages, isClosed);
                callback();
            }

        ],
        function(err){
            if(err){
                log.error(err);
                callbackRes(err);
            }
        });
}*/

/*
addMessageResponse: function(response, callback) {
    Chat.findById(response.chatId, function (err, resultChat, affected) {
        if (err) {
            log.error(err);
            callback(err);
        }
        else if (resultChat == null || resultChat.length == 0) {
            log.error('Chat is not found: ' + response.chatId);
            callback(new Error('Chat is not found' + chatId));
        }
        else {
            var userId = response.userId;
            var messageBox = resultChat.messageBox;
            if(messageBox.length == 0) {
                Chat.findOneAndUpdate({_id: response.chatId},
                    { $push:{ messageBox: {
                        userId: response.userId,
                        messageId: response.messageId
                    } } }, function(err, result){
                        if (err) {
                            log.error(err);
                            callback(err);
                        }
                        else {
                            log.info('response saved: ' + response.userId + ' '
                                + response.chatId + ' ' + response.messageId);
                            callback(null);
                        }
                    });
                /!*messageBox.push({ userId: response.userId, messageId: response.messageId });
                 saveMessage(response, resultChat, messageBox, callback);*!/
            }
            else{
                //for(var i = 0; i < messageBox.length; i++){
                //if (messageBox[i].userId == userId) {
                Chat.findOneAndUpdate({ _id: response.chatId, 'messageBox.userId': response.userId },
                    { $set: { 'messageBox.$.messageId': response.messageId } }, {upsert: true},
                    function (err, result) {
                        if (err) {
                            log.error(err);
                            callback(err);
                        }
                        else {
                            log.info('response saved: ' + response.userId + ' '
                                + response.chatId + ' ' + response.messageId);
                            callback(null);
                        }
                    }
                );
                //return;
                //}
                /!* else if(i == (messageBox.length - 1)){

                 /!*messageBox.push({ userId: response.userId, messageId: response.messageId });
                 saveMessage(response, resultChat, messageBox, callback);*!/
                 }*!/
                //}
            }
        }

    })
},*/
