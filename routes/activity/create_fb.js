/**
 * Created by Ignat on 5/3/2016.
 */
var activityModel = require('../../models/activitiesOperations.js'),
    activitySchema = require('../../data/activitySchema.js'),
    userModel = require('../../models/userOperations.js'),
    async = require('async'),
    upload = require('../../lib/uploadImages.js'),
    common = require('../../lib/commonFunctions.js')
;

module.exports = function createFbActivities(req, res){
    async.waterfall([
        //get activities to create and to update
        function(callback){
            var allActivities = req.body.activities;
            var userId = req.body.userId;
            if(!common.isEmpty(allActivities) && userId){
                var existIds = [];
                var toUpdateIds = [];
                var toCreate = [];
                var activityIds = allActivities.map(function(activity){
                    return activity.fbId;
                });
                activitySchema.find({fbId: {'$in' : activityIds}}, 'fbId',
                    function(err, existActivities){
                        if(err){ callback(err); }
                        else{
                            if(!common.isEmpty(existActivities)){
                                existIds = existActivities.map(function(activity){
                                    return activity.fbId;
                                });
                                var toCreateIds = common.getArraysDifference(activityIds, existIds);
                                if(!common.isEmpty(toCreateIds)){
                                    toCreate = allActivities.filter(function(activity){
                                        return toCreateIds.indexOf(activity.fbId) > -1;
                                    });
                                }
                                var toUpdateFbIds = common.getArraysIntersection(activityIds, existIds);
                                var toUpdateObjs = allActivities.filter(function(activity){
                                    return activity.isGoing && toUpdateFbIds.indexOf(activity.fbId) > -1;
                                });
                                if(!common.isEmpty(toUpdateObjs)){
                                    toUpdateIds = toUpdateObjs.map(function(activity){
                                        return activity._id;
                                    });
                                }
                                callback(null, userId, toCreate, toUpdateIds);
                            }
                            else{ callback(null, userId, allActivities, null ) }

                        }
                    });
            }
            else{ callback(new Error('no activities to create')); }
        },
        //update exist activities
        function(userId, toCreate, toUpdateIds, callback){
            var resActs = [];
            if(!common.isEmpty(toUpdateIds)){
                async.each(toUpdateIds, updateIterator.bind(null, userId, resActs), function(err, res){
                    if(err){ callback(err); }
                    else{ callback(null, userId, toCreate, resActs); }
                })
            }
            else{ callback(null, userId, toCreate, resActs); }
        },
        //create new activities
            function(userId, toCreate, resActs, callback){
                if(!common.isEmpty(toCreate)){
                    async.each(toCreate, createIterator.bind(null, userId, resActs), function(err, res){
                        if(err){ callback(err); }
                        else{ callback(null, resActs); }
                    })
                }
                else{ callback(null, resActs); }
            }
    ]
        ,function(err, resActs){
            if(err){
                console.error(err);
                res.status(500).json({error: err.message});
            }
            else{ res.json({data: resActs}); }

    });
};

function updateIterator(userId, resActs, activityId, callbackUI){
    activityModel.userIn(userId, activityId, function(err, activity){
        if(err){ callbackUI(null); }
        else{
            resActs.push(activity);
            callbackUI(null);
        }
    });
};

function createIterator(userId, resActs, toCreate, callbackCI){
    async.waterfall([
            //find creator or create fake one if not exists
            function(callback){
                userModel.findUser(toCreate.creator._id, function(err, resUser){
                    if(err){ callback(err); }
                    else if(!common.isEmpty(resUser)){ callback(null, resUser); }
                    else{
                        createFakeUser(toCreate.creator, 'faceBook', function(err, resUser){
                            if(err){ callback(err); }
                            else{ callback(null, resUser); }
                        });
                    }
                })
            },
            //tinify image
            function(creator, callback){
                var uri = toCreate.imageUrl || 'https://s3.amazonaws.com/nosoloimages/adefault.png';
                var fileName = toCreate.fbId;
                upload.downLoadFile(uri, fileName, function(err, resLink){
                    if(err){ callback(new Error("Can't tinify image")); }
                    else{ callback(null, creator, resLink); }
                })
            },
            //create activity
            function(creator, imageUrl, callback){
                var newActivity = {
                    title: toCreate.title,
                    imageUrl: imageUrl,
                    location: toCreate.location,
                    creator: creator._id,
                    timeStart: toCreate.timeStart,
                    timeFinish: toCreate.timeFinish,
                    fbId: toCreate.fbId,
                    description: toCreate.description,
                    maxMembers: toCreate.maxMembers,
                    formattedAddress: toCreate.formattedAddress,
                    isPrivate: toCreate.isPrivate
                };
                activityModel.createActivity(newActivity, function(err, createdAct){
                    if(err){ callback(err); }
                    else{ callback(null, createdAct) }
                })
            },
            //add user in if necessary
            function(activity, callback){
                if(toCreate.isGoing && userId != toCreate.creator._id){
                    activityModel.userIn(userId, activity._id,
                        function(err, changed){
                            if(err){ callback(err); }
                            else{ callback(null, changed); }
                        });
                }
                else{ callback(null, activity); }
            },
            //check if need to add activity to response
            function(activity, callback){
                if(userId == toCreate.creator._id || toCreate.isGoing){
                    resActs.push(activity);
                }
                callback(null);
            }
        ]
        ,function(err, activity){
            if(err){ console.error(err); }
            callbackCI(null);
        })
};

function createFakeUser(user, origin, callback){
    userModel.createFbUser(user, origin, function(err, resUser){
        if(err){ callback(err); }
        else{ callback(null, resUser); }
    })
};