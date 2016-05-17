/**
 * Created by Ignat on 5/10/2016.
 */
var async = require('async'),
    common = require('../../lib/commonFunctions.js'),
    activitiesService = require('../../models/activitiesOperations.js'),
    userService = require('../../models/userOperations.js')
;


module.exports = {
    signIn: signIn,
    remove: remove,
    update: update,
    search: search,
    block: block
};

function signIn(request, response){
    var UserModel = require('../../models/userOperations.js');
    UserModel.signIn(request.body, function(err, result, isSignUp){
        if(err){ response.status(500).json({ message: err.message }); }
        else{ response.json({
            result: "success",
            data: result,
            isSignUp: isSignUp
        });
        }
    });
};

function remove(request, response){
    var UserModel = require('../../models/userOperations.js');
    UserModel.deleteUser(request.body._id, function(err){
        if(err){ response.status(500).json({ message: err.message }); }
        else{ response.status(200).send(); }
    });
};

function update(request, response){
    var UserModel = require('../../models/userOperations.js');
    UserModel.universalUserUpdate(request.body, function(err, updatedUser){
        if(err){ response.status(500).json({ message: err.message }); }
        else{
            response.json({
                result: 'success',
                data: updatedUser
            });
        }
    });
};

function search(request, response){
    var UserModel = require('../../models/userOperations.js');
    UserModel.universalUserSearch(request.query.criteria, request.query.value,
        function(err, found){
            if(err){ response.status(500).json({ message: err.message }); }
            else{
                response.json({
                    result: 'success',
                    data: found
                });
            }
        });
};

function block(request, response){
    var userIds = request.body.userIds;
    if(!common.isEmpty(userIds)){
        async.each(userIds, blockIterator, function(err,res){
            if(err){ response.status(500).json({ message: err.message }) }
            else{ response.status(200).send(); }
        });
    }
    else{response.status(400).json({ message: 'no userIds'}) }

};

function blockIterator(userId, callbackI){
    async.waterfall([
            //get activities ids
            function(callback){
                activitiesService.getUserActivitiesIds(userId, function(err,res){
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
                userService.deleteUser(userId,function(err){
                    if(err){ callback(err); }
                    else{ callback(null); }
                });
            },
            //add to block list
            function(callback){
                userService.addToBlockList(userId,function(err, blockedUser){
                    if(err){ callback(err); }
                    else{ callback(null, blockedUser); }
                });
            }
        ],
        function(err, result){
            if(err){ callbackI(err); }
            else{ console.log(result); callbackI(null); }
        })
};

function deleteActivityIterator(userId, activity, callbackI){
    if(activity.creator == userId){
        activitiesService.deleteActivity(activity._id,function(err){
            if(err) {callbackI(err);}
            else{callbackI(null);}
        });
    }
    else{
        activitiesService.removeUserFromActivity(activity._id,userId,false,function(err){
            if(err) {callbackI(err);}
            else{callbackI(null);}
        });
    }
};

