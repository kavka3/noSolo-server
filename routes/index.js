var log = require('../lib/log.js')(module),
    Activity = require('../models/activitiesOperations.js'),
    User = require('../models/userOperations.js'),
    Base = require('../models/baseOperations.js'),
    Tag = require('../models/tagsOperations.js'),
    Invite = require('../data/inviteSchema.js'),
/*Chat = require('../models/chatManager.js'),
 Notification = require('../models/notificationSchema.js'), */
    NotificationOperations = require('../models/notificActions.js'),
    RedisTest = require('../lib/socket.js'),
    NotyMan = require('../models/notificationManager.js'),
//Socket = require('../lib/socket.js'),
    async = require('async'),
    s3signing = require('../lib/s3upload.js'),
    common = require('../lib/commonFunctions.js'),
    report = require('../models/reportOperations.js')

NOT_ENOUGH_FIELDS = 'not enough fields to operation',

    AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY,
    AWS_SECRET_KEY = process.env.AWS_SECRET_KEY,
    S3_BUCKET = process.env.S3_BUCKET;

/*function sendServiceMessage(canContinue, message, iosLink, androidLink){
 NotificationOperations.sendUpdateMessage(canContinue, message, iosLink, androidLink);
 }*/

/*sendServiceMessage(1, 'close it now! We have new Amazing Application, so you can download this stuff', 'https://itunes.apple.com/il/app/pes-club-manager/id930350602?mt=8',
 'https://play.google.com/store/apps/details?id=com.appsministry.fixikirepair');*///https://play.google.com/store/apps/details?id=com.appsministry.fixikirepair

function getDetails(users){
    var usersArray = [];
    for(var i = 0; i < users.length; i++){
        var userObj = {};
        userObj['userId'] = users[i]._id;
        userObj['userName'] = users[i].surname;
        userObj['imageLink'] = users[i].imageUrl;
        usersArray.push(userObj);
    }
    return usersArray;
};

function getCreator(users, creatorId){
    var index;
    for(var i = 0; i < users.length; i++){
        if(users[i]._id == creatorId){
            index = i;
        }
    }
    return users[index];
};

/*function addUsersToActivity(response, foundedActivities, resJson){
 //field for results
 resJson.data = [];
 //loop for activities
 var iteratorI = function(activity, callbackDoneI){
 var activityUsers = JSON.parse(JSON.stringify(activity));
 activityUsers['joinedUsersDetails'] = [];
 User.getUsersByList(activity.joinedUsers, function(err, resUsers){
 if(err){
 callbackDoneI(err);
 }
 else{
 if(resUsers.length != 0){
 var usersDetails = getDetails(resUsers, activity.creator);
 var creator = getCreator(resUsers, activity.creator);

 activityUsers['joinedUsersDetails'] = usersDetails;
 activityUsers['creatorName'] = creator.surname;
 activityUsers['creatorUrl'] = creator.imageUrl;
 activityUsers['about'] = creator.about;

 resJson.data.push(activityUsers);
 callbackDoneI();
 }
 else{
 log.info('there are no users in activity: ' + activity._id);
 callbackDoneI();
 }
 }
 })
 };
 //here functions of else case are starting
 async.series([
 function(callback) {
 //loop for activities runs here
 async.eachSeries(foundedActivities, iteratorI, function(err){
 if (err){
 log.error(err.message);
 callback(err);
 }
 callback(null);
 });
 },
 function(callback) {
 resJson.result = 'success';
 response.json(resJson);
 callback(null);
 }
 ],
 function(err,results){
 if(err){
 log.error(err.message);
 resJson.result = 'error';
 resJson.errMessage = err.message;
 }
 });
 };*/

function getNotForFind(foundedUser){
    var userDislikes = foundedUser.activitiesDisliked;
    var iterateActivityLike = foundedUser.activitiesLiked;
    var activitiesLiked = [];
    for(var i = 0; i < iterateActivityLike.length; i++){
        activitiesLiked.push(iterateActivityLike[i].activityId)
    }
    if(activitiesLiked.length != 0){
        userDislikes = userDislikes.concat(activitiesLiked);
    }
    userDislikes  = userDislikes.concat(foundedUser.activitiesJoined);
    var actArray = userDislikes.map(String);


    return actArray;
};

function discoverActivity(userId, long, lat, response){
    var resJson = {};
    User.findUser(userId, function(err, foundedUser){
        if(err){
            resJson.result = 'error';
            resJson.data = err.message;
            response.json(resJson);
        }
        else if(foundedUser == 'user is not found') {
            resJson.result = 'error';
            resJson.data = 'user is not found';
            response.json(resJson);
        }
        else{
            var actArray = getNotForFind(foundedUser);
            Activity.searchLocation({ cords:[long, lat],
                    radius: foundedUser.radius, userId: userId, notFindArray: actArray},
                function(err, foundedActivities){
                    if(err){
                        resJson.result = 'error';
                        resJson.data = err.message;
                    }
                    else if(foundedActivities == 'activity is not found') {
                        resJson.result = 'error';
                        resJson.data = 'activity is not found';
                        response.json(resJson);
                    }
                    else{
                        resJson.result = 'success';
                        resJson.data = foundedActivities;
                        response.json(resJson);
                    }
                });
        }
    });
};

