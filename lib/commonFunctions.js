/**
 * Created by Ignat on 3/30/2015.
 */

var log = require('../lib/log.js')(module),
    underscore = require('underscore'),
    Reminder = require('./../data/activityReminder.js'),
    async = require('async'),
    mongoose = require('mongoose')
    ;


//reminderTime range 1 - 96 (30 min - 48 hours)
//Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds())
function getInterval(reminderTime, timeStart){
    console.log('common func getInterval reminderTime timeStart', reminderTime, timeStart);
    var date = new Date(timeStart);
    var timeRem = new Date(timeStart);
    var hours = timeRem.getHours();
    var minutes = timeRem.getMinutes();
    var start = new Date(timeStart);
    start.setHours(-24);//setUTCHours(-24)
    var finish = new Date(timeStart);
    finish.setHours(24);
    var now = new Date(timeStart);
    now.setHours(0,0,0,0);
    var interval = hours*2 - reminderTime;
    if(interval < 0){
        if(interval < -48){
            start.setDate(start.getDate() - 2);
            finish.setDate(finish.getDate() - 2);
            now.setDate(now.getDate() - 2);
            interval = hours*2 - (96 - reminderTime);
        }
        else{
            start.setDate(start.getDate() - 1);
            finish.setDate(finish.getDate() - 1);
            now.setDate(now.getDate() - 1);
            interval = hours*2 - (48 - reminderTime);
        }
    }
    if(minutes >= 30){interval++};
    console.log('common func getInterval date, utcDate, hours, interval', date, timeRem, hours, interval);
    var res = {start: start, finish: finish, now: now, interval: interval };
    //console.log('Common Create activity getInterval', res);
    return res;
};

function getTimeToStart(timeToRemind){
    var resTime = '';
    switch(timeToRemind){
        case 1: resTime = '30 minutes'; break;
        case 2: resTime = 'one hour'; break;
        case 4: resTime = 'two hours'; break;
        case 6: resTime = 'three hours'; break;
        case 48: resTime = 'one day'; break;
        case 96: resTime = 'two days'; break;
        default: resTime = 'a recent time'; break;
    }
    return resTime;
};

