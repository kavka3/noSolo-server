/**
 * Created by Ignat on 5/31/2015.
 */

var http = require('http'),
    apn = require('apn'),
    url = require('url'),
    gcm = require('node-gcm'),

    MESSAGE = 'Hey:) You got message from NoSolo: ',
    ATTEMPTS = 5,

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
    senderConditions;
if(!process.env.GCM_Sender){
    var config = require('../config/config');
    senderConditions = config.GCM.sender;
    console.log('IN GCM LOCAL'/*, senderConditions*/);
}
else{
    senderConditions = process.env.GCM_Sender;
    console.log('IN GCM HEROKU: '/*, senderConditions*/);
}

function checkMessageType(notification){
    var message = null;
    switch(notification.notificationType){
        case LIKE_ACTIVITY: message = notification.specialData.surname + ' wants to join your activity'; break;
        case JOIN_ACTIVITY: message = 'you were invited to new activity'; break;
        case REJECT_ACTIVITY: message = 'you request was rejected'; break;
        case ACTIVITY_UPDATED: message = 'activity was changed'; break;
        case MESSAGE_FROM_SYSTEM: message = notification.specialData; break;
        case REMOVED_FROM_ACTIVITY: message = 'you were removed from activity'; break;
        case USER_JOINS_ACTIVITY: message = notification.specialData.surname + ' joined ' + notification.specialData.joiningActivityTitle;break;
        case USER_LEAVE_ACTIVITY: message = notification.specialData.surname + ' left activity';break;
        case ACTIVITY_RECUR: message = 'you were invited to join activity one more time'; break;
        case REJECT_RECUR: message = 'user disclaimed your invite to: ' + notification.specialData; break;
        default: break;
    }
    return message;
};
//apns settings
var callback = function(errorNum, notification){
    console.log('RESPONSE FROM APPLE Error is: %s', errorNum);
    console.log("Note " + JSON.stringify(notification));
};
/*cert: 'config/PushProductCert.pem',
    key:  'config/PushChatKey.pem',*/
var options = {
    gateway: 'gateway.sandbox.push.apple.com', // gateway.sandbox.push.apple.com gateway.push.apple.com
    errorCallback: callback,
    cert: 'config/PushChatCert.pem',
    key:  'config/PushChatKey.pem',
    passphrase: '1qaz@@wsx',
    port: 2195,
    enhanced: true,
    cacheLength: 100
};

function sendMessageToApple(udId, message){
    console.log('DEVICE ID: ', udId);
    var device = new apn.Device(udId);
    var note = new apn.Notification();
    note.badge = 1;
    note.sound = "beep.wav"; //path to your sound
    note.contentAvailable = 1;
    note.alert = { "body" : message.userName + ' wrote: ' + message.messageText, "action-loc-key" : "Show Me!" , "launch-image" : "mysplash.png"};
    note.payload = {'messageFrom': 'noSolo', chatId: message.chatId, ntfType: 'chat'};
    note.device = device;
    var apnsConnection = new apn.Connection(options);
    apnsConnection.pushNotification(note, device);
};

function sendNtfToApple(udId, ntf){
    //console.log('DEVICE ID: ', udId);
    var activityId = null;
    var isJoinRequest = ntf.notificationType == LIKE_ACTIVITY ? true: false;
    if(ntf.specialData && ntf.specialData.activityId){ activityId = ntf.specialData.activityId; }
    var device = new apn.Device(udId);
    var note = new apn.Notification();
    note.badge = 1;
    note.sound = "beep.wav"; //path to your sound
    note.contentAvailable = 1;
    var message = checkMessageType(ntf);
    note.alert = { "body" : message, "action-loc-key" : "Show Me!" , "launch-image" : "mysplash.png"};
    note.payload = {'messageFrom': 'noSolo', ntfId: ntf._id, ntfType: 'ntf', activityId: activityId, isJoinRequest: isJoinRequest };
    note.device = device;
    var apnsConnection = new apn.Connection(options);
    apnsConnection.pushNotification(note, device);

};

function sendMessageToAndroid(udIds, message){
    var message = new gcm.Message({
        data: {
            'timeToLive': 3000,
            'title': message.userName + ' wrote:',
            'chatId': message.chatId,
            'message': message.messageText,
            'ntfType': 'chat'
        }
    });
    var sender = new gcm.Sender(senderConditions);
    sender.send(message, udIds, ATTEMPTS, function(err, result){
        if(err){ console.error('IN ANDROID ERR: ', err); }
        else{ console.log('IN ANDROID RESULT', result); }
    })
};

