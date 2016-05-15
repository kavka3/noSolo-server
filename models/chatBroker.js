var async = require('async'),
    common = require('../lib/commonFunctions.js'),
    Chat = require('./../data/chatSchema.js'),
    Message = require('./../data/messageSchema.js'),
    MessageBox = require('../data/messageBox.js'),

    NOT_ENOUGH_FIELDS = 'not enough fields',
    NOSOLO_CHAT = '198803877117851'
    ;

module.exports = {
    createChatBox: createChatBox,
    addUserToChat: addUserToChat,
    getUnreadMessages: getUnreadMessages,
    createPushMessage: createPushMessage,
    createMessage: createMessage,
    addMessageResponse: addMessageResponse,
    getSupportChats: getSupportChats,
    getChat: getChat,
    updateSupportChat: updateSupportChat
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

function createChatBox(userId, chatId, callback){
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
                messageBox.save(function(err, messageBox){
                    if(err){ callback(err); }
                    else{ callback(null, messageBox); }
                })
            }
            else{ callback(null); }
        });
};

function addUserToChat(chatId, userId, callbackDone){
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
                    updateMessageBox(userId, chatId, messages[messages.length - 1], callback, messages);
                }
                else{ callback(null,null); }
            },
        ],
        function(err, messages){
            if(err){callbackDone(err); }
            else{ callbackDone(null, []); }
        })
};

function getUnreadMessages(chatId, userId, isFirstLoad, callbackRes){
    async.waterfall([
            function(callback){
                MessageBox.find({
                        chatId: chatId,
                        userId: userId
                    }
                    ,function(err, resBox){
                        if(err){ callback(err); }
                        else if(common.isEmpty(resBox)){
                            //callback(new Error('No user messageBox: ' + chatId + ' ' + userId));
                            createChatBox(userId, chatId, function(err, newBox){
                                if(err){ callback(err); }
                                else{ callback(null, newBox); }
                            })

                        }
                        else{ callback(null, resBox[0]); }
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
                if(isFirstLoad){
                    messagesForSearch = messageIds;
                }
                else if(!common.isEmpty(messageIds)){
                    if(userBox.lastMessageId){
                        var index = messageIds.indexOf(userBox.lastMessageId);
                        if(index === messageIds.length - 1){
                            //not should to do anything but need to keep it
                        }
                        else if(index > -1 ){
                            messagesForSearch = messageIds.slice(index + 1, messageIds.length);
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
                        })
                        .sort({ messageTime: 1 })
                        .exec( function(err, resMessages){
                            if(err){ callback(err); }
                            else{ callback(null, resMessages, userBox) }
                        });
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
                        { new: true },
                        function(err, resBox){
                            if(err){ callback(err); }
                            else{ callback(null, messages); }
                        }
                    )
                }
                else{ callback(null, messages); }
            },
            function(resMessages, callback){
                if(!common.isEmpty(resMessages)){
                    if(!common.isEmpty(resMessages)){
                        var finalMessages = [];
                        for(var i = 0; i < resMessages.length; i++){
                            var message = resMessages[i];
                            if(message.notForCreator && message.notForCreator.notForCreator){
                                if(message.notForCreator.activityCreator == userId){
                                    continue;
                                }
                            }
                            if(message.notForCreator && message.notForCreator.notForOthers){
                                if(message.notForCreator.activityCreator != userId){
                                    continue;
                                }
                            }
                            if(message.notForCreator && message.notForCreator.joinedUser ){
                                if(message.notForCreator.joinedUser == userId){
                                    continue;
                                }
                            }
                            var copy = common.deepObjClone(message);
                            copy.messageTime = new Date(copy.messageTime).getTime();
                            finalMessages.push(copy);
                        }
                        callback(null, finalMessages);
                    }
                }
                else{
                    callback(null, null);
                }
            }
        ],
        function(err, resMessages){
            if(err){ callbackRes(null); }
            else{ callbackRes(null, resMessages, false); }
        });
};

function createPushMessage(userId, userName, chatId, messageForPush){
    return {
        creator: userId,
        userName: userName,
        chatId: chatId,
        messageText: messageForPush
    }
};

function createMessage(userId, userName, chatId, message, messageId, notForCreator,
                       messageType, imageUrl, tbNlImageUrl, messageTime, callback){
    if(common.isEmpty(userId) || common.isEmpty(userName) || common.isEmpty(chatId) || (messageType == 'text' && common.isEmpty(message))){
        callback(new Error(NOT_ENOUGH_FIELDS));
    }
    else{
        var nfc = notForCreator ? notForCreator : { notForCreator : false, activityCreator: null, notForOthers: false, joinedUser: false };
        var time = new Date().getTime();
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
            tbNlImageUrl: tbNlImageUrl,
            usersViewed: [userId]
        });
        message.save(function(err){
            if(err){ callback(err); }
            else{
                Chat.findByIdAndUpdate(chatId,{ $push:{ messages: message._id } }, { new: true, upsert: true },
                    function(err, result){
                        if(err){ callback(err); }
                        else if(common.isEmpty(result)){
                            callback(new Error('Chat is not found' + chatId));
                        }
                        else{
                            if(result.crm.isSupport && message.creator != NOSOLO_CHAT){
                                Chat.findByIdAndUpdate(chatId, { $set: { 'crm.isSeen' : false } }, {new: true},
                                    function(err){
                                        if(err){ console.error(err); }
                                    });
                            }
                            var copy = common.deepObjClone(message);
                            copy.messageTime = time;
                            callback(null, copy);
                        }
                    });
            }
        })
    }
};

function addMessageResponse(response, callback) {
    if(response.userId && response.chatId && response.messageId){
        updateMessageBox(response.userId, response.chatId, response.messageId, callback)
    }
    else{ callback(new Error('cannot save message response: ' + response.messageId + ',' + response.chatId)); }
};

function getSupportChats(userId, callbackDone){
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
};

function getChat(chatId, callbackDone){
    var query = Chat
        .findById(chatId, '_id usersInChat messages crm')
        .populate('messages')
        .populate('usersInChat', '_id surname familyName imageUrl')
        ;
    query.exec(function(err, resChat){
        if(err){ callbackDone(err); }
        else{ callbackDone(null, resChat); }
    })
};

function updateSupportChat(chatId){
    Chat.findByIdAndUpdate(chatId, { $set: { 'crm.isSeen' : true } }, {new: true},
        function(err){
            if(err){ console.error(err); }
        })
};




