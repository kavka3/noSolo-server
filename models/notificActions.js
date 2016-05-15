/**
 * Created by comp on 3/21/2015.
 */

var connection = require('../lib/db.js').connection,
    async = require('async'),
    User = connection.model('NoSoloUser'),
    Notification = require('./../data/notificationSchema.js'),
    Socket = require('../lib/socket.js'),
    MESSAGE_FROM_SYSTEM = 5,
    UPDATE_APP = 11,
    NOSOLO_ID = '100009647204771',
    NOSOLO_NAME = 'noSolo'
    ;


function getAllUsers(callback){
    User.find({}, '_id', function(err, users, affected){
        if(err){ callback(err); }
        else{
            var usersIds = [];
            for(var i = 0; i < users.length; i++){
                usersIds.push(users[i]._id);
            }
            callback(null, usersIds);
        }
    })
}

module.exports =  NotificationOperations = {
    sendUpdateMessage: function(canContinue, message, iosLink, androidLink){
        async.waterfall([
                function(callback){
                    var newNotify = Notification({ creator: 'noSolo' , addressee: 'everybody'
                        , notificationType: UPDATE_APP,
                        specialData: { canContinue: canContinue,
                            message: message, iosLink: iosLink, androidLink: androidLink } });
                    newNotify.save(function(err, resNtf){
                        if(err){callback(err);}
                        else{callback(null, resNtf);}
                    })
                },
                function(ntfs, callback){
                    User.find({}, function(err, users, affected){
                        if(err){ callback(err); }
                        else{ callback(null, ntfs, users) }
                    })
                },
                function(ntf, users, callback){
                    var iterator = function(user, callbackI){
                        User.update({_id: user._id}, { $set: { 'notifications': ntf._id } }, { upsert: true },
                            function(err, res){
                                if(err){ callbackI(err); }
                                else{ callbackI(null) }

                            });
                    };
                    async.eachSeries(users, iterator, function(err, result){
                        if(err){ callback(err); }
                        else{ callback(null); }
                    });
                }
            ],
            function(err){
                if(err){console.error(err); }
                else{ console.info('Notification saved'); }
            })
    }
};




