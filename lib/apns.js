/**
 * Created by Ignat on 5/31/2015.
 */

var http = require('http'),
    apn = require('apn'),
    url = require('url'),
    gcm = require('node-gcm'),
    common = require('./commonFunctions.js'),
    commandDictionary = require('../models/serverDictionaryOperations.js').dictionary,
    createMessage = require('../models/serverDictionaryOperations.js').createMessage,


    ATTEMPTS = 5,
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
    senderConditions,

    //ids of server commands
    WANTS_TO_JOIN = 0,
    YOU_JOINED = 1,
    REQUEST_REJECTED = 2,
    REMOVE_FROM_ACTIVITY = 4,
    JOINED = 5,
    LEFT_ACTIVITY = 6,
    RECUR_INVITE = 7,
    USER_REJECT_INVITE = 8

    ;

if(!process.env.GCM_Sender){
    var config = require('../config/config');
    senderConditions = config.GCM.sender;
    console.log('IN GCM LOCAL'/*, senderConditions*/);
}
else{
    senderConditions = process.env.GCM_Sender;
    console.log('IN GCM HEROKU: '/*, senderConditions*/);
}

function checkDictionary(){
    if(common.isEmpty(commandDictionary)){
        var serverCommands = require('../models/serverDictionaryOperations.js');
        serverCommands.getDictionary(function(err, resDict){
            if(err){ console.error(err); }
            else{
                commandDictionary = resDict;
                console.log('GOT dictionary in APNS operations'/*, commandDictionary*/);
            }
        })
    }
};

checkDictionary();

function checkMessageType(userLang, notification){
    var message = null;
    console.log('checkMessageType', userLang);

    switch(notification.notificationType){
        case LIKE_ACTIVITY: message =
            createMessage(userLang, [{ param: notification.specialData.surname }, { commandId: WANTS_TO_JOIN }]); break;
        case JOIN_ACTIVITY: message =
            createMessage(userLang, [{ commandId: YOU_JOINED }, { param: notification.specialData.title }]); break;
        case REJECT_ACTIVITY: message =
            createMessage(userLang, [{ commandId: REJECT_ACTIVITY }]); break;
        case ACTIVITY_UPDATED: message =
            createMessage(userLang, [{ commandId: REJECT_ACTIVITY }]); break;
        //TODO: add multi language processing here
        case MESSAGE_FROM_SYSTEM: message =
            createMessage(userLang, [{ param: notification.specialData }]); break;
        case REMOVED_FROM_ACTIVITY: message =
            createMessage(userLang, [{ commandId: REMOVE_FROM_ACTIVITY}, { param: notification.specialData }]); break;
        case USER_JOINS_ACTIVITY: message =
            createMessage(userLang, [{ param: notification.specialData.surname }, { commandId: JOINED }, { param: notification.specialData.joiningActivityTitle }]); break;
        case USER_LEAVE_ACTIVITY: message =
            createMessage(userLang, [{ param: notification.specialData.surname }, { commandId: LEFT_ACTIVITY }, {param: notification.specialData.joiningActivityTitle }]); break;
        case ACTIVITY_RECUR: message =
            createMessage(userLang, [{ commandId: RECUR_INVITE }]); break;
        case REJECT_RECUR: message =
            createMessage(userLang, [{ commandId: USER_REJECT_INVITE }, { param: notification.specialData }]); break;
        default: break;
    }
    return message;
};
//apns settings
var callback = function(errorNum, notification){
    console.log('RESPONSE FROM APPLE Error is: %s', errorNum);
    console.log("Note " + JSON.stringify(notification));
};

var options = {
    gateway: 'gateway.push.apple.com', // gateway.sandbox.push.apple.com gateway.push.apple.com
    errorCallback: callback,
    cert: 'config/newChatCert.pem',
    key:  'config/newChatKey.pem',
    passphrase: '1qaz@@wsx',
    port: 2195,
    enhanced: true,
    cacheLength: 100
};

function sendMessageToApple(udId, message){
    var title = message.userName == 'noSolo'?'' : message.userName + ' wrote: ';
    console.log('DEVICE ID: ', udId);
    var device = new apn.Device(udId);
    var note = new apn.Notification();
    note.badge = 1;
    note.sound = "beep.wav"; //path to your sound
    note.contentAvailable = 1;
    note.alert = { "body" : title + message.messageText, "action-loc-key" : "Show Me!" , "launch-image" : "mysplash.png"};
    note.payload = {'messageFrom': 'noSolo', chatId: message.chatId, ntfType: 'chat'};
    note.device = device;
    var apnsConnection = new apn.Connection(options);
    apnsConnection.pushNotification(note, device);
};

function sendNtfToApple(udId, userLang, ntf){
    console.log('sendNtfToApple DEVICE ID: ', udId);
    var activityId = null;
    var isJoinRequest = ntf.notificationType == LIKE_ACTIVITY ? true: false;
    if(ntf.specialData && ntf.specialData.activityId){ activityId = ntf.specialData.activityId; }
    var device = new apn.Device(udId);
    var note = new apn.Notification();
    note.badge = 1;
    note.sound = "beep.wav"; //path to your sound
    note.contentAvailable = 1;
    var message = checkMessageType(userLang, ntf);
    note.alert = { "body" : message, "action-loc-key" : "Show Me!" , "launch-image" : "mysplash.png"};
    note.payload = {'messageFrom': 'noSolo', ntfId: ntf._id, ntfType: 'ntf', activityId: activityId, isJoinRequest: isJoinRequest };
    note.device = device;
    var apnsConnection = new apn.Connection(options);
    apnsConnection.pushNotification(note, device);

};