function compareAct(oldAct, newAct){
    var clone = common.deepObjClone(oldAct);
    var changedFields = [];
    for(var key in clone){
        switch(key){
            case 'title':case 'description':case 'imageUrl':case 'isApprovalNeeded':case 'isTimeFlexible':
            case 'isGroup':case 'isLocationSecret':case 'isTimeSecret':case 'maxMembers':case 'isPrivate':{
            if(clone[key] != newAct[key]){ console.log('KEY CHANGED: ', key),changedFields.push(key); }
        }; break;
            case 'timeStart':case 'timeFinish':{
            if(!common.isEqual(new Date(clone[key]), new Date(newAct[key]) )){ console.log('KEY CHANGED: ', key),changedFields.push(key); }
        };break;
            case 'location':{
                for(var i = 0; i < clone[key].length; i++){
                    if(clone[key][i] != newAct[key][i]){ console.log('KEY CHANGED: ', key),changedFields.push(key); break; }
                }
            }; break;
            case 'tags':{
                if(!common.isEmpty(clone[key]) && !common.isEmpty(newAct[key])){
                    console.log('TAGS: ', clone[key], newAct[key]);
                    if(!common.isEqual(clone[key], newAct[key])){ console.log('KEY CHANGED: ', key),changedFields.push(key); }
                }
                /*if(clone[key].length != newAct[key].length){ console.log('KEY CHANGED: ', key);changedFields.push(key); }
                 for(var i = 0; i < clone[key].length; i++){
                 if(clone[key][i] != newAct[key][i]){ console.log('KEY CHANGED: ', key, ' ', clone[key][i], ' ', newAct[key][i]); changedFields.push(key); }
                 }*/
            }; break;
            default: break;
        }
    }
    console.log('CHANGED FIELDS:', changedFields);
    return changedFields;
};

/*function checkActivityFields(obj, callbackDone){
 if(common.isEmpty(obj.title) || common.isEmpty(obj.creator) || common.isEmpty(obj.location)
 || common.isEmpty(obj.timeFinish) || common.isEmpty(obj.timeStart)){
 callbackDone(new Error('not enough fields'));
 }
 else{
 var resObj = common.deepObjClone(obj);
 resObj.creator = obj.creator._id;
 if(!common.isEmpty(obj.tags)){
 var arr = [];
 for(var i = 0; i < obj.tags.length; i++){
 arr.push(obj.tags[i]._title)
 }
 resObj.tagsByLanguage = obj.tags;
 resObj.tags = arr;
 }
 Activity.findActivity(obj._id, function(err, oldAct){
 if(err){
 log.error(err);
 callbackDone(err);
 }
 else{
 resObj['changedField'] = compareAct(oldAct, obj);
 callbackDone(null, resObj);
 }
 });
 }
 };*/

function checkActivityFields(obj){
    if(common.isEmpty(obj.title) || common.isEmpty(obj.creator) || common.isEmpty(obj.location)
        || common.isEmpty(obj.timeFinish) || common.isEmpty(obj.timeStart)){
        return null;
    }
    else{
        var resObj = common.deepObjClone(obj);
        resObj.creator = obj.creator._id;
        if(resObj.tags && resObj.tags.length == 0){
            console.log('DELETE TAGS');
            delete resObj.tags;
            delete resObj.tagsByLanguage;
        }
        else if(!common.isEmpty(resObj.tags)){
            var arr = [];
            for(var i = 0; i < obj.tags.length; i++){
                if(obj.tags[i]._title != undefined){
                    arr.push(obj.tags[i]._title);
                }
            }
            if(!common.isEmpty(arr)){ resObj.tags = arr; }
            var tagsByLang = [];
            for(var i = 0; i < obj.tags.length; i++){
                var tagObj = {};
                tagObj['name'] = obj.tags[i]['name'];
                tagObj['imageUrl'] = obj.tags[i]['imageUrl'];
                tagObj['tagCategory'] = obj.tags[i]['tagCategory'];
                tagObj['_title'] = obj.tags[i]['_title'];
                tagsByLang.push(tagObj);
            }
            resObj.tagsByLanguage = tagsByLang;

        }
        return resObj;
    }
};

function checkActivityFieldsUpd(obj, callbackDone){
    if(common.isEmpty(obj.title) || common.isEmpty(obj.creator) || common.isEmpty(obj.location)
        || common.isEmpty(obj.timeFinish) || common.isEmpty(obj.timeStart)){
        callbackDone(new Error('not enough fields'));
    }
    else{
        //console.log('IN UPDATE: ', obj);
        var resObj = common.deepObjClone(obj);
        resObj.creator = obj.creator._id;
        resObj['creatorName'] = obj.creator.surname;
        if(resObj.tags && resObj.tags.length == 0){
            console.log('DELETE TAGS');
            delete resObj.tags;
            delete resObj.tagsByLanguage;
            delete resObj.joinedUsers;
        }
        else if(!common.isEmpty(resObj.tags)){
            var arr = [];
            for(var i = 0; i < obj.tags.length; i++){
                if(obj.tags[i]._title != undefined){
                    arr.push(obj.tags[i]._title);
                }
            }
            resObj.tagsByLanguage = obj.tags;
            if(!common.isEmpty(arr)){ resObj.tags = arr; }
            var tagsByLang = [];
            for(var i = 0; i < obj.tags.length; i++){
                var tagObj = {};
                tagObj['name'] = obj.tags[i]['name'];
                tagObj['imageUrl'] = obj.tags[i]['imageUrl'];
                tagObj['tagCategory'] = obj.tags[i]['tagCategory'];
                tagObj['_title'] = obj.tags[i]['_title'];
                tagsByLang.push(tagObj);
            }
            resObj.tagsByLanguage = tagsByLang;
        }
        Activity.findActivity(obj._id, function(err, oldAct){
            if(err){
                log.error(err);
                callbackDone(err);
            }
            else{
                resObj['changedField'] = compareAct(oldAct, resObj);
                //console.log('FINAL OBJ: ', resObj);
                callbackDone(null, resObj);
            }
        });
    }
};

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

