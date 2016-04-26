/**
 * Created by Ignat on 9/28/2015.
 */

var log = require('../lib/log.js')(module),
    async = require('async'),
    connection = require('../lib/db.js').connection,
    common = require('../lib/commonFunctions.js'),
    Dictionary = require('../data/appDictionarySchema.js'),
    mod = null
    ;



module.exports = mod = {

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
                //console.log('resdictionary result', resDict);
                if(resDict){
                    resDict.forEach(function(e){
                        if(e && e.cmdDictionary && e.cmdDictionary.en){
                            langObj['en'][e._id] = e.cmdDictionary.en;
                        }
                        if(e && e.cmdDictionary && e.cmdDictionary.he){
                            langObj['he'][e._id] = e.cmdDictionary.he;
                        }
                    });
                }
                if(callbackDone){
                    callbackDone(null, langObj);
                }

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
    },

    removeAll: function(){
        Dictionary.remove({}, function(err, res){
            if(err){ console.error(err); }
            else{ console.log('ALL COMMANDS REMOVED'); }
        })
    },


};

//mod.getCmdDictionary();
