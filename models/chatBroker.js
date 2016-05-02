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
                    messageBox.save(function(err, messageBox){
                        if(err){ callback(err); }
                        else{ callback(null, messageBox); }
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

    getUnreadMessages: function(chatId, userId, isFirstLoad, callbackRes){
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
                                ChatManager.createChatBox(userId, chatId, function(err, newBox){
                                    if(err){ callback(err); }
                                    else{ callback(null, newBox); }
                                })

                            }
                            else{
                                //console.log('resBox[0]', resBox[0]);
                                callback(null, resBox[0]);
                            }
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
                            console.log('chatId, index', chatId, index, messageIds.length - 1);
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
                        //console.log('messages', messages);
                        //console.log('lastMessage', lastMessage._id);
                        //console.log('userBox', userBox);
                        MessageBox.findByIdAndUpdate(
                            userBox._id,
                            { lastMessageId: lastMessage._id },
                            { new: true },
                            function(err, resBox){
                                if(err){ callback(err); }
                                else{
                                    //console.log('resBox', resBox);
                                    callback(null, messages);
                                }
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
                                finalMessages.push(message);
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
            if(err){
                if(err != 'No chat found: '){
                    log.error(err);
                }
                callbackRes(null);
            }
            else{ callbackRes(null, resMessages, false); }
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
            var time = new Date().getTime();
            //console.log('CREATING MESSAGE', messageId, userId, userName, chatId, message, nfc );
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
            //console.log('MESSAGE CREATED',message);
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

