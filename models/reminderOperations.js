/**
 * Created by Ignat on 8/25/2015.
 */

var log = require('../lib/log.js')(module),
    connection = require('../lib/db.js').connection,
    async = require('async'),
    common = require('../lib/commonFunctions.js'),
    Reminder = connection.model('ReminderTask'),
    Activity = require('./../models/activitiesOperations.js'),//use activities because of circle dependencies issue
    Notifications = require('./../models/notificActions.js')

;

function taskIterator(task, callback){
    console.log('Reminder iterator send task:', task);
    var message = "hey, don't forget: activity " + task.activityName +
        ' starts in ' + task.timeToStart + '!';
    task['message'] = message;
    Notifications.sendReminder(task, function(err){
        if(err){ callback(err); }
        else{ callback(null); }
    })
};

module.exports = {
    getCurrentTasks: function(date, callbackDone){
        var interval = common.getInterval(0, date);
        console.log('Reminder get interval: ', interval);
        Reminder.findOne({ reminderTime: { $gte: interval.start, $lt: interval.finish } },
            function(err, taskObj){
                if(err){ callbackDone(err); }
                else{
                    if(!common.isEmpty(taskObj) && !common.isEmpty(taskObj.tasks)){
                        console.log('Reminder get interval current tasks:', taskObj);
                        var currentTasks = taskObj.tasks.filter(function(task){
                            return task.interval == interval.interval;
                        });
                        if(!common.isEmpty(currentTasks)){
                            async.each(currentTasks, taskIterator, function(err){
                                if(err){ callbackDone(err); }
                                else{ callbackDone(null); }
                            })
                        }
                    }
                }
            })
    }

};