function sendNtfToAndroid(udIds, ntf){
    console.log('SEND PUSH TO ANDROID', ntf);
    var isJoinRequest = ntf.notificationType == LIKE_ACTIVITY ? true: false;
    var activityId = null;
    if(ntf.specialData && ntf.specialData.activityId){ activityId = ntf.specialData.activityId; }
    var messageText = checkMessageType(ntf);
    var message = new gcm.Message({
        data: {
            'timeToLive': 3000,
            'title': 'news from noSolo:',
            'ntfId': ntf._id,
            'message': messageText,
            'ntfType': 'ntf',
            activityId: activityId,
            isJoinRequest: isJoinRequest
        }
    });
    var sender = new gcm.Sender(senderConditions);
    sender.send(message, udIds, ATTEMPTS, function(err, result){
        if(err){ console.error('IN ANDROID ERR: ', err); }
        else{ console.log('IN ANDROID RESULT', result); }
    })

};

module.exports = {
    sendMessage: function(udIds, message){
        var androidIds = [];
        for(var i = 0; i < udIds.length; i++){
            console.log('UDID: ', udIds[i]['type']);
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
            console.log('UDID: ', udIds[i]['type']);
            if(udIds[i]['type'] === 'ios'){
                sendNtfToApple(udIds[i]['deviceId'], ntf); //ntf.notificationType, ntf._id
            }
            else if(udIds[i]['type'] === 'android'){
                console.log('IN PUSH ID: ', udIds[i]['deviceId']);
                androidIds.push(udIds[i]['deviceId']);
            }
        }
        if(androidIds.length > 0){ sendNtfToAndroid(androidIds, ntf); }
    }

};

/*/!* The registration id returned upon the call to register in the app - this would be retrieved from a db where originally stored *!/
/!*var iPhone6 = "7f6c896c6491e32c61bbd2aac154ccb22568fab1b822052db1b81a99e9322048";
var iPhone5 = "3canc1493275761472e9a0b93fad10e0176e4b4692e1f48449462ff71fdbb013";*!/

var iPad = "514209cea24b736c834049b3c4d833b18c4fa4beeb0bdccd8e26cde3257d670c",
    idanPhone = 'b3223c8d486040039d3b49f37636645febeafcf173ee5abdda08273e8c881d4b',
    noSolo = '92ffbf0a76246697dbed6e50cb6271bcc15bf09e364f77797de47317e4c86758';

var myDevice = new apn.Device(noSolo);

var note = new apn.Notification();
note.badge = 1;
note.sound = "beep.wav"; //path to your sound
note.contentAvailable = 1;

// You could specify this way
//note.alert = "Jennifer L commented on your photo:\n Congratulations!! \u270C\u2764\u263A ";

// Or this way below to set a certain phrase on the button if the user has alert set for the notifications on the app and not just banner
// and a custom image to show upon launch from the notification.
note.alert = { "body" : "One more test message1", "action-loc-key" : "Show Me!" , "launch-image" : "mysplash.png"};

/!* payload property is custom internal use data - use for alert title in my sample app when in the foreground
 Providers can specify custom payload values outside the Apple-reserved aps namespace. Custom values
 must use the JSON structured and primitive types: dictionary (object), array, string, number, and Boolean.
 You should not include customer information (or any sensitive data) as custom payload data. Instead, use it
 for such purposes as setting context (for the user interface) or internal metrics. For example, a custom payload
 value might be a conversation identifier for use by an instant-message client app or a timestamp identifying
 when the provider sent the notification. *!/

note.payload = {'messageFrom': 'Push Notification Sample App', chatId: '5588fc2c27c9f703002eed89', ntfType: 'chat'}; // additional payload

note.device = myDevice;

var callback = function(errorNum, notification){
    console.log('Error is: %s', errorNum);
    console.log("Note " + JSON.stringify(notification));
};
var options = {
    gateway: 'gateway.sandbox.push.apple.com', // this URL is different for Apple's Production Servers and changes when you go to production
    errorCallback: callback,
    cert: 'config/PushChatCert.pem', //'C:/Users/Ignat/Documents/NoSolo/workbench/NoSoloServer/config/PushChatCert.pem' ** NEED TO SET TO YOURS - see this tutorial - http://www.raywenderlich.com/32960/apple-push-notification-services-in-ios-6-tutorial-part-1
    key:  'config/PushChatKey.pem',  // ** NEED TO SET TO YOURS
    passphrase: '1qaz@@wsx', // ** NEED TO SET TO YOURS
    port: 2195,
    enhanced: true,
    cacheLength: 100
};
var apnsConnection = new apn.Connection(options);
/!*console.log("Note " + JSON.stringify(note));
apnsConnection.sendNotification(note);*!/

apnsConnection.pushNotification(note, myDevice);*/
