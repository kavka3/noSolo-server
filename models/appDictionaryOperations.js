/**
 * Created by Ignat on 9/28/2015.
 */

var log = require('../lib/log.js')(module),
    async = require('async'),
    connection = require('../lib/db.js').connection,
    common = require('../lib/commonFunctions.js'),
    Dictionary = require('../data/appDictionarySchema.js')
;



module.exports = {

    update: function(command, callback){
        Dictionary.findByIdAndUpdate(command._id, command, {new: true}, function(err, updatedCommand){
            if(err){ callback(err); }
            else{ callback(null, updatedCommand); }
        })
    },

    createCommand: function(_id, ctrlName, ctrlCommand, cmdDict, callbackDone){
        var newCommand = _id != null ?
                Dictionary({
                    _id: _id,
                    control: ctrlName,
                    command: ctrlCommand,
                    cmdDictionary: cmdDict
                }):
                Dictionary({
                    control: ctrlName,
                    command: ctrlCommand,
                    cmdDictionary: cmdDict
                })
            ;
        //console.log('NEW COMMAND', newCommand);
        newCommand.save(function(err, resCmd){
            if(err){ callbackDone(err); }
            else{ callbackDone(null, resCmd) }
        })
    },

    getCmdDictionary: function(callbackDone){
        Dictionary.find({}, function(err, resDict){
            if(err){ callbackDone(err); }
            else if(!common.isEmpty(resDict)){
                var langObj = {
                    en: {},
                    he: {}
                };
                resDict.forEach(function(e){
                    if(e.cmdDictionary.en){
                        langObj['en'][e._id] = e.cmdDictionary.en;
                    }
                    if(e.cmdDictionary.he){
                        langObj['he'][e._id] = e.cmdDictionary.he;
                    }
                });
                callbackDone(null, langObj);

            }
            else{ callbackDone(new Error('Dictionary is Empty')); }
        });
    },

    getCommandBase: function(callbackDone){
        Dictionary.find({}, function(err, resDict){
            if(err){callbackDone(err);}
            else{callbackDone(null,resDict);}
        })
    },

    findById: function(id, callback){
        Dictionary.findById(id, function(err, resCommand){
            if(err){ callback(err); }
            else{ callback(null, resCommand); }
        })
    }
}
