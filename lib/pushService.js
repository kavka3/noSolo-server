/**
 * Created by Ignat on 5/31/2015.
 */

var http = require('http'),
    apn = require('apn'),
    url = require('url'),
    gcm = require('node-gcm'),
    common = require('./commonFunctions.js'),
    commandDictionary = require('../models/serverDictionaryOperations.js').dictionary,
    ATTEMPTS = 5,
    senderConditions
    ;

if(!process.env.GCM_Sender){
    var config = require('../config/config');
    senderConditions = config.GCM.sender;
}
else{
    senderConditions = process.env.GCM_Sender;
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
};


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

function sendPushToAndroid(udIds, message){
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
            if(udIds[i]['type'] === 'ios'){
                sendMessageToApple(udIds[i]['deviceId'], message);
            }
            else if(udIds[i]['type'] === 'android'){
                androidIds.push(udIds[i]['deviceId']);
            }
        }
        if(androidIds.length > 0){ sendMessageToAndroid(androidIds, message); }
    },
    sendPush: function(udIds, message){
        var androidIds = [];
        for(var i = 0; i < udIds.length; i++){
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