/*function changeUserRadius(){
 User.getAllUsers(function(err, users){
 if(err){ console.log('ups')}
 else{
 for(var i = 0; i < users.length;i++){
 users[i].radius = 200;
 users[i].save(function(err){
 if(err){ console.log(err); }
 else{ console.log('done') }
 })
 }
 }
 });
 };*/

module.exports = function(app){

    app.get('/', function(request, response){
        /* Chat.createMessage('1', '2', function(err){
         if(err){
         response.send('err.message');
         }
         else{
         response.send('application runs, make your requests');
         }
         })*/
        /*Activity.calculateDistance([34.904042,32.321543],[  34.891618, 32.256844], function(err, result){
         ;
         });*/
        /*  log.info('notify test started');
         var newNotify = Notification({ creator: "test user1" , addressee: "test user2"
         , notificationType: 1, specialData: "550988f29179010300a9238d" });
         Socket.notifyToOne(newNotify);*/
        //RedisTest.sendToRedis('smth');
        //changeUserRadius();
        response.end('this is a base page, choose action in app');
    });

    /**
     * @api {post} /signIn Login loads User or creates new one
     * @apiGroup User
     * @apiName login
     * @apiParam {String} _id user social id
     * @apiParam {String} socialToken
     * @apiParam {ObjectId} noSoloId system fills it automatically
     * @apiParam {String} surname
     * @apiParam {String} familyName
     * @apiParam {Date} birthDate
     * @apiParam {String} gender male, female or unknown
     * @apiParam {String} email
     * @apiParam {String} [imageUrl]
     * @apiParam {float} [firstGeoLogin]
     * @apiParam {float} [currentLocation]
     * @apiParam {int} [preferredAgeMin]
     * @apiParam {int} [preferredAgeMax]
     * @apiParam {ObjectId[]} [activitiesCreated]
     * @apiParam {ObjectId[]} [activitiesLiked]
     * @apiParam {ObjectId[]} [activitiesDisliked]
     * @apiParam {ObjectId[]} [tagsPreferences]
     * @apiParam {String[]} [userContacts]
     * @apiParam {float} [radius]
     * @apiParam {int} [ranking]
     * @apiParam {int} [rating]
     * @apiParam {String} userLanguage='eng'
     * @apiParam {String} systemLanguage='eng'
     * @apiParam {String} [about]
     * @apiParam {json} [settings]:default: { 'joinApprovals': true, 'joinRequests': true, 'newActivities' : true, 'newMessages': true }
     * @apiParam {json} uniqueDeviceId{type: 'ios' || 'android' && deviceId: String}
     * @apiParam {json} [lastActivityUrl] (type: String, default: 'https://s3.amazonaws.com/nosoloimages/adefault.png')
     * @apiSuccess {json} userField returns all user fields
     * @apiError {json} error returns error.message
     * @apiExample {json} User signin/creation example with minimum fields:
     * {
     * "_id": "526139373",
     * "socialToken": "CAANEgpuoVP8BAJqACj3KM8ZB52Cx6ZAeDN0zfmF3xjeuDV5DYOLUCfxRl5wFupmgUQGkfIsteCaNj6mZBf942nBCb1eFXFdX1SajqNY6r1qip24hQgRvCG3WcwBLWyyrVujNMTIEb6CfBJdszssQZBjmOoZC8PXvuphL6cL5XhXGBZBmx0gYGh0XnTfrOpMWmSg7N6hIiYSHhleZC2ULZCIgJCkgmi6amm4ZD",
     * "surname": "Pedro",
     * "familyName": "Gusman",
     * "birthDate": "1985-12-14T22:00:00.000Z",
     * "gender": "male",
     * "email": "pedro@redTLV.com"
     * }
     */
    app.post('/signIn', function(request, response){
        User.signIn(request.body, function(err, result){
            if(err){
                response.json({result: "error", data: err.message});
            }
            else{
                request.session.user = result._id;
                response.json({result: "success", data: result});
            }
        });
    });

    /**
     * @api {get} /logout Logout
     * @apiGroup User
     * @apiName logout
     */
    app.get('/logout', function(request, response){
        var user = request.session.user;
        request.session.destroy(function(){
            log.info('session destroyed: ' + user);
            response.send({});
        });
    });

    app.post('/delete_user', function(request, response){
        log.info(request.ip);
        User.deleteUser(request.body._id, function(err, result){
            request.session.destroy(function(){
                response.redirect('/');
            });
        });
    });

    app.get('/clear_testing_base', function (request, response){
        Base.clearBase(function(text){
            log.info(text);
            response.send(text);
        })
    });

    /**
     * @api {post} /create_tag Tag creation
     * @apiGroup Tag
     * @apiName tag creation
     * @apiParam {String} _title
     * @apiParam {ObjectId[]} [activities]
     * @apiParam {json[]} [tagDictionary]
     * @apiParam {json} [tagCategory]
     * @apiSuccess {json} result:success
     * @apiSuccess {json} _title:_title
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     * @apiExample {json} Create tag example with all fields:
     * {
     * "_title": "basketball",
     * "tagDictionary": [{"ru": "баскетбол"}, {"he": "כדורסל"}]
     * }
     */
    app.post('/create_tag', function (request, response) {
        var resJson = {};
        Tag.createNewTag(request.body, function(err, result){
            if(err){
                resJson.result = 'error';
                resJson.data = err.message;
            }
            else{
                resJson.result = 'success';
                resJson.data = result;
            }
            log.info("tag created");
            console.log(result);
            response.json(resJson);
        })
    });

    /**
     * @api {post} /create_activity Create activity
     * @apiGroup Activity
     * @apiName create activity
     * @apiParam {ObjectId} _id fills by system
     * @apiParam {String} title
     * @apiParam {String} [description]
     * @apiParam {String} [imageUrl]
     * @apiParam {float[]} location in format: long;lat
     * @apiParam {String} creator user id
     * @apiParam {Object[]} [tags]
     * @apiParam {String[]} [joinedUsers]
     * @apiParam {String} timeStart format in js Date format
     * @apiParam {String} timeEnd format in js Date format
     * @apiParam {Boolean} isApprovalNeeded=true
     * @apiParam {Boolean} isTimeFlexible=true
     * @apiParam {Boolean} isGroup=true
     * @apiParam {Boolean} isLocationSecret=true
     * @apiParam {Boolean} isTimeSecret=true
     * @apiParam {int} [maxMembers]
     * @apiSuccess {json} result:success
     * @apiSuccess {json} activity returns all activity fields
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     * @apiExample {json} Create activity example:
     * {
     * "title": "poker",
     * "creator": "767240993367525",
     * "location": [
     *    34.85992,
     *    32.33292
     * ],
     * "timeFinish": "2015-02-22T12:40:00.192Z",
     * "timeStart": "2015-02-22T19:00:00.189Z",
     * "tags": [{
     * "__v": 0,
     * "_title": "test tag10",
     * "_id": "552e51d4390b59700f0915cf",
     * "tagCategory": [ ],
     * "tagDictionary": [ ],
     * "activities": [ ]
     * },
     * {
     * "__v": 0,
     * "_title": "test tag50",
     * "_id": "552e53f3b23d10cc0550c898",
     * "tagCategory": [ ],
     * "tagDictionary": [ ],
     * "activities": [ ]
     * }]
     * }
     *
     */
    app.post('/create_activity', function(request, response){
        log.info('IN CREATE ACTIVTITY ROUTE:');
        console.log(request.body);
        var resJson = {};
        var activityObj = checkActivityFields(request.body);
        if(activityObj){
            Activity.createActivity(activityObj, function(err, result){
                if(err){
                    resJson.result = 'error';
                    resJson.data = err.message;//may be damaged from tagsOperations 28
                }
                else{
                    resJson.result = 'success';
                    resJson.data = result;
                }
                log.info('Created activity: ' + resJson.data._id);
                response.json(resJson);
            });
        }
        else{
            resJson.result = 'error';
            resJson.data = NOT_ENOUGH_FIELDS;
            response.json(resJson);
        }
    });

    /**
     * @api {post} /user_update Update any user fields
     * @apiGroup User
     * @apiName user update
     * @apiParam {String} _id user facebook id
     * @apiParam {String} criteria name of changing field
     * @apiParam {String} value value of changing field
     * @apiExample {json} User update example:
     * {
     * "_id": "767240993367525",
     * "criteria": "about",
     * "value":"Si felix esse vis, este!"
     * }
     * @apiSuccess {json} result:success
     * @apiSuccess {json} user returns all user fields
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     *
     */
    app.post('/user_update', function(request, response){
        var resJson = {};
        User.universalUserUpdate(request.body, function(err, result){
            if(err){
                resJson.result = 'error';
                resJson.errMessage = err.message;
            }
            else{
                resJson.result = 'success';
                resJson.data= result;
            }
            response.json(resJson);
        });
    });

    /**
     * @api {get} /discover_activities Activity Search by preferences and radius
     * @apiGroup Activity
     * @apiName GeoSearch
     * @apiParam {String} userId user._id
     * @apiParam {String} long
     * @apiParam {String} lat
     * @apiSuccess {json} result success
     * @apiSuccess {json[]} usersInActivity returns activity._id & all founded in activity users
     * @apiSuccess {json[]} activities returns all founded activities
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     * @apiExample{url} Activity search example:
     * https://vast-plains-3834.herokuapp.com/discover_activities?userId=767240993367525&long=34.85992&lat=32.33292
     *
     */
    app.get('/discover_activities', function(request, response){
        if(!common.isEmpty(request.query.userId) && !common.isEmpty(request.query.long)
            && !common.isEmpty(request.query.lat)){
            User.currentLocationUpdate(request.query.userId, [request.query.long, request.query.lat],
            function(err){
                if(err){ log.error('err'); }
            });
            discoverActivity(request.query.userId, request.query.long, request.query.lat, response);
        }
        else{ response.json({ result: error, data: NOT_ENOUGH_FIELDS }); }

    });

    /**
     * @api {post} /activity_update Update any activity fields
     * @apiGroup Activity
     * @apiName activity update
     * @apiParam {json} activity
     * @apiExample {json} Activity update example:
     * {
     * "__v": 0,
     * "title": "test activity update",
     * "creator": "avatar",
     * "location": [
     * 21.00,
     * 22.00
     * ],
     * "timeFinish": "2015-05-22T12:40:00.192Z",
     * "timeStart": "2015-05-22T19:00:00.189Z",
     * "maxMembers": 5,
     * "description": "only real masters will be accepted!",
     * "_id": "552e5424b23d10cc0550c899",
     * "isPrivate": false,
     * "distance": 0,
     * "isTimeSecret": true,
     * "isLocationSecret": true,
     * "isGroup": false,
     * "isTimeFlexible": true,
     * "isApprovalNeeded": true,
     * "recurUsers": [ ],
     * "followingUsers": [ ],
     * "joinedUsers": [
     * "avatar"
     * ],
     * "tags": [
     * "test tag",
     * "test tag10"
     * ]
     * }
     * @apiSuccess {json} result:success
     * @apiSuccess {json} activity return all activity fields
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     *
     */
    app.post('/activity_update', function(request, response){
        //console.log('ACTIVITY FOR UPDATE', request.body);
        var resJson = {};
        checkActivityFieldsUpd(request.body, function(err, activityObj){
            if(!err){
                Activity.universalActivityUpdate(activityObj, function(err, resAct){
                    if(err){
                        resJson.result = 'error';
                        resJson.data = err.message;
                    }
                    else if(resAct == 'activity is not found') {
                        resJson.result = 'error';
                        resJson.data = 'activity is not found';
                    }
                    else{
                        resJson.result = 'success';
                        resJson.data = resAct;
                    }
                    response.json(resJson);
                });
            }
            else{
                resJson.result = 'error';
                resJson.data = err.message;
                response.json(resJson);
            }
        })
    });

    /**
     * @api {post} /file_upload Uploads pictures for users and activities
     * @apiGroup Utilities
     * @apiName file upload
     * @apiParam {json} type userId/activityId/newActivityId/tagId
     * @apiParam {json} _id :User._id/Activity._id/in case of newActivityId:empty
     * @apiSuccess {json} bucket: bucket
     * @apiSuccess {json} awsKey: awsKey
     * @apiSuccess {json} policy: policyBase64
     * @apiSuccess {json} signature: signature
     * @apiSuccess {json} fileName: fileName
     * @apiSuccess {json} activityId: activityId
     * @apiError {json} result :error
     * @apiExample {json} Params obj example:
     * {
     * "type": "userId",
     * "_id": "767240993367525"
     * }
     *
     */
    app.post('/file_upload', s3signing.sign);

    /**
     * @api {get}/activity_un_search Search by any activity fields
     * @apiGroup Activity
     * @apiName activity universal search
     * @apiParam {String} criteria criteria name
     * @apiParam {String} value criteria value
     * @apiExample {link} Activity search example:
     *
     * https://vast-plains-3834.herokuapp.com/activity_un_search?criteria=tags&value=Cards
     *
     * @apiSuccess {json} result:success
     * @apiSuccess {json} activities returns all activity fields
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     *
     */
    app.get('/activity_un_search', function(request, response){
        var resJson = {};
        Activity.universalActivitySearch(request.query.criteria, request.query.value,
            function(err, result){
                if(err){
                    resJson.result = 'error';
                    resJson.data = err.message;
                    response.json(resJson);
                }
                else if(result == 'activity is not found') {
                    resJson.result = 'error';
                    resJson.data = 'activity is not found';
                    response.json(resJson);
                }
                else{
                    resJson.result = 'success';
                    resJson.data = result;
                    response.json(resJson);
                }
            });
    });

    /**
     * @api {get}/user_un_search Search by any user fields
     * @apiGroup User
     * @apiName user universal search
     * @apiParam {String} criteria criteria name
     * @apiParam {String} value criteria value
     * @apiExample {link} User search example:
     *
     * https://vast-plains-3834.herokuapp.com/user_un_search?criteria=gender&value=male
     *
     * @apiSuccess {json} result:success
     * @apiSuccess {json[]} users returns all founded users
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     *
     */
    app.get('/user_un_search', function(request, response){
        var resJson = {};
        User.universalUserSearch(request.query.criteria, request.query.value,
            function(err, result){
                if(err){
                    resJson.result = 'error';
                    resJson.data = err.message;
                }
                else if(result == 'user is not found') {
                    resJson.result = 'error';
                    resJson.data = 'user is not found';
                }
                else{
                    resJson.result = 'success';
                    resJson.data = result;
                }
                response.json(resJson);
            });
    });

    /**
     * @api {post} /user_join_activity User joins to Activity
     * @apiGroup Activity
     * @apiName activity join
     * @apiParam {json} activityId :activity._id
     * @apiParam {json} userId :user._id
     * @apiExample {json} User joins example:
     * {
     * "activityId": "54ec4c54d293a903001e832d",
     * "userId":"767240993367525"
     * }
     * @apiSuccess {json} result:success
     * @apiSuccess {json} activity return all activity fields
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     *
     */
    app.post('/user_join_activity', function(request, response){
        NotificationOperations.joinApprove(null, request.body.userId
            , request.body.activityId, null, function(err){
                if(err){
                    log.error(err);
                    response.json({ result: 'error', data: err.message });
                }
                else{
                    response.json({ response: 'success', data: null});
                }
            });
    });

    /**
     * @api {post} /user_leave_activity User leaves Activity
     * @apiGroup Activity
     * @apiName activity leave
     * @apiParam {json} activityId :activity._id
     * @apiParam {json} userId :user._id
     * @apiExample {json} User leaves example:
     * {
     * "activityId": "54ec4c54d293a903001e832d",
     * "userId":"767240993367525"
     * }
     * @apiSuccess {json} result:success
     * @apiSuccess {json} data:return object activity + users details
     * @apiError {json} result:error
     * @apiError {json} data:err.message
     *
     */
    app.post('/user_leave_activity', function(request, response){
        Activity.removeUserFromActivity(request.body.activityId, request.body.userId, function(err, result){
            var resJson = {};
            if(err){
                log.error(err.message);
                resJson.result = 'error';
                resJson.data = err.message;
            }
            else{
                resJson.result = 'success';
                resJson.data = result;
            }
            response.json(resJson);
        });
    });

    /**
     * @api {post} /user_removed_from_activity User removed from activity by creator
     * @apiGroup Activity
     * @apiName activity leave
     * @apiParam {json} activityId :activity._id
     * @apiParam {json} userId :user._id
     * @apiExample {json} User leaves example:
     * {
     * "activityId": "54ec4c54d293a903001e832d",
     * "userId":"767240993367525"
     * }
     * @apiSuccess {json} result:success
     * @apiSuccess {json} data:return object activity + users details
     * @apiError {json} result:error
     * @apiError {json} data:err.message
     *
     */
    app.post('/deleted_member_from_activity', function(request, response){
        Activity.removeUserFromActivity(request.body.activityId, request.body.userId, function(err, resultActivity){
            var resJson = {};
            if(err){
                log.error(err.message);
                resJson.result = 'error';
                resJson.data = err.message;
            }
            else{
                resJson.result = 'success';
                resJson.data = resultActivity;
            }
            response.json(resJson);
        });
    });

    /**
     * @api {post} /remove_activity Remove Activity
     * @apiGroup Activity
     * @apiName activity remove
     * @apiParam {json} activityId :activity._id
     * @apiExample {json} Remove Activity example:
     * {
     * "_id":"54edf5df3aa33f03009ba039"
     * }
     * @apiSuccess {json} result:success
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     *
     */
    app.post('/remove_activity', function(request, response){
        Activity.deleteActivity(request.body._id, function(err){
            if(err){
                response.json({result: 'error', data: err.message});
            }
            else{
                response.json({result: 'success'});
            }
        })
    });

    /**
     * @api {post} /tag_dictionary Return all tags
     * @apiGroup Tag
     * @apiName tag dictionary
     * @apiParam {json} languages:['lang1', 'lang2' ...]
     * @apiSuccess {json} result:success
     * @apiSuccess {json} data:{ language: [ {_title: String, name: String, tagCategory: [String,..] } ,..] }
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     * @apiExample {json} Get Tag Dictionary example:
     * {
     * "languages": ["he", "ru"]
     * }
     */
    app.post('/tag_dictionary', function(request, response){
        Tag.getTagsDictionary(request.body.languages, function(err, result){
            var resJson = {};
            if(err){
                resJson.result = 'error';
                resJson.data = err.message;
            }
            else{
                resJson.result = 'success';
                resJson.data = result;
            }
            response.json(resJson);
        });
    });

    /**
     * @api {post} /like activity Send notification that user wants to join activity
     * @apiGroup Notification
     * @apiName like activity
     * @apiParam {json} userId
     * @apiParam {json} activityId
     * @apiParam {json} addressee:activity creator Id
     * @apiSuccess {json} result:success
     * @apiSuccess {json} data:null
     * @apiError {json} result:error
     * @apiError {json} errMessage:err.message
     * @apiExample {json} Like Activity example:
     * {
     * "userId":"test user1",
     * "activityId":"550989cc9179010300a9238e",
     * "addressee":"767240993367525"
     * }
     */
    app.post('/like_activity', function(request, response){
        //console.log('IN WANT TO JOIN:', request.body);
        Activity.checkPlaces(request.body.activityId, function(err, isPlace, title){
            if(err){
                response.json({ result: 'error', data: err.message });
            }
            else{
                if(!isPlace){
                    log.info('NO SPOTS IN LIKED ACTIVITY');
                    response.json({ result: 'error', data: 'no spots left' });
                }
                else{
                    log.info('LIKED ACTIVITY IN PROCESS');
                    NotificationOperations.likeActivity(request.body.userId, request.body.activityId, request.body.creatorId,
                        request.body.message, request.body.creatorSurname, title, function(err){
                            if(err){
                                response.json({ result: 'error', data: err.message });
                            }
                            else{
                                log.info('LIKE RESPONSE');
                                response.json({ response: 'success', data: null});
                            }
                        })
                }
            }
        });
    });

    /**
     * @api {post} /join_approve Send notification that user request approved
     * @apiGroup Notification
     * @apiName join approve
     * @apiParam {json} userId activity creator Id
     * @apiParam {json} activityId
     * @apiParam {json} addressee joined user id
     * @apiParam {json} notificationId id of activity like notification
     * @apiSuccess {json} result success
     * @apiSuccess {json} data null
     * @apiError {json} result error
     * @apiError {json} errMessage err.message
     * @apiExample {json} join approve example:
     * {
     * "userId":"767240993367525",
     * "activityId":"550989cc9179010300a9238e",
     * "addressee":"test user2",
     * "notificationId": "550bf50068e2bc40035bc198"
     * }
     */
    app.post('/join_approve', function(request, response){
        if(!common.isEmpty(request.body.userId) && !common.isEmpty(request.body.addressee)
            && !common.isEmpty(request.body.activityId) && !common.isEmpty(request.body.notificationId)){
            NotificationOperations.joinApprove(request.body.userId, request.body.addressee
                , request.body.activityId, request.body.notificationId, function(err){
                    if(err){
                        response.json({ result: 'error', data: err.message });
                    }
                    else{
                        response.json({ result: 'success', data: null});
                    }
                })
        }
        else{
            log.error('INDEX JOIN APPROVE: ', request.body.userId, request.body.addressee
                , request.body.activityId, request.body.notificationId);
            response.json({ result: 'error', data: 'not enough fields' });
        }

    });

    /**
     * @api {post} /join_disapprove Send notification that user request rejected
     * @apiGroup Notification
     * @apiName join disapprove
     * @apiParam {json} userId activity creator Id
     * @apiParam {json} activityId
     * @apiParam {json} addressee joined user id
     * @apiParam {json} notificationId id of activity like notification
     * @apiSuccess {json} result success
     * @apiSuccess {json} data null
     * @apiError {json} result error
     * @apiError {json} errMessage err.message
     * @apiExample {json} join disapprove example:
     * {
     * "userId":"767240993367525",
     * "activityId":"550989cc9179010300a9238e",
     * "addressee":"test user2",
     * "notificationId": "550bf50068e2bc40035bc198"
     * }
     */
    app.post('/join_disapprove', function(request, response){
        NotificationOperations.joinDisapprove(request.body.userId, request.body.addressee
            , request.body.activityId, request.body.notificationId, request.body.activityTitle, function(err){
                if(err){
                    response.json({ result: 'error', data: err.message });
                }
                else{
                    response.json({ result: 'success', data: null});
                }
            })
    });

    /**
     * @api {post} /activity_recur Recur activity
     * @apiGroup Activity
     * @apiName recur activity
     * @apiParam {json} activityId
     * @apiParam {Date} newTimeStart
     * @apiParam {Date} newTimeFinish
     * @apiParam {json} changingFields:any activity fields to change
     * @apiSuccess {json} result success
     * @apiSuccess {json} data new activity
     * @apiError {json} result error
     * @apiError {json} errMessage err.message
     * @apiExample {json} Recover Activity example:
     * {
     * "activityId":"551e7396545d32030070737d",
     * "newTimeStart":"2015-05-22T12:40:00.192Z",
     * "newTimeFinish":"2015-05-22T12:40:00.192Z",
     * "changingFields" : {
     *     "title": "test activity recur done",
     *    "joinedUsers": ["avatar1", "avatar3"]//DO NO INCLUDE ACTIVITY CREATOR HERE!
     *     }
     * }
     */
    app.post('/activity_recur' , function(request, response){
        if(request.body.hasOwnProperty('activityId') && request.body.hasOwnProperty('newTimeStart')
            && request.body.hasOwnProperty('newTimeFinish') ){
            Activity.recurActivity(request.body.activityId, request.body.newTimeStart,
                request.body.newTimeFinish, request.body.changingFields, function(err, newAct){
                    if(err){ response.json({result: 'error', data: err.message }); }
                    else{ response.json({result: 'success', data: newAct }); }
                });
        }
        else{ response.json({result: 'error', data: 'not enough fields to recur' }); }
    });

    /**
     * @api {post} /recur_confirm Confirm In to recurred activity
     * @apiGroup Notification
     * @apiName recur confirm
     * @apiParam {json} userId joining user id
     * @apiParam {json} activityId
     * @apiSuccess {json} result success
     * @apiSuccess {json} data joined activity
     * @apiError {json} result error
     * @apiError {json} errMessage err.message
     * @apiExample {json} recur confirm example:
     * {
     * "userId":"767240993367525",
     * "activityId":"550989cc9179010300a9238e",
     * }
     */
    app.post('/recur_confirm', function(request, response){
        if(!common.isEmpty(request.body.userId) && !common.isEmpty(request.body.activityId)){
            NotificationOperations.recurConfirm(request.body.userId, request.body.activityId, function(err, resAct){
                if(err){ response.json({ result: 'error', data: err.message }); }
                else{ response.json({ result: 'success', data: resAct }); }
            });
        }
        else{ response.json({ result: 'error', data: NOT_ENOUGH_FIELDS }); }
    });

    /**
     * @api {post} /recur_reject User disclaimed to recur activity
     * @apiGroup Notification
     * @apiName recur reject
     * @apiParam {json} userId joining user id
     * @apiParam {json} activityId
     * @apiSuccess {json} result success
     * @apiSuccess {json} data null
     * @apiError {json} result error
     * @apiError {json} errMessage err.message
     * @apiExample {json} recur reject example:
     * {
     * "userId":"767240993367525",
     * "activityId":"550989cc9179010300a9238e",
     * }
     */
    app.post('/recur_reject', function(request, response){
        if(!common.isEmpty(request.body.userId) && !common.isEmpty(request.body.activityId)){
            NotificationOperations.recurReject(request.body.userId, request.body.activityId,
                function(err){
                    if(err){ response.json({ result: 'error', data: err.message }); }
                    else{ response.json({ result: 'success', data: null }); }
                })
        }
        else{ response.json({ result: 'error', data: NOT_ENOUGH_FIELDS }); }
    });

    app.post('/system_message', function(request, response){
        NotificationOperations.sendSystemMessage(request.body.message, request.body.title, function(err){
            if(err){ response.send(err) }
            else{ response.send('message sent') }
        });
    });

    app.get('/loaderio-a327d6c55c412e4ff973d1d816ddb861.html', function(req, res){

        res.send('loaderio-a327d6c55c412e4ff973d1d816ddb861');///
    });

    app.post('/clear_redis_base', function(request, response){
        NotyMan.clearRedis(function(){
            response.send('Done');
        });
    });

    app.post('/update_image', function(request, response){
        Activity.updateImage(request.body, function(err, result){
            if(err){response.json({ result: 'error', data: error.message }); }
            else{ response.json({ result: 'success', data: null }); }
        })
    });

    app.post('//invite', function(request, response){
        var isSingle = 1;
        if(request.body.isSingle){
            console.log('IS Single: ', request.body.isSingle);
            isSingle = request.body.isSingle;
        }
        Activity.inviteToActivity(request.body.creator, request.body.activityId, isSingle,
            function(err, inviteId){
                if(err){ log.error(err); response.json({result: 'error', data: error.message }); }
                else{ response.json({ result: 'success', data: inviteId }); }
            })
    });

    app.post('//accept_invite', function(request, response){
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
        //log.info('IN SUBSCRIBE ACTIVITY INDEX: ', request.body);
        //if(!checkReportFields(request.body)){
            report.receiveReport(request.body.userId, request.body.activityId, 6, 'empty', function(err){
                    if(err){ response.send({result: 'error', data: err }); }
                    else{ response.send({result: 'success', data: null });}
                } );
        //}
        //else{ response.send({result: 'error', data: 'Not enough fields for report' }); }
    });

    /*app.post('/riseInvite', function(request, response){
        if(request.body._id){
            Invite.findById(request.body._id, function(err, invite){
                if(err){
                    log.error(err);
                    response.send({result: 'error', data: err });
                }
                else{
                    invite.comeByLink = invite.comeByLink + 1;
                    invite.save(function(err, res){
                        if(err){ log.error(err); response.send({result: 'error', data: err }); }
                        else{ console.log('INVITE SAVED: ', res);response.send({result: 'success', data: null }); }
                    });
                }
            })
        }
        else{ response.send({result: 'error', data: 'ID NOT FOUND' }); }
    });*/

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

    app.get('/my_activities', function(request, response){
        if(!common.isEmpty(request.query.userId)){
            async.waterfall([
                    function(callback){
                        User.universalUserSearch('_id', request.query.userId, function(err, user){
                            if(err){ callback(err); }
                            else if(!common.isEmpty(user)){
                                var activitiesPending = [];
                                var activitiesJoined = user[0].activitiesJoined;
                                //console.log('User found: ', user, 'resAct', activitiesJoined);
                                if(!common.isEmpty(user[0].activitiesLiked)){
                                    //console.log('in if', user[0].activitiesLiked);
                                    for(var i = 0; i < user[0].activitiesLiked.length; i++){
                                        activitiesPending.push(user[0].activitiesLiked[i]['activityId']);
                                    }
                                    //console.log('Activities Pending:', activitiesPending);
                                    //console.log('Activities joined:', activitiesJoined);
                                    var allActs = common.union(activitiesPending, activitiesJoined);
                                    //console.log('Activities total:', allActs);
                                    callback(null, allActs);
                                }
                                else{
                                    //console.log('Liked - 0 Activities joined:', activitiesJoined);
                                    callback(null, activitiesJoined);
                                }
                            }
                            else{ callback('User not found'); }
                        })
                    },
                    function(activities,  callback){
                        //log.info('Index my activities pending:');
                        //console.log(activitiesPending);
                        //if(!common.isEmpty(activitiesPending)){
                        if(!common.isEmpty(activities)){
                            //console.log('GET ALL: ', activities);
                            Activity.getPending(activities, request.query.userId, function(err, resAct){
                                if(err){ callback(err); }
                                else{ callback(null, resAct); }
                            });
                        }
                        else{
                            callback(null, null);
                        }

                        //}
                        //else{ callback(null, null); }
                    }/*,
                    function(pendAct, callback){
                        Activity.universalActivitySearch('joinedUsers', request.query.userId, function(err, activities){
                            if(err){callback(err); }
                            else if(pendAct){
                                var resActs = common.union(activities, pendAct);
                                callback(null, resActs);
                            }
                            else{ callback(null, activities); }
                        })

                    }*/
                ],
                function(err, activities){
                    if(err){
                        log.error(err);
                        response.json({result: 'error', data: err });
                    }
                    else{
                        //log.info('Index My Activities length: ', activities);
                        //console.log(activities);
                        response.json({result: 'success', data: activities });
                    }
            });
        }
        else{ response.json({result: 'error', data: 'User not found' }); }
    })




};



/*old version with less speed
 //loop for users inside of activities
 var iteratorJ = function(userId, callbackDoneJ){
 User.findUser(userId, function(err, result){
 if(err){
 log.error(err.message);
 }
 else if(result == 'user is not found'){
 log.error('user is not found: ' + userId);
 }
 else{
 if(userId == activityUsers.creator){
 activityUsers['creatorName'] = result.surname;
 activityUsers['creatorUrl'] = result.imageUrl;
 activityUsers['about'] = result.about;
 }
 var userObj = {};
 userObj['userId'] = result._id;
 userObj['userName'] = result.surname;
 userObj['imageLink'] = result.imageUrl;
 activityUsers['joinedUsersDetails'].push(userObj);
 callbackDoneJ();
 }
 });
 };
 //loop for users runs here
 async.eachSeries(activity.joinedUsers, iteratorJ, function(err){
 if(err){
 log.error(err.message);
 callbackDoneI(err);
 }
 resJson.data.push(activityUsers);
 callbackDoneI();
 });*/