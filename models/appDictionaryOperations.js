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
    //all args should be > then 4 symbols
    createCommand: function(ctrlName, ctrlCommand, cmdDict, callbackDone){
        var newCommand = Dictionary({
            control: ctrlName,
            command: ctrlCommand,
            cmdDictionary: cmdDict
        });
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
            else{ callback(new Error('Dictionary is Empty')); }
        });
    }
}
