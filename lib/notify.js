/**
 * Created by ignat on 3/11/2015.
 */
var gcm = require('node-gcm'),
    log = require('./log.js')(module),
    GCM_SENDER;

if(!process.env.GCM_Sender){
    console.log('IN NOTIFY LOCAL');
    var config = require('../config/config');
    GCM_SENDER = config.GCM.sender;
}
else{
    GCM_SENDER = process.env.GSM_Sender;
}

var MESSAGE = 'Hey:) You got message from NoSolo: ',

    LIKE_ACTIVITY = 1,
    JOIN_ACTIVITY = 2,
    REJECT_ACTIVITY = 3,
    ACTIVITY_UPDATED = 4,
    MESSAGE_FROM_SYSTEM = 5,
    REMOVED_FROM_ACTIVITY = 6,
    USER_JOINS_ACTIVITY = 7,
    USER_LEAVE_ACTIVITY = 8,
    ACTIVITY_RECUR = 9,
    REJECT_RECUR = 10;

function checkMessageType(type, notification){
    var message = null;
    switch(type){
        case LIKE_ACTIVITY: message = 'somebody wants to join your activity'; break;
        case JOIN_ACTIVITY: message = 'you were invited to new activity'; break;
        case REJECT_ACTIVITY: message = 'you request were rejected'; break;
        case ACTIVITY_UPDATED: message = 'activity were changed'; break;
        case MESSAGE_FROM_SYSTEM: message = notification.specialData; break;
        case REMOVED_FROM_ACTIVITY: message = 'you were removed from activity'; break;
        case USER_JOINS_ACTIVITY: message = 'new user joins activity';break;
        case USER_LEAVE_ACTIVITY: message = 'user left activity';break;
        case ACTIVITY_RECUR: message = 'you were invited to join activity one more time'; break;
        case REJECT_RECUR: message = 'user disclaimed your invite to: ' + notification.specialData; break;
        default: break;
    }
    return message;
};


var gcmSender = {
   setMessage: function(notification){
       var message = new gcm.Message();
       var text = MESSAGE + checkMessageType(notification.notificationType, notification);
       message.addData('message', text);
       message.addData('title','NoSolo notification');
       message.timeToLive = 172800;

       return message;
   },
    sendMessage: function(message, addressees, callback){
        var sender = new gcm.Sender(GCM_SENDER);
        if(message != null && addressees != null && addressees.length != 0){
            sender.send(message, addressees, TIMES_TO_RETRIES, function(result){
                    callback(result);

            });
        }
        else{
            log.error('PUSHER: data is incorrect');
            callback(new Error('data is incorrect'));
        };
    }
};

module.exports = gcmSender;

