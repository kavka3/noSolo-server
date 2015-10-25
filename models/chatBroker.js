var log = require('../lib/log.js')(module),
    async = require('async'),
    common = require('../lib/commonFunctions.js'),
    Chat = require('./../data/chatSchema.js'),
    Message = require('./../data/messageSchema.js'),
    User = require('./userOperations.js'),
    CHAT_CLOSED = 'chat is closed by activity creator',
    NOT_ENOUGH_FIELDS = 'not enough fields'
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


var ChatManager = {
    addUserToChat: function(chatId, userId, callbackDone){
        async.waterfall([
            function(callback){
                Chat.findById(chatId, function(err, resChat){
                    if(err){ callback(err); }
                    else if(common.isEmpty(resChat)){ callback(new Error('Chat is not found')); }
                    else{ callback(null, resChat); }
                })
            } ,
            function(resChat, callback){
                var messages = resChat.messages;
                if(!common.isEmpty(messages)){
                   /* var msgBox = {userId: userId, messageId: messages[messages.length - 1]};
                    //console.log('LAST MESSAGE ADDED: ', msgBox);
                    resChat.messageBox.push(msgBox);
                    resChat.save(function(err, result){
                        if(err){callback(err); }
                        else{ callback(null, result) }
                    })*/
                    Chat.findOneAndUpdate({ _id: chatId },
                        { $push: { messageBox :{userId: userId, messageId: messages[messages.length - 1]}} }, { upsert: true },
                        function (err, result) {
                            if(err){callback(err); }
                            else{ callback(null, result); }
                        }
                    );
                }
                else{ callback(null, resChat); }

            }
        ],
        function(err, resChat){
            if(err){callbackDone(err); }
            else{ /*console.log('CHAT CHANGED: ', resChat);*/ callbackDone(null); }
        })
    },

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
                            log.info('MESSAGE BOX CHECK id, indicator, msg-length : ' + chat._id + ' ' + messageInd + ' ' + chat.messages.length )
                            if(messageInd < chat.messages.length){
                                messageArray = chat.messages.slice(messageInd, chat.messages.length);
                            }
                            //callback(null, messageArray, null);
                        }
                        else{
                            messageArray = chat.messages;

                            /*chat.messageBox.push({ userId: userId, messageId: null });
                            chat.save(function(err){
                                if(err){ callback(err); }
                                else{ log.info('user message box created: ' + userId); }
                            });*/
                        }
                        Chat.findOneAndUpdate({ _id: chatId, 'messageBox.userId': userId },
                            { $set: { 'messageBox.$.messageId': chat.messages[chat.messages.length - 1] } }, /*{ upsert: true },*/
                            function (err, result) {
                                if (err) {
                                    log.error(err);
                                    callback(err);
                                }
                                else {
                                    log.info('user message box updated: ' + userId + ' ' + chatId);
                                    callback(null, messageArray, null);
                                }
                            }
                        );
                    }
                    else{
                       /* log.info('there are no new messages for user: ' + userId + 'in chat: ' + chatId);*/
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
    },

    createMessage: function(userId, userName, chatId, message, messageId, notForCreator, callback){
        if(common.isEmpty(userId) || common.isEmpty(userName) || common.isEmpty(chatId) || common.isEmpty(message)){
            callback(new Error(NOT_ENOUGH_FIELDS));
        }
        else{
            var nfc = notForCreator ? notForCreator : { notForCreator : false, activityCreator: null, notForOthers: false, joinedUser: false };
            var message = new Message({ _id: messageId, creator: userId, userName: userName, chatId: chatId,
                messageText: message, notForCreator: nfc });
            //console.log(message);
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
                            callback(null, message);
                        }
                    });
                }
            })
        }
    },

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
                    /*messageBox.push({ userId: response.userId, messageId: response.messageId });
                    saveMessage(response, resultChat, messageBox, callback);*/
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
                       /* else if(i == (messageBox.length - 1)){

                            /!*messageBox.push({ userId: response.userId, messageId: response.messageId });
                            saveMessage(response, resultChat, messageBox, callback);*!/
                        }*/
                    //}
                }
            }

        })
    },

    messageBoxUpdate: function(data, callback){
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
                            /*log.info('response saved');
                            console.log(result);*/
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
    }

};

module.exports = ChatManager;

/* get unread messages old version
Chat.findById(chatId, function(err, result, affected){
 if(err){
 log.error(err.message);
 callback(err);
 }
 else if(common.isEmpty(result)){
 log.error('Chat is not found: ' + chatId);
 callback(new Error('Chat is not found'));
 }
 else{
 if(!result.chatStatus){
 callback(null, null, true);
 }
 else if (result.messages.length != 0) {
 var messageArray = null,
 userBox = null,
 messages = [];
 for(var i = 0; i < result.messageBox.length; i++){
 if(result.messageBox[i].userId == userId){
 userBox = result.messageBox[i];
 }
 }
 if(userBox.messageId != null){
 var messageInd = result.messages.indexOf(userBox.messageId);
 messageInd++;
 if(messageInd < result.messages.length){
 messageArray = result.messages.slice(messageInd, result.messages.length);
 }
 }
 else{
 messageArray = result.messages;
 result.messageBox.push({ userId: userId, messageId: null });
 result.save(function(err){
 if(err){
 log.error(err);
 }
 else{
 log.info('user message box created: ' + userId);
 }
 });
 }
 var iteratorI = function(messageId, callbackI){
 Message.findById(messageId, function (err, result, affected) {
 if (err) {
 log.error(err.message);
 }
 else {
 log.info('in push');
 messages.push(result);
 callbackI();
 }
 });
 };
 if(!common.isEmpty(messageArray)){
 log.info('in async');
 async.eachSeries(messageArray, iteratorI, function (err) {
 if(err) {
 log.error(err.message);
 }
 ;
 });
 log.info('after async');
 callback(null, messages);
 }
 else{
 log.info('there are no new messages for user: ' + userId + 'in chat: ' + chatId);
 callback(null, null);
 }
 }
 else{
 log.info('there are no new messages for user: ' + userId + 'in chat: ' + chatId);
 callback(null, null);
 }
 }
 });*/