function sendPushToApple(udId, message){
    console.log('sendPushToApple DEVICE ID: ', udId);
    var device = new apn.Device(udId);
    var note = new apn.Notification();
    note.badge = 1;
    note.sound = "beep.wav"; //path to your sound
    note.contentAvailable = 1;
    note.alert = { "body" : message, "action-loc-key" : "Show Me!" , "launch-image" : "mysplash.png"};
    note.payload = {'messageFrom': 'noSolo'};
    note.device = device;
    var apnsConnection = new apn.Connection(options);
    apnsConnection.pushNotification(note, device);
}


function sendMessageToAndroid(udIds, message){
    var title = message.userName == 'noSolo'?'noSolo ' : message.userName + ' wrote:';
    var message = new gcm.Message({
        data: {
            'timeToLive': 3000,
            'title': title,
            'chatId': message.chatId,
            'message': message.messageText,
            'ntfType': 'chat',
            'image': 'www/img/App_Icon_small.jpg',
            'style': 'inbox',
            'summaryText': 'There are %n% messages'
        }
    });
    //console.log('sendMessageToAndroid', message);
    var sender = new gcm.Sender(senderConditions);
    //sender.send(message, udIds, ATTEMPTS, function(err, result){, { registrationTokens: [ deviceID ] }
    sender.send(message, { registrationTokens: udIds }, ATTEMPTS, function(err, result){
        if(err){ console.error('IN ANDROID ERR: ', err); }
        else{ console.log('IN ANDROID RESULT', result); }
    })
};

function sendNtfToAndroid(udId, userLang, ntf){
    console.log('SEND PUSH TO ANDROID', udId, ntf);
    var isJoinRequest = ntf.notificationType == LIKE_ACTIVITY ? true: false;
    var activityId = null;
    if(ntf.specialData && ntf.specialData.activityId){ activityId = ntf.specialData.activityId; }

    var messageText = checkMessageType(userLang, ntf);
    var message = new gcm.Message({
        data: {
            'timeToLive': 30000,
            'title': 'noSolo ',
            'ntfId': ntf._id,
            'message': messageText,
            'ntfType': 'ntf',
            'image': 'www/img/App_Icon_small.jpg',
            'style': 'inbox',
            'summaryText': 'There are %n% messages',
            activityId: activityId,
            isJoinRequest: isJoinRequest
        }
    });
    var sender = new gcm.Sender(senderConditions);
    sender.send(message, { registrationTokens: udId }, ATTEMPTS, function(err, result){
        if(err){ console.error('IN ANDROID ERR: ', err); }
        else{ console.log('IN ANDROID RESULT', result); }
    })

};

function sendPushToAndroid(udIds, message){
    console.log('sendPushToAndroidTO ANDROID');
    var messageText = message;
    var message = new gcm.Message({
        data: {
            'timeToLive': 30000,
            'title': 'noSolo ',
            'message': messageText,
            'ntfType': 'ntf',
            'image': 'www/img/App_Icon_small.jpg',
            'style': 'inbox',
            'summaryText': 'There are %n% messages'
        }
    });
    var sender = new gcm.Sender(senderConditions);
    sender.send(message, { registrationTokens: udIds }, ATTEMPTS, function(err, result){
        if(err){ console.error('IN ANDROID ERR: ', err); }
        else{ console.log('IN ANDROID RESULT', result); }
    })
};

module.exports = {
    sendMessage: function(udIds, message){
        var androidIds = [];
        for(var i = 0; i < udIds.length; i++){
            //console.log('UDID: ', udIds[i]['type']);
            if(udIds[i]['type'] === 'ios'){
                sendMessageToApple(udIds[i]['deviceId'], message);
            }
            else if(udIds[i]['type'] === 'android'){
                androidIds.push(udIds[i]['deviceId']);
            }
        }
        if(androidIds.length > 0){ sendMessageToAndroid(androidIds, message); }
    },

    sendNtf: function(udIds, ntf){
        var androidIds = [];
        for(var i = 0; i < udIds.length; i++){
            //console.log('UDID: ', udIds[i]['type']);
            if(udIds[i]['type'] === 'ios'){
                sendNtfToApple(udIds[i]['deviceId'], udIds[i]['systemLanguage'], ntf); //ntf.notificationType, ntf._id
            }
            else if(udIds[i]['type'] === 'android'){
                //console.log('IN PUSH ID: ', udIds[i]['deviceId']);
                sendNtfToAndroid(udIds[i]['deviceId'], udIds[i]['systemLanguage'], ntf);
            }
        }
    },
    sendPush: function(udIds, message){
        var androidIds = [];
        for(var i = 0; i < udIds.length; i++){
            //console.log('UDID: ', udIds[i]['type']);
            if(udIds[i]['type'] === 'ios'){
                sendPushToApple(udIds[i]['deviceId'], message);
            }
            else if(udIds[i]['type'] === 'android'){
                androidIds.push(udIds[i]['deviceId']);
            }
        }
        if(androidIds.length > 0){ sendPushToAndroid(androidIds, message); }
    }

};