var common = {
    isEmpty: function(obj){
        return underscore.isEmpty(obj);
    },

    deepObjClone: function(obj){
        return JSON.parse(JSON.stringify(obj));
    },

    objectsEquality: function(a, b){
        // Create arrays of property names
        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);

        // If number of properties is different,
        // objects are not equivalent
        if (aProps.length != bProps.length) {
            return false;
        }

        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];

            // If values of same property are not equal,
            // objects are not equivalent
            if (a[propName] !== b[propName]) {
                return false;
            }
        }

        // If we made it this far, objects
        // are considered equivalent
        return true;
    },
    //return boolean
    arrayDifference: function (arr1, arr2){
        if(arr1.length != arr2.length){

            return true;
        }
        if(arr1.length == 0 && arr2.length == 0){

            return false;
        }
        if(Object.prototype.toString.call(arr1[0]) === '[object Object]'
            && Object.prototype.toString.call(arr2[0]) === '[object Object]'){

            for(var i = 0; i < arr1.length; i++){
                if(!common.objectsEquality(arr1[i], arr2[i])){

                    return true;
                }
            }

            return false;
        }
        return arr1.filter(function(e){
            if(arr2.indexOf(e) === -1)
                return true;
        })
    },

    objectType: function(key){
        var result;
        if(Object.prototype.toString.call(key) === '[object Array]'){
            result = 'array';
        }
        else if(Object.prototype.toString.call(key) === '[object Object]'){
            result = 'object';
        }
        else if(Object.prototype.toString.call(key) === '[object Date]') {
            result = 'date';
        }
        else{
            result = 'single';
        }
        return result;
    },

    saveArchiveInstance: function(oldAvatar, self){
        for(var key in oldAvatar._doc){
            if(key != '_id' && key != '__v' && key != 'parentId'
                && key != 'created' && key != 'notifications' && key != 'lastVisit'){
                var keyValue = common.objectType(oldAvatar[key][(oldAvatar[key].length - 1)].createdValue);
                switch (keyValue) {
                    case 'array':{
                        var arr1 = oldAvatar[key][(oldAvatar[key].length - 1)].createdValue,
                            arr2 = self[key];
                        if (arr1&& arr2 && arr1.length < arr2.length) {
                            arr2 = oldAvatar[key][(oldAvatar[key].length - 1)].createdValue;
                            arr1 = self[key];
                        }
                        if (common.arrayDifference(arr1, arr2)) {
                            oldAvatar[key].set(oldAvatar[key].length, ({createdValue: self[key],
                                created: new Date().toUTCString()
                            }));
                        }
                    };break;
                    case 'object':{
                        if (!common.objectsEquality(
                                oldAvatar[key][(oldAvatar[key].length - 1)].createdValue, self[key])){
                            oldAvatar[key].set(oldAvatar[key].length, ({ createdValue: self[key],
                                created: new Date().toUTCString() } ) ); }
                    };break;
                    case 'single':{
                        if (oldAvatar[key][(oldAvatar[key].length - 1)].createdValue != self[key]){
                            oldAvatar[key].set(oldAvatar[key].length, ({createdValue: self[key],
                                created: new Date().toUTCString()
                            }));
                        }
                    };break;
                    case 'date':{
                        if(!(!(oldAvatar[key][(oldAvatar[key].length - 1)].createdValue > self[key])
                            && !(oldAvatar[key][(oldAvatar[key].length - 1)].createdValue < self[key]))){
                            oldAvatar[key].set(oldAvatar[key].length, ({createdValue: self[key],
                                created: new Date().toUTCString()
                            }));
                        }
                    };break;
                    default: break;
                }
            }
        }
        oldAvatar.save(function(err,result){
            if(err){ log.error(err); }
            else{ ; }
        });
    },
    //return array that not include intersections with arr1
    getArraysDifference: function(arr1, arr2){

        return underscore.difference(arr1, arr2);
    },

    getArraysIntersection: function(arr1, arr2){

        return underscore.intersection(arr1, arr2);
    },

    existInArray: function(arr, value){
        var res = underscore.find(arr, function(num){ return num == value });
        if(res == undefined){ return false; }
        else{ return true; }
    },

    isEqual: function(obj1, obj2){
        return underscore.isEqual(obj1, obj2);
    },

    union: function(arr1, arr2){
        return underscore.union(arr1, arr2);
    },

    setReminder: function(user, createdActivity, callbackDone){
        async.waterfall([
            function(callback){
                var interval = getInterval(user.settings.reminderTime, createdActivity.timeStart);
                Reminder.findOne({reminderTime: {$gte: interval.start, $lt: interval.finish}}, function(err, resReminder){
                    if(err){ callback(err); }
                    else if(resReminder == null){
                        var newReminder = new Reminder({reminderTime: interval.start});
                        newReminder.save(function(err, result){
                            if(err){ callback(err); }
                            else{ callback(null, interval); }
                        })
                    }
                    else{ callback(null, interval); }
                })

            },
            function(interval, callback){
                var timeToStart = getTimeToStart(user.settings.reminderTime);
                var insertTask = {userId: user._id, activityId: createdActivity._id, activityName: createdActivity.title,
                    interval: interval.interval, timeToStart: timeToStart};
                Reminder.findOneAndUpdate({reminderTime: {$gte: interval.start, $lt: interval.finish}},
                    {reminderTime: interval.now, $push:{ tasks: insertTask } }, { upsert: true}, function(err, reminder){
                        if(err){ callback(err); }
                        else{
                            console.log('Common Create Activity reminder:', reminder);
                            callback(null, createdActivity, user);
                        }
                    })

            }
        ],
        function(createdActivity, user){
            if(err){
                log.error(err);
                callbackDone(err);
            }
            else{
                callbackDone(null, createdActivity, user);
            }
        })
    },
    setMultipleReminder: function(user, createdActivity, callbackDone){
        var interval = getInterval(period.interval, createdActivity.timeStart);

        var iterator = function(period, callbackI){
            var timeToStart = getTimeToStart(period.interval);
            var insertTask = {userId: user._id, activityId: createdActivity._id, activityName: createdActivity.title,
                interval: interval.interval, timeToStart: timeToStart};
            //console.log('common setMultipleReminder', insertTask);
            Reminder.findOneAndUpdate({reminderTime: {$gte: interval.start, $lt: interval.finish}},
                {reminderTime: interval.now, $push:{ tasks: insertTask } }, { new: true, upsert: true}, function(err, reminder){
                    if(err){ callbackI(err); }
                    else{
                        console.log('Common Create Activity reminder:', reminder);
                        callbackI(null, createdActivity, user);
                    }
                })
        };
        async.waterfall([
                function(callback){
                    Reminder.findOne({reminderTime: {$gte: interval.start, $lt: interval.finish}}, function(err, resReminder){
                        if(err){ callback(err); }
                        else if(resReminder == null){
                            var newReminder = new Reminder({reminderTime: interval.start});
                            newReminder.save(function(err, result){
                                if(err){ callback(err); }
                                else{ callback(null, interval); }
                            })
                        }
                        else{ callback(null, interval); }
                    })

                },
                function(interval, callback){
                    async.eachSeries(user.settings.multipleReminders, iterator, function(err, result){
                        if(err){ callback(err); }
                        else{ callback(null, createdActivity, user); }
                    })

                }
            ],
            function(createdActivity, user){
                if(err){
                    log.error(err);
                    callbackDone(err);
                }
                else{
                    callbackDone(null, createdActivity, user);
                }
            })
    },
    deleteReminder: function(activityId, callback){
        Reminder.update({ 'tasks.activityId': mongoose.Types.ObjectId(activityId) },
            { $pull: { tasks : { activityId : mongoose.Types.ObjectId(activityId) } } },
            { safe: true }, function(err, resTasks){
                if(err){
                    console.error(err);
                    callback(err);
                }
                else{
                    console.log('COMMON DELETE REMINDER:', resTasks);
                    callback(null);
                }
            })
    },
    removeUserFromTask: function(activityId, userId){
        Reminder.update({ 'tasks.activityId': mongoose.Types.ObjectId(activityId),
                'tasks.userId': userId },
            { $pull: { tasks : { 'userId': userId, activityId : mongoose.Types.ObjectId(activityId) } } }, { safe: true },
            function(err, resTasks){
                if(err){ console.log(err); }
                else{
                    console.log('COMMON MOVE USER FROM REMINDER:', resTasks);
                }
            })
    },
    getInterval: getInterval
};

module.exports = common;