/**
 * Created by Ignat on 6/14/2015.
 */

var async = require('async'),
    mail = require('../lib/email.js'),
    Report = require('./../data/reportSchema.js'),
    Activity = require('./activitiesOperations')
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
                console.error(err);
                callbackDone(err);
            }
            else{
                callbackDone(null);
            }
        });
    },

    getReports: function(callbackDone){
        var query = Report
            .find({ isFinished: false })
            .populate('activityId',
                '_id title description imageUrl location creator tags tagsByLanguage timeStart timeFinish')
        ;
        query.exec(function(err, resReports){
            if (err) {
                callbackDone(err);
            }
            else {
                callbackDone(null, resReports);
            }
        })
        /*Report.find({isFinished: false}, function(err, resReports){
            if(err){ callbackDone(err); }
            else{ callbackDone(null, resReports); }
        })*/
    },

    proceedReport: function(activityId, callbackDone){
        async.series([
            function(callback){
                Activity.deleteActivity(activityId, function(err){
                    if(err){ callback(err); }
                    else{ callback(null); }
                })
            },
            function(callback){
                Report.update({activityId: activityId},{isFinished: true}, {multi: true}, function(err, resReports){
                    if(err){ callback(err); }
                    else{ callback(null); }
                })
            }
        ],
            function (err){
                if(err){
                    console.error(err);
                    callbackDone(err); }
                else{
                    callbackDone(null);
                }
            })

    },
    rejectReport: function(activityId, callbackDone){
        Report.update({activityId: activityId},{isFinished: true}, {multi: true}, function(err, resReports){
            if(err){ callbackDone(err); }
            else{
                callbackDone(null, resReports);
            }
        })
    }

};
