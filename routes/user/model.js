/**
 * Created by Ignat on 5/10/2016.
 */
var ActivityModel = require('../../models/activitiesOperations.js'),
    common = require('../../lib/commonFunctions.js'),
    Socket = require('../../lib/socket.js')
    ;

module.exports = {
    enter: enter,
    leave: leave,
    removeUser: removeUser
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
    ActivityModel.removeUserFromActivity(request.body.activityId, request.body.userId, false, function(err, result){
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
    Activity.removeUserFromActivity(request.body.activityId, request.body.userId, true, function(err, resultActivity){
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
