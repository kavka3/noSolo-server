/**
 * Created by Ignat on 6/14/2015.
 */

var log = require('../lib/log.js')(module),
    async = require('async'),
    common = require('../lib/commonFunctions.js'),
    mail = require('../lib/email.js'),
    Report = require('./../data/reportSchema.js')
    ;

module.exports = {
    receiveReport: function(userId, activityId, reportType, reportMessage, callbackDone){
        async.waterfall([
            function(callback){
                var report = new Report({ userId: userId,  activityId: activityId,
                    reportType: reportType, message: reportMessage });
                var message = '';
                if(reportType != 6){
                    message = 'Hey we got report message from: ' + userId + ' about activity: ' + activityId
                        + ' with a type and text: ' + reportType + ' ' + reportMessage;
                }
                else{
                    message = 'Hey ' + userId + ' wants to subscribe for activities like this: ' + activityId;
                }
                mail.sendReport(message, function(err){
                    if(err){ callback(err); }
                    else{
                        callback(null, report);
                    }
                })
            },
            function(report, callback){
                report.isSent = true;
                report.save(function(err){
                    if(err){
                        callback(err);
                    }
                    else{
                        callback(null);
                    }
                })
            }
        ],
        function(err){
            if(err){
                log.error(err);
                callbackDone(err);
            }
            else{
                log.info('REPORT SAVED');
                callbackDone(null);
            }
        });
    }

};
