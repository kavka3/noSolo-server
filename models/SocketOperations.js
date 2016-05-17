/**
 * Created by Ignat on 12/1/2015.
 */
var UserModel = require('./userOperations.js'),
    ActivityModel = require('./activitiesOperations.js'),
    common = require('../lib/commonFunctions.js'),
    async = require('async')
;

module.exports = {
    sendMyActivities: sendMyActivities,
    blockedUser:  block
};

function sendMyActivities(userId, callbackDone){
    if(!common.isEmpty(userId)){
        async.waterfall([
                function(callback){
                    UserModel.universalUserSearch('_id', userId, function(err, user){
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
                        ActivityModel.getMyActivities(activities, userId, function(err, resAct){
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
};

function block(data, socket){
    var userIds = data.userIds;
    if(!common.isEmpty(userIds)){
        async.each(userIds, blockIterator, function(err){
            if(err){ socket.emit('system_users_blocked',{ result: 'error' }); }
            else{ socket.emit('system_users_blocked',{ result: 'success' }); }
        });
    }
    else{ socket.emit('system_users_blocked',{ result: 'error' }); }
};

function blockIterator(userId, callbackI){
    async.waterfall([
            //get activities ids
            function(callback){
                ActivityModel.getUserActivitiesIds(userId, function(err,res){
                    if(err){ callback(err); }
                    else{ callback(null, res); }
                });
            },
            //delete activities
            function(activitiesIds, callback){
                async.each(activitiesIds, deleteActivityIterator.bind(null, userId), function(err,res){
                    if(err){ callback(err); }
                    else{ callback(null); }
                });
            },
            //delete user
            function(callback){
                UserModel.deleteUser(userId,function(err){
                    if(err){ callback(err); }
                    else{ callback(null); }
                });
            },
            //add to block list
            function(callback){
                UserModel.addToBlockList(userId,function(err){
                    if(err){ callback(err); }
                    else{ callback(null); }
                });
            }
        ],
        function(err){
            if(err){
                console.error(err);
                callbackI(err);
            }
            else{
                var Socket = require('../lib/socket.js')
                Socket.sendUserBlock(userId);
                callbackI(null);
            }
        })
};

function deleteActivityIterator(userId, activity, callbackI){
    if(activity.creator == userId){
        ActivityModel.deleteActivity(activity._id,function(err){
            if(err) {callbackI(err);}
            else{callbackI(null);}
        });
    }
    else{
        ActivityModel.removeUserFromActivity(activity._id,userId,false,function(err){
            if(err) {callbackI(err);}
            else{callbackI(null);}
        });
    }
};


