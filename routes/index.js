var log = require('../lib/log.js')(module),
    Activity = require('../models/activitiesOperations.js'),
    NotificationOperations = require('../models/notificActions.js'),
    NotyMan = require('../models/notificationManager.js'),
    Socket = require('../lib/socket.js'),
    async = require('async'),
    s3signing = require('../lib/s3upload.js'),
    common = require('../lib/commonFunctions.js'),
    report = require('../models/reportOperations.js'),
    AppCommands = require('../models/appDictionaryOperations.js'),
    ChatBroker = require('../models/chatBroker.js'),
    User = require('../models/userOperations.js')

;

function checkReportFields(obj){
    //log.info('IN CHECK REPORT: ', obj.userId, ' ', obj.activityId, ' ', obj.type, ' ', obj.message);
    if(common.isEmpty(obj.userId) || common.isEmpty(obj.activityId) || common.isEmpty(obj.type)
        || common.isEmpty(obj.message)){ return false; }
    else{ return true; }
};

function checkDeviceIdFields(deviceIdObj){
   if(!common.isEmpty(deviceIdObj.userId) && !common.isEmpty(deviceIdObj.platform)
       && !common.isEmpty(deviceIdObj.deviceId)){ return true; }
    else{ return false; }
};

module.exports = function(app){
    //returns to app link to server and redirect server depends on app version
    app.get('/connection', require('./services/connection.js'));
    //returns user or create new one if not exists
    //TODO add user authentication and session management on sign in sign out and delete
    app.post('/signIn', require('./user/crud.js').signIn);

    app.get('/user_un_search', require('./user/crud.js').search);

    app.post('/user_update', require('./user/crud.js').update);

    app.post('/delete_user', require('./user/crud.js').remove);

    app.post('/user_join_activity', require('./user/model.js').enter);
    //user leaves activity
    app.post('/user_leave_activity',require('./user/model.js').leave);
    //creator removes user from activity
    app.post('/delete_member_from_activity', require('./user/model.js').removeUser);

    app.post('/create_tag', require('./tag/crud.js').create);
    //returns all tags sorted by language
    app.post('/tag_dictionary', require('./tag/crud.js').dictionary);

    app.post('/create_activity', require('./activity/crud.js').create);

    app.get('/discover_activities', require('./activity/model.js').discover);

    app.post('/activity_update', require('./activity/crud.js').update);

    app.get('/activity_un_search', require('./activity/crud.js').search);

    app.post('/remove_activity', require('./activity/crud.js').remove);

    app.post('/fb_activities', require('./activity/create_fb'));

    app.post('/system_message', function(request, response){
        NotificationOperations.sendSystemMessage(request.body.message, request.body.title, function(err){
            if(err){ response.send(err) }
            else{ response.send('message sent') }
        });
    });

    app.get('/loaderio-a327d6c55c412e4ff973d1d816ddb861.html', function(req, res){

        res.send('loaderio-a327d6c55c412e4ff973d1d816ddb861');///
    });

    app.post('/update_image', function(request, response){
        Activity.updateImage(request.body, function(err, result){
            if(err){response.json({ result: 'error', data: error.message }); }
            else{
                var resJson = { result: 'success', data: result };
                resJson.notForCreator = true;
                Socket.sendMyActivityUpdate(result._id, resJson/*, resUsers*/);
                response.json(resJson);
            }
        })
    });

    app.post('/invite', function(request, response){
        var isSingle = 1;
        var inviteType = request.body.socialType? request.body.socialType: null;
        if(request.body.isSingle){
            //console.log('invite: ', request.body, request.body.isParticipant);
            isSingle = request.body.isSingle;
        }
        //var stab = 'here will be a pretty smart new message to invite your friends in the activity ';
        Activity.inviteToActivity(request.body.link, request.body.creator, request.body.activityId,
            isSingle, inviteType, request.body.isParticipant, function(err, resLink, resMessage){
                if(err){ log.error(err); response.json({result: 'error', data: err.message }); }
                else{ response.json({ result: 'success', data: { link: resLink, message: resMessage } }); }
            });
    });

    app.post('/accept_invite', function(request, response){
        Activity.acceptInvite(request.body.inviteId, /*request.body.userId,*/
            function(err){
                if(err){ response.json({ result: 'error', data: err.message}); }
                else{ response.json({ result: 'success', data: null }) }
            })
    });

    app.post('/report_activity', function(request, response){
        //log.info('IN REPORT ACTIVITY INDEX: ', request.body);
        if(!checkReportFields(request.body)){
            report.receiveReport(request.body.userId, request.body.activityId,
                request.body.type, request.body.message, function(err){
                    if(err){ response.send({result: 'error', data: err }); }
                    else{ response.send({result: 'success', data: null });}
                } );
        }
        else{ response.send({result: 'error', data: 'Not enough fields for report' }); }
    });

    app.post('/get_subscribe', function(request, response){
            report.receiveReport(request.body.userId, request.body.activityId, 6, 'empty', function(err){
                    if(err){ response.send({result: 'error', data: err }); }
                    else{ response.send({result: 'success', data: null });}
                } );
    });

    app.post('/minifyLink', function(request, response){
        var shortener = require('../lib/urlShorter.js');
        if(request.body.link != null){
            shortener.minimizeUrl(request.body.link, function(err, resLink){
                if(err){ response.json({ result: "error", data: err }) }
                else{ response.json({ result: "success", data: resLink }) }
            })
        }
        else{ response.json({ result: "error", data: "no link in request" }) }

    });

    app.post('/device_register', function(request, response){
        console.log('DEVICE REGISTER REQUEST: ', request.body);
        if(checkDeviceIdFields(request.body)){
            User.saveDeviceId(request.body.userId, request.body.platform, request.body.deviceId
                , function(err){
                    if(err){
                        log.error(err);
                        response.json({ result: 'error', data: err });
                    }
                    else{
                        response.json({ result: 'success', data: null });
                    }
                })
        }
        else{ response.json({ result: 'error', data: 'not enough fileds' }); }
    });

    app.post('/device_unregister', function(request, response){
        console.log('DEVICE UNREGISTER REQUEST: ', request.body);
        if(request.body.userId){
            User.clearDeviceId(request.body.userId, function(err){
                if(err){ response.json({ result: 'error', data: err }); }
                else{ response.json({ result: 'success', data: null }); }
            })
        }
        else{ response.json({ result: 'error', data: 'not enough fileds' }); }
    });

   //returns reported activities
    app.get('/get_reports', function(request, response){
       report.getReports(function(err, resReports){
           if(err){
               log.error(err);
               response.json({result: 'error', data: err.message });
           }
           else{
               console.log('Got all reports:', resReports);
               response.json({result: 'success', data: resReports });
           }
       })
    });

    app.post('/proceed_report', function(request, response){
        report.proceedReport(request.body.activityId, function(err){
            if(err){ response.json({result: 'error', data: err.message }); }
            else{ response.json({result: 'success', data: null });
            }
        })
    });

    app.post('/reject_report', function(request, response){
        report.rejectReport(request.body.activityId, function(err){
            if(err){
                log.error(err);
                response.json({result: 'error', data: err.message });
            }
            else{ response.json({result: 'success', data: null }); }
        })
    });

    app.get('/command_dictionary', function(request, response){
        AppCommands.getCmdDictionary(function(err, resDict){
            if(err){
                log.error(err);
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
    });

    app.post('/commandDictionary', function(request, response){
        AppCommands.createCommand(null, request.body.control, request.body.command, request.body.cmdDictionary,
            function(err, resCmd){
                if(err){
                    log.error(err);
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
    }),

    app.get('/command_base', function(request, response){
            AppCommands.getCommandBase(function(err, resDict){
                if(err){
                    log.error(err);
                    response.json({
                        result: 'error',
                        data: 'err.message'
                    });
                }
                else{
                    console.log('COMMAND BASE LENGTH', resDict.length);
                    response.json({
                        result: 'success',
                        data: resDict
                    });
                }
            });
        });

    app.post('/support_chat', function(request, response){
        ChatBroker.updateSupportChat(request.body.chatId);
        response.json({result: 'success'});
    });

    app.post('/admin_chat', function(request, response){
        async.waterfall([
                function(callback){
                    Activity.createWelcomeActivity(request.body.userId, request.body.userLang, request.body.adminId, request.body.title, request.body.description
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
                    log.error(err);
                    response.json({
                        result: 'error',
                        data: err
                    })
                }
                else{
                    log.info('Admin chat created:', chat._id);
                    response.json({
                        result: 'success',
                        data: {
                            activity: activity,
                            chat: chat
                        }
                    })
                }
            });

    });

    app.post('/message_viewed', function(request, response){
        ChatBroker.messageViewed(request.body.userId, request.body.messageIds, function(err, res){
            if(err){
                log.error(err);
            }
            else{
                //
            }
            response.send();
        })
    });

};



