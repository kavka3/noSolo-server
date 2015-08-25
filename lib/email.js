/**
 * Created by Ignat on 5/7/2015.
 */

var api_user,
    api_password;

if(!process.env.SENDGRID_USERNAME){
    console.log('IN EMAIL LOCAL');
    var config = require('../config/config');
    api_user = config.email.user;
    api_password = config.email.password;
}
else{
    api_user = process.env.SENDGRID_USERNAME;
    api_password =  process.env.SENDGRID_PASSWORD;
}


var sendgrid  = require('sendgrid')(api_user, api_password);

module.exports = {
    sendMail: function(message, callback){
        var payload   = {
            to      : ['ignat@redtlv.com', 'idan@redtlv.com'],
            from    : 'noSolo@redtlv.com',
            subject : 'noSolo notification',
            text    : 'ERROR IN APP!'
        };
        sendgrid.send(payload, function(err, json){
            if (err) { console.error(err); callback(err) }
            else{ callback(); }
        });
    },
    //['ignat@redtlv.com', 'idan@redtlv.com']
    sendReport: function(message, callback){
        var payload   = {
            to      : ['ignat@redtlv.com', 'idan@redtlv.com'],
            from    : 'noSolo@redtlv.com',
            subject : 'noSolo report message',
            text    : message
        };
        sendgrid.send(payload, function(err, json){
            if (err) { console.error(err); callback(err) }
            else{ callback(); }
        });
    }
};


