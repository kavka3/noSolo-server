/**
 * Created by Ignat on 5/11/2016.
 */
var ActivityModel = require('../../models/activitiesOperations.js'),
    UserModel = require('../../models/userOperations.js'),
    common = require('../../lib/commonFunctions.js'),
    async = require('async'),
    report = require('../../models/reportOperations.js')
    ;


module.exports = {
    discover: discover,
    invite: invite,
    acceptInvite: acceptInvite,
    report: reportPost,
    subscribe: subscribe,
    minifyLink: minifyLink
};

function minifyLink(request, response){
    var shortener = require('../lib/urlShorter.js');
    if(request.body.link != null){
        shortener.minimizeUrl(request.body.link, function(err, resLink){
            if(err){ response.json({ result: "error", data: err }) }
            else{ response.json({ result: "success", data: resLink }) }
        })
    }
    else{ response.json({ result: "error", data: "no link in request" }) }

};

function subscribe(request, response){
    report.receiveReport(request.body.userId, request.body.activityId, 6, 'empty', function(err){
        if(err){ response.send({result: 'error', data: err }); }
        else{ response.send({result: 'success', data: null });}
    } );
};

function reportPost(request, response){
    if(!checkReportFields(request.body)){
        report.receiveReport(request.body.userId, request.body.activityId,
            request.body.type, request.body.message, function(err){
                if(err){ response.send({result: 'error', data: err }); }
                else{ response.send({result: 'success', data: null });}
            } );
    }
    else{ response.send({result: 'error', data: 'Not enough fields for report' }); }
};

function checkReportFields(obj){
    if(common.isEmpty(obj.userId) || common.isEmpty(obj.activityId) || common.isEmpty(obj.type)
        || common.isEmpty(obj.message)){ return false; }
    else{ return true; }
};

function acceptInvite(request, response){
    ActivityModel.acceptInvite(request.body.inviteId,
        function(err){
            if(err){ response.json({ result: 'error', data: err.message}); }
            else{ response.json({ result: 'success', data: null }) }
        })
}

function invite(request, response){
    var isSingle = 1;
    var inviteType = request.body.socialType? request.body.socialType: null;
    if(request.body.isSingle){
        isSingle = request.body.isSingle;
    }
    ActivityModel.inviteToActivity(request.body.link, request.body.creator, request.body.activityId,
        isSingle, inviteType, request.body.isParticipant, function(err, resLink, resMessage){
            if(err){ log.error(err); response.json({result: 'error', data: err.message }); }
            else{ response.json({ result: 'success', data: { link: resLink, message: resMessage } }); }
        });
};

function discover(request, response){
    if(!common.isEmpty(request.query.userId) && !common.isEmpty(request.query.long)
        && !common.isEmpty(request.query.lat)){
        UserModel.currentLocationUpdate(request.query.userId, [request.query.long, request.query.lat],
            function(err){
                if(err){ console.error('err'); }
            });
        discoverActivities(request.query.userId, request.query.long, request.query.lat, response);
    }
    else{
        var message = 'not enough fields to discover';
        console.error(message);
        response.status(500).json({ message: message });
    }
};

function discoverActivities(userId, long, lat, response){
    async.waterfall([
            function(callback){
                UserModel.findUser(userId, function(err, foundedUser){
                    if(err){ callback(err); }
                    else if(common.isEmpty(foundedUser)){ callback(new Error('user not found')); }
                    else{ callback(null, foundedUser) }
                });
            },
            function(foundedUser, callback){
                ActivityModel.discover([long, lat], foundedUser,
                    function(err, discovered){
                        if(err){ callback(err); }
                        else{ callback(null, discovered) }
                    });
            }
        ],
        function(err, discovered){
            if(err){
                console.error(err);
                response.status(500).json({ message: err.message });
            }
            else{
                response.json({
                    result: 'success',
                    data: discovered
                });
            }
        });
};