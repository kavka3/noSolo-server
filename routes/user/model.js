/**
 * Created by Ignat on 5/10/2016.
 */
var ActivityModel = require('../../models/activitiesOperations.js'),
    common = require('../../lib/commonFunctions.js'),
    Socket = require('../../lib/socket.js'),
    UserModel = require('../../models/userOperations.js')
    ;

module.exports = {
    enter: enter,
    leave: leave,
    removeUser: removeUser,
    deviceRegister: deviceRegister,
    deviceUnregister: deviceUnregister
};

function deviceUnregister(request, response){
    if(request.body.userId){
        UserModel.clearDeviceId(request.body.userId, function(err){
            if(err){ response.status(500).json({ message: err.message }); }
            else{ response.json({ result: 'success', data: null }); }
        })
    }
    else{ response.status(400).json({message: 'not enough fields' }); }
};

function deviceRegister(request, response){
    if(checkDeviceIdFields(request.body)){
        UserModel.saveDeviceId(request.body.userId, request.body.platform, request.body.deviceId
            ,function(err){
                if(err){
                    console.error(err);
                    response.status(500).json({error: err.message });
                }
                else{
                    response.json({ result: 'success', data: null });
                }
            });
    }
    else{ response.status(400).json({error: 'not enough fields' }); }
};

function checkDeviceIdFields(deviceIdObj){
    if(!common.isEmpty(deviceIdObj.userId) && !common.isEmpty(deviceIdObj.platform)
        && !common.isEmpty(deviceIdObj.deviceId)){ return true; }
    else{ return false; }
};

function enter(request, response){
    ActivityModel.userIn(request.body.userId, request.body.activityId,
        function(err, activity){
            if(err){
                console.error(err);
                response.status(500).json({ message: err.message });
            }
            else{
                var result = { result: 'success', data: activity };
                if(!common.isEmpty(activity)){
                    Socket.sendMyActivityUpdate(activity._id, result);
                }
                response.json(result);
            }
        });
};

function leave(request, response){
    ActivityModel.removeUserFromActivity(request.body.activityId, request.body.userId, false, false, function(err, result){
        var resJson = {};
        if(err){
            console.error(err);
            response.status(500).json({ message: err.message });
        }
        else{
            resJson.result = 'success';
            resJson.data = result;
        }
        if(!common.isEmpty(result)){
            Socket.sendMyActivityUpdate(result._id, { result: 'success', data: result });
        }
        response.json(resJson);
    });
};

function removeUser(request, response){
    ActivityModel.removeUserFromActivity(request.body.activityId, request.body.userId, true, false,function(err, resultActivity){
        var resJson = {};
        if(err){
            console.error(err);
            response.status(500).json({ message: err.message });
        }
        else{
            resJson.result = 'success';
            resJson.data = resultActivity;
            resJson.notForCreator = true;
        }
        Socket.sendMyActivityUpdate(resultActivity._id, { result: 'success', data: resultActivity });
        response.json(resJson);
    });
};
