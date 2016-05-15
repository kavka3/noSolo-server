/**
 * Created by Ignat on 5/15/2016.
 */
var report = require('../../models/reportOperations.js'),
    AppCommands = require('../../models/appDictionaryOperations.js'),
    ChatBroker = require('../../models/chatBroker.js'),
    ActivityModel = require('../../models/activitiesOperations.js'),
    async = require('async')
;

module.exports = {
    getReports: getReports,
    proceed: proceed,
    reject: reject,
    commandDictionaryGet: commandDictionaryGet,
    commandDictionaryPost: commandDictionaryPost,
    appCommandBase: appCommandBase,
    createSupportChat: createSupportChat,
    updateSupportChat: updateSupportChat
};

function createSupportChat(request, response){
    async.waterfall([
            function(callback){
                ActivityModel.createWelcomeActivity(request.body.userId, request.body.userLang, request.body.adminId, request.body.title, request.body.description
                    , request.body.imageUrl, request.body.location, true, function(err, resActivity){
                        if(err){ callback(err); }
                        else{ callback(null, resActivity); }
                    })
            },
            function(activity, callback){
                ChatBroker.getChat(activity._id, function(err, resChat){
                    if(err){ callback(err); }
                    else{ callback(null, activity, resChat) }
                })
            }
        ],
        function(err, activity, chat){
            if(err){
                console.error(err);
                response.json({
                    result: 'error',
                    data: err
                })
            }
            else{
                response.json({
                    result: 'success',
                    data: {
                        activity: activity,
                        chat: chat
                    }
                })
            }
        });

}

function appCommandBase(request, response){
    AppCommands.getCommandBase(function(err, resDict){
        if(err){
            console.error(err);
            response.json({
                result: 'error',
                data: 'err.message'
            });
        }
        else{
            response.json({
                result: 'success',
                data: resDict
            });
        }
    });
};

function updateSupportChat(request, response){
    ChatBroker.updateSupportChat(request.body.chatId);
    response.json({result: 'success'});
};

function commandDictionaryPost(request, response){
    AppCommands.createCommand(null, request.body.control, request.body.command, request.body.cmdDictionary,
        function(err, resCmd){
            if(err){
                console.error(err);
                response.json({
                    result: 'error',
                    data: err.message
                });
            }
            else{
                response.json({
                    result: 'success',
                    data: resCmd
                });
            }
        })
}

function commandDictionaryGet(request, response){
    AppCommands.getCmdDictionary(function(err, resDict){
        if(err){
            console.error(err);
            response.json({
                result: 'error',
                data: 'err.message'
            });
        }
        else{
            response.json({
                result: 'success',
                data: resDict
            });
        }
    });
};

function reject(request, response){
    report.rejectReport(request.body.activityId, function(err){
        if(err){
            console.error(err);
            response.json({result: 'error', data: err.message });
        }
        else{ response.json({result: 'success', data: null }); }
    })
};

function proceed(request, response){
    report.proceedReport(request.body.activityId, function(err){
        if(err){
            console.error(err);
            response.json({result: 'error', data: err.message });
        }
        else{ response.json({result: 'success', data: null });
        }
    })
};

function getReports(request, response){
    report.getReports(function(err, resReports){
        if(err){
            console.error(err);
            response.json({result: 'error', data: err.message });
        }
        else{
            response.json({result: 'success', data: resReports });
        }
    })
};