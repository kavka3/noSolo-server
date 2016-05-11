/**
 * Created by Ignat on 5/11/2016.
 */
var ActivityModel = require('../../models/activitiesOperations.js'),
    UserModel = require('../../models/userOperations.js'),
    common = require('../../lib/commonFunctions.js'),
    async = require('async')
    ;


module.exports = {
    discover: discover
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