/**
 * Created by Ignat on 3/30/2015.
 */

var log = require('../lib/log.js')(module),
    underscore = require('underscore'),
    Reminder = require('../data/activityReminder.js'),
    async = require('async'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    timeZone = require('moment-timezone'),

    SUNDAY = 44,
    MONDAY = 45,
    TUESDAY = 46,
    WEDNESDAY = 47,
    THURSDAY = 48,
    FRIDAY = 49,
    SATURDAY = 50
    ;


//reminderTime range 1 - 96 (30 min - 48 hours)
//Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds())
function getInterval(reminderTime, timeStart){
    //console.log('common func getInterval reminderTime timeStart', reminderTime, timeStart);
    var date = new Date(timeStart);
    var timeRem = new Date(timeStart);
    var hours = timeRem.getHours();
    var minutes = timeRem.getMinutes();
    var start = new Date(timeStart);
    start.setHours(0,0,1,0);//setUTCHours(-24)
    var finish = new Date(timeStart);
    finish.setHours(23,59,0,0);
    var now = new Date(timeStart);
    now.setHours(0,1,0,0);
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
    //console.log('common func getInterval date, utcDate, hours, interval', date, timeRem, hours, interval);
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

function getWeekOfYear(dateString) {
    var d = new Date(dateString);
    d.setHours(0,0,0);
    d.setDate(d.getDate()+4-(d.getDay()||7));
    return Math.ceil((((d-new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
};

function isSameWeek(now, targetUtc){
    return now.week() == targetUtc.week();
};

function getDayDiff(now, targetUtc){
    var result = -1;
    //console.log(now.dayOfYear(), targetUtc.dayOfYear());
    if( now.dayOfYear() == targetUtc.dayOfYear() && now.year() == targetUtc.year() ){
        result = 0;
    }
    else if(now.year() < targetUtc.year()){
        result = now.isAfter(targetUtc)? -1: targetUtc.diff(now, 'days');
    }
    else{
        /* result = targetUtc.diff(now, 'days');
         result = result == 0? 1: result;*/
        var targetCopy = moment(targetUtc.format()).startOf('day');
        var nowCopy = moment(now.format()).startOf('day');
        //targetUtc.startOf('day');
        //now.startOf('day');
        result = targetCopy.diff(nowCopy, 'days');
    }

    return result;
};

function getDayOfWeek(target){
    var day = target.day();
    var result = null;
    switch (day){
        case 0: result = SUNDAY;break;
        case 1: result = MONDAY;break;
        case 2: result = TUESDAY;break;
        case 3: result = WEDNESDAY;break;
        case 4: result = THURSDAY;break;
        case 5: result = FRIDAY;break;
        case 6: result = SATURDAY;break;
    }
    return result;
}

function getFormattedTime(time){
    return time < 10? '0' + time: time;
};

var common = {
    isEmpty: function(obj){
        return underscore.isEmpty(obj);
    },
    //convert list to set
    getSet: function(users){
        var res = [];
        users.forEach(function(userId){
            var index = res.indexOf(userId);
            if(index < 0){
               res.push(userId)
            }
        })

        return res;
    },

    deepObjClone: function(obj){
        return JSON.parse(JSON.stringify(obj));
    },

    objectsEquality: function(a, b){
        // Create arrays of property names
        if(a != null && b != null){
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
        }
        else{
            return false;
        }
    },
    //return boolean
    arrayDifference: function (arr1, arr2){
        if(arr1 && arr2){
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
        }
        else{
            return false;
        }

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
                        if (common.arrayDifference(arr1, arr2) && oldAvatar[key] && oldAvatar[key].length) {
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
                if(interval && interval.start && interval.finish){
                    Reminder.findOne({reminderTime: {$gte: interval.start, $lt: interval.finish}}, function(err, resReminder){
                        if(err){ callback(err); }
                        else if(resReminder == null){
                            //console.log('IN CREATE REMINDER', interval.start);
                            var newReminder = new Reminder({reminderTime: interval.start});
                            newReminder.save(function(err, result){
                                if(err){ callback(err); }
                                else{
                                    console.log('REMINDER CREATED');
                                    callback(null, interval);
                                }
                            })
                        }
                        else{ callback(null, interval); }
                    })
                }
                else{ callback(new Error('Interval is empty')); }
            },
            function(interval, callback){
                var timeToStart = getTimeToStart(user.settings.reminderTime);
                var insertTask = {userId: user._id, activityId: createdActivity._id, activityName: createdActivity.title,
                    interval: interval.interval, timeToStart: timeToStart};
                Reminder.findOneAndUpdate({reminderTime: {$gte: interval.start, $lt: interval.finish}},
                    {reminderTime: interval.now, $push:{ tasks: insertTask } }, { new: true}, function(err, reminder){
                        if(err){ callback(err); }
                        else{
                            //console.log('Common Create Activity reminder:', reminder);
                            callback(null);
                        }
                    })
            }
        ],
        function(err){
            if(err){
                log.error(err);
            }
            callbackDone(null, createdActivity, user);
        })
    },

    setMultipleReminder: function(user, createdActivity, callbackDone){

        var iterator = function(period, callbackI){
            if(period){
                var interval = getInterval(period.interval, createdActivity.timeStart);
                if(interval && interval.start && interval.finish) {
                    async.waterfall([
                            function (callback) {
                                Reminder.findOne({
                                    reminderTime: {
                                        $gte: interval.start,
                                        $lt: interval.finish
                                    }
                                }, function (err, resReminder) {
                                    if (err) {
                                        callback(err);
                                    }
                                    else if (common.isEmpty(resReminder)) {
                                        //console.log('IN CREATE MULTIPLE REMINDER',interval.start);
                                        var newReminder = new Reminder({reminderTime: interval.start});
                                        newReminder.save(function (err, result) {
                                            if (err) {
                                                callback(err);
                                            }
                                            else {
                                                console.log('REMINDER CREATED');
                                                callback(null);
                                            }
                                        })
                                    }
                                    else {
                                        callback(null);
                                    }
                                })
                            },
                            function () {
                                var timeToStart = getTimeToStart(period.interval);
                                var insertTask = {
                                    userId: user._id, activityId: createdActivity._id, activityName: createdActivity.title,
                                    interval: interval.interval, timeToStart: timeToStart
                                };
                                //console.log('common setMultipleReminder', insertTask);
                                Reminder.findOneAndUpdate({reminderTime: {$gte: interval.start, $lt: interval.finish}},
                                    {
                                        reminderTime: interval.now,
                                        $push: {tasks: insertTask}
                                    }, {new: true}, function (err, reminder) {
                                        if (err) {
                                            callbackI(err);
                                        }
                                        else {
                                            //console.log('Common Create Activity reminder:', reminder);
                                            callbackI(null, createdActivity, user);
                                        }
                                    })
                            }
                        ],
                        function (err, createdActivity, user) {
                            if (err) {
                                console.error(err);
                                callbackDone(err);
                            }
                            else {
                                callbackDone(null, createdActivity, user);
                            }
                        })
                }
            }
            else{ callbackI(new Error('Interval is empty')); }


        };

        async.eachSeries(user.settings.multipleReminders, iterator, function(err, result){
            if(err){ log.error(err); }
            callbackDone(null, createdActivity, user);
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
                    //console.log('COMMON DELETE REMINDER:', resTasks);
                    callback(null);
                }
            })
    },

    removeUserFromTask: function(activityId, userId){
        Reminder.update({ 'tasks.activityId': mongoose.Types.ObjectId(activityId),
                'tasks.userId': userId },
            { $pull: { tasks : { 'userId': userId, activityId : mongoose.Types.ObjectId(activityId) } } }, { safe: true },
            function(err, resTasks){
                if(err){ console.error(err); }
                else{
                    //console.log('COMMON MOVE USER FROM REMINDER:', resTasks);
                }
            })
    },

    getInterval: getInterval,

    getTimeDifference: function(time){
        var now = moment();
        var targetUtc = moment.utc(time);
        var targetLocal = timeZone(time).tz('Israel');
        var result = {
            sameWeek: isSameWeek(now, targetUtc),
            daysDiff: getDayDiff(now, targetUtc),
            hours: getFormattedTime(targetLocal.hour()),
            minutes: getFormattedTime(targetUtc.minutes()),
            weekDay: getDayOfWeek(targetLocal),
            formattedDate: targetLocal.format('D-MM-YYYY')
        };
        //console.log('time dif', result, targetLocal.format());
        return result;
    },

    getWeekNumber: getWeekOfYear,

    getDayOfWeek: getDayOfWeek,

    getFormattedDate: function formatDate(date) {
        var d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [day, month, year].join('-');
    }
};

module.exports = common;

//common.getTimeDifference('2016-02-11T23:00:00.189Z');