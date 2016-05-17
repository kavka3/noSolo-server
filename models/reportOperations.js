/**
 * Created by Ignat on 6/14/2015.
 */

var async = require('async'),
    common = require('../lib/commonFunctions.js'),
    mail = require('../lib/email.js'),
    Report = require('../data/reportSchema.js'),
    Activity = require('./activitiesOperations'),
    UserModel = require('./userOperations.js'),
    SUBSCRIBE_TYPE = 6
    ;

module.exports = {
    receiveReport: receiveReport,
    getReports: getReports,
    proceedReport: proceedReport,
    rejectReport: rejectReport

};

function receiveReport(userId, activityId, reportType, reportMessage, callbackDone){
    async.waterfall([
            function(callback){
                var report = new Report({ userId: userId,  activityId: activityId,
                    reportType: reportType, message: reportMessage });
                var message = '';
                if(reportType != SUBSCRIBE_TYPE ){
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
};

function getReports(callbackDone){
    var query = Report
        .find({ isFinished: false, reportType:{$ne: SUBSCRIBE_TYPE } })
        .populate('activityId',
            '_id title description imageUrl location creator tags tagsByLanguage timeStart timeFinish formattedAddress')
        ;
    query.exec(function(err, resReports){
        if (err) { callbackDone(err); }
        else {
            getReportedDetails(resReports, function(err, resReports){
                if(err){ callbackDone(err); }
                else{ callbackDone(null, resReports); }
            });
        }
    })

};

function proceedReport(activityId, callbackDone){
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

};

function rejectReport(activityId, callbackDone){
    Report.update({ activityId: activityId },{ isFinished: true }, { multi: true },
        function(err, resReports){
        if(err){ callbackDone(err); }
        else{
            callbackDone(null, resReports);
        }
    })
};

function getReportedDetails(reports, callback){
    var realReports = reports.filter(function(report){
        return (!common.isEmpty(report.activityId));
    });
    if(!common.isEmpty(realReports)){
        realReports = common.deepObjClone(realReports);
        var userIds = realReports.map(function(report){
            return report.activityId.creator;
        });
        UserModel.getByList(userIds, function(err, resUsers){
            if(err){ callback(err); }
            else{
                realReports.forEach(function(report){
                    report.activityId.creator = common.findWhere(resUsers, {_id: report.activityId.creator});
                });
                callback(null, realReports);
            }
        });
    }
    else{ callback(null,[]); }
};
