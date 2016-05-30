  /**
   * Created by Ignat on 5/11/2016.
   */
  var ActivityModel = require('../../models/activitiesOperations.js'),
      UserModel = require('../../models/userOperations.js'),
      Socket = require('../../lib/socket.js'),
      moment = require('moment'),
      common = require('../../lib/commonFunctions.js'),
      _ = require('underscore'),
      common = require('../../lib/commonFunctions.js'),
      async = require('async')
  ;

  module.exports = {
      create: create,
      update: update,
      search: search,
      remove: remove,
      updateImage: updateImage
  };

  function updateImage(request, response){
      ActivityModel.updateImage(request.body, function(err, result){
          if(err){ response.status(500).json({error: err.message }); }
          else{
              var resJson = { result: 'success', data: result };
              resJson.notForCreator = true;
              Socket.sendMyActivityUpdate(result._id, resJson);
              response.json(resJson);
          }
      })
  };

  function remove(request, response){
      ActivityModel.deleteActivity(request.body._id, function(err){
          if(err){
              console.error(err);
              response.status(500).json({ message: err.message });
          }
          else{
              Socket.sendMyActivityDelete(request.body._id, { result: 'success', data:{activityId: request.body._id} });
              response.json({result: 'success'});
          }
      })
  };

  function search(request, response){
      ActivityModel.universalActivitySearch(request.query.criteria, request.query.value,
          function(err, result){
              if(err){
                  console.error(err);
                  response.status(500).json({ message: err.message });
              }
              else{
                  response.json({
                      result: 'success',
                      data: result
                  });
              }
          });
  };

  function update(request, response){

      checkActivityFieldsUpd(request.body,
          function(err, activityObj, isRepublish){
              if(err) {
                  console.error(err);
                  response.status(500).json({ message: err.message });
              }
              else {
                  if(isRepublish)
                      republish(request, response);
                  else
                      updateNew(request, response);
              }
          }
      )
      return;
  };

  function updateNew(request, response){
    async.waterfall([
        function(callback){
            checkActivityFieldsUpd(request.body, function(err, activityObj, isRepublish){
                if(err){ callback(err); }
                else{ callback(null, activityObj, isRepublish) }
            })
        },
        function(activityObj, isRepublish, callback){
            if(!isRepublish) {
                callback(null, activityObj, isRepublish)
            }
            else {
                activityObj = changeUserStatus(activityObj);
                callback(null, activityObj, isRepublish)
            }
        },
        function(activityObj, isRepublish, callback){
            if(!isRepublish) {
                callback(null, activityObj, isRepublish)
            }
            else {
                activityObj = removeUsersFromActivity(activityObj);
                callback(null, activityObj, isRepublish);
            }
        },
        function(activityObj, isRepublish, callback){
            if(isRepublish){
                ActivityModel.universalActivityUpdate(activityObj, isRepublish, function(err, resAct){
                    if(err){ callback(err); }
                    else{
                        var resJson = {
                            result: 'success',
                            data: resAct
                        };
                        resJson.notForCreator = true;
                        Socket.sendMyActivityRepublish(resAct._id, resJson);
                        callback(null, null, isRepublish, resJson);
                  }
                })
            }
            else{
                callback(null, activityObj, isRepublish, null)
            }

        },
        function(activityObj, isRepublish, resJson, callback){
          if(!isRepublish){
            ActivityModel.universalActivityUpdate(activityObj, isRepublish, function(err, resAct){
                if(err){ callback(err); }
                else{
                    var resJson = {
                        result: 'success',
                        data: resAct
                    };
                    resJson.notForCreator = true;
                    Socket.sendMyActivityUpdate(resAct._id, resJson);
                    callback(null, resJson);
                }
            })
          }
          else {
              callback(null, resJson);
          }
        }
    ],
        function(err, result){
        if(err){
            console.error(err);
            response.status(500).json({ message: err.message });
        }
        else{ response.json(result); }
    });
  }

  function republish(request, response){
    // 1. Request Activity_Republish (async [])
    //    1.1. Validate Activity Object (checkActivityFieldsUpd)
    //    1.2. Clone Activity To Object (prepareToRepublish)
    //    1.3. Change members status (changeUserStatus) + (removeUsersFromActivity)
    //    1.4. Update Activity in database (universalActivityUpdate)\
    //    1.5. Notify User (sendMyActivityUpdate)
    // 2. Reponse Activity_Republish (async final)
    async.waterfall([
      function(callback){
        checkActivityFieldsUpd(request.body, function(err, activityObj, isRepublish){
            if(err){ callback(err); }
            else{ callback(null, activityObj, isRepublish) }
        });
      },
      function(activityObj, isRepublish, callback){
            activityObj = changeUserStatus(activityObj);
            callback(null, activityObj, isRepublish)
      },
      function(activityObj, isRepublish, callback){
            removeUsersFromActivity(activityObj,
                function(err, updatedActivity){
                    if(err) { callback(err); }
                    else {
                      callback(null, updatedActivity, isRepublish);
                    }
                }
            );
      },
      function(activityObj, isRepublish, callback){
            ActivityModel.universalActivityUpdate(activityObj, isRepublish, function(err, resAct){
                if(err){ callback(err); }
                else{
                    var resJson = {
                        result: 'success',
                        data: resAct
                    };
                    resJson.notForCreator = true;
                    Socket.sendMyActivityRepublish(resAct._id, resJson);
                    callback(null, resJson);
              }
            })
      }
    ],
      function(err, result){
        if(err){
            console.error(err);
            response.status(500).json({ message: err.message });
        }
        else {
          response.json(result);
        }
      }
    );
  }

  function checkActivityFieldsUpd(obj, callbackDone){
      var checkFields = checkIfEmpty(obj);
      if(checkFields.result == 'error'){ callbackDone(new Error(checkFields.absent)); }
      else{
          ActivityModel.findActivity(obj._id, function(err, oldAct){
              if(err){ callbackDone(err); }
              else {
                  if(checkIfFuture(obj) && !checkIfFuture(oldAct)){
                      var resObj = ActivityModel.prepareToRepublish(obj);
                      callbackDone(null, resObj, true);
                  }
                  else {
                      var resObj = ActivityModel.prepareToUpdate(obj);
                      resObj['changedField'] = compareAct(oldAct, resObj);
                      callbackDone(null, resObj, false);
                  }
              }
          });
      }
  };


  function checkIfFuture(activity){
    var now = moment();
    var newDate = moment(activity.timeFinish);

    console.log('checkIfFuture', now.format(), newDate.format(), newDate.isAfter(now));
    return newDate.isAfter(now);
  }

  function changeUserStatus(activityObj){
      var activity = common.deepObjClone(activityObj);

      var creatorId = activity.joinedUsers[0];

      for(var index in activity.joinedUsers){
          if(activity.creator == activity.joinedUsers[index]){
            creatorId = activity.joinedUsers[index];
          }

      }
      activity.pendingUsers = _.without(activity.joinedUsers, creatorId);

      return activity;
  }

  function removeUsersFromActivity(activity, callback){
      var activityObj = activity;

      for(var index in activity.joinedUsers){
          if(activity.creator != activity.joinedUsers[index]){
            ActivityModel.removeUserFromActivity(activity._id, activity.joinedUsers[index], false, true,
                function(err, newActivity){
                    if(err){ callback(err); }
                    else{
                      activityObj = newActivity;
                      callback(err, activityObj);
                    }
                });
          }
          else {
            callback(null, activityObj);
          }
      }
  }

  function checkIfEmpty(obj){
      var result = {
          result: 'error',
          absent: null
      };
      if(common.isEmpty(obj.title)){  result.absent = 'no title'; }
      else if(common.isEmpty(obj.creator)) {  result.absent = 'no creator'; }
      else if(common.isEmpty(obj.location)) {  result.absent = 'no location'; }
      else if(common.isEmpty(obj.timeFinish)) {  result.absent = 'no time finsih'; }
      else if(common.isEmpty(obj.timeStart)) {  result.absent = 'no time start'; }
      else{ result.result = 'success'; }

      return result;
  };

  function compareAct(oldAct, newAct){
      var clone = common.deepObjClone(oldAct);
      var changedFields = [];
      for(var key in clone){
          switch(key){
              case 'title':case 'description':case 'imageUrl':case 'isApprovalNeeded':case 'isTimeFlexible':
              case 'isGroup':case 'isLocationSecret':case 'isTimeSecret':case 'maxMembers':case 'isPrivate':{
              if(clone[key] != newAct[key]){ changedFields.push(key); }
          }; break;
              case 'timeStart':case 'timeFinish':{
              if(!common.isEqual(new Date(clone[key]), new Date(newAct[key]) )){ changedFields.push(key); }
          };break;
              case 'location':{
                  for(var i = 0; i < clone[key].length; i++){
                      if(clone[key][i] != newAct[key][i]){ changedFields.push(key); break; }
                  }
              }; break;
              case 'tags':{
                  if(!common.isEmpty(clone[key]) && !common.isEmpty(newAct[key])){
                      if(!common.isEqual(clone[key], newAct[key])){ changedFields.push(key); }
                  }
              }; break;
              default: break;
          }
      }
      return changedFields;
  };

  function create(request, response){
      var activityObj = checkActivityFields(request.body);
      if(activityObj.result != 'error'){
          ActivityModel.createActivity(activityObj, function(err, created){
              if(err){
                  console.error(err);
                  response.status(500).json({ message: err.message });
              }
              else{
                  response.json({
                      result: 'success',
                      data: created
                  });
              }
          });
      }
      else{
          var err = 'not enough fields to create activity: ' + activityObj.absent;
          console.error(err);
          response.status(500).json({ message: err });
      }
  };

  function checkActivityFields(obj){
      var checkFields = checkIfEmpty(obj);
      if(checkFields.result == 'error'){ return checkFields; }
      else{
          var resObj = common.deepObjClone(obj);
          resObj.creator = obj.creator._id;
          delete resObj.tags;
          delete resObj.tagsByLanguage;
          var tagsByLang = [];
          var arr = [];
          if(!common.isEmpty(obj.tags)){
              arr  = convertTags(obj.tags);
              if(!common.isEmpty(arr)){ resObj.tags = arr; }
              tagsByLang = getTagsByLanguage(obj.tags);
          }
          resObj['tagsByLanguage'] = tagsByLang;
          resObj['tags'] = arr;

          return resObj;
      }
  };

  function getTagsByLanguage(tags){
      var arr = [];
      for(var i = 0; i < tags.length; i++){
          if(tags[i]['name']){
              var tagObj = {};
              tagObj['name'] = tags[i]['name'];
              tagObj['imageUrl'] = tags[i]['imageUrl'];
              tagObj['tagCategory'] = tags[i]['tagCategory'];
              tagObj['_title'] = tags[i]['_title']? tags[i]['_title'] : tags[i]['name'];
              arr.push(tagObj);
          }
      }
      return arr;
  };

  function convertTags(tags){
      var arr = [];
      for(var i = 0; i < tags.length; i++){
          if(tags[i]['_title'] != undefined){
              arr.push(tags[i]['_title']);
          }
      }
      return arr;
  };
