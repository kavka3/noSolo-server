/**
 * Created by Ignat on 12/1/2015.
 */
var User = require('./userOperations.js'),
    ActivityOperations = require('./activitiesOperations.js'),
    common = require('../lib/commonFunctions.js'),
    async = require('async')
;

module.exports = {
    sendMyActivities: function(userId, callbackDone){
        if(!common.isEmpty(userId)){
            async.waterfall([
                    function(callback){
                        User.universalUserSearch('_id', userId, function(err, user){
                            if(err){ callback(err); }
                            else if(!common.isEmpty(user)){
                                var activitiesPending = [];
                                var activitiesJoined = user[0].activitiesJoined;
                                if(!common.isEmpty(user[0].activitiesLiked)){
                                    for(var i = 0; i < user[0].activitiesLiked.length; i++){
                                        activitiesPending.push(user[0].activitiesLiked[i]['activityId']);
                                    }
                                    var allActs = common.union(activitiesPending, activitiesJoined);
                                    callback(null, allActs);
                                }
                                else{
                                    callback(null, activitiesJoined);
                                }
                            }
                            else{ callback('User not found'); }
                        })
                    },
                    function(activities,  callback){
                        if(!common.isEmpty(activities)){
                            ActivityOperations.getMyActivities(activities, userId, function(err, resAct){
                                if(err){ callback(err); }
                                else{ callback(null, resAct); }
                            });
                        }
                        else{
                            callback(null, []);
                        }


                    }
                ],
                function(err, activities){
                    if(err){
                        console.error(err);
                        callbackDone(err);
                    }
                    else{
                        callbackDone(null, activities);
                    }
                });
        }
        else{ callbackDone(new Error('User not found')); }
    }
};

