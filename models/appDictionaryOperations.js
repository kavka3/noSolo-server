/**
 * Created by Ignat on 9/28/2015.
 */

var common = require('../lib/commonFunctions.js'),
    Dictionary = require('../data/appDictionarySchema.js')
    ;

module.exports = {
    update: update,
    createCommand: createCommand,
    getCmdDictionary: getCmdDictionary,
    getCommandBase: getCommandBase,
    findById: findById
};

function update(command, callback){
    Dictionary.findByIdAndUpdate(command._id, command, {new: true}, function(err, updatedCommand){
        if(err){ callback(err); }
        else{ callback(null, updatedCommand); }
    })
};

function createCommand(_id, ctrlName, ctrlCommand, cmdDict, callbackDone){
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
    newCommand.save(function(err, resCmd){
        if(err){ callbackDone(err); }
        else{ callbackDone(null, resCmd) }
    })
};

function getCmdDictionary(callbackDone){
    Dictionary.find({}, function(err, resDict){
        if(err){ callbackDone(err); }
        else if(!common.isEmpty(resDict)){
            var langObj = {
                en: {},
                he: {}
            };
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
};

function getCommandBase(callbackDone){
    Dictionary.find({}, function(err, resDict){
        if(err){callbackDone(err);}
        else{callbackDone(null,resDict);}
    })
};

function findById(id, callback){
    Dictionary.findById(id, function(err, resCommand){
        if(err){ callback(err); }
        else{ callback(null, resCommand); }
    })
};


