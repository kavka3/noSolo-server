/**
 * Created by Ignat on 11/11/2015.
 */

var log = require('../lib/log.js')(module),
    async = require('async'),
    connection = require('../lib/db.js').connection,
    common = require('../lib/commonFunctions.js'),
    Dictionary = require('../data/serverDictionarySchema.js'),
    commandDictionary = {}
    ;

function getDictionary(callbackDone){
    Dictionary.find({}, function(err, resDict){
        if(err){
            log.error(err);
            if(callbackDone){ callbackDone(err); }

        }
        else{
            var dictObj = {
                en: {},
                he: {}
            };
            resDict.forEach(function(command){
                dictObj['en'][command._id] = command.cmdDictionary.en;
                dictObj['he'][command._id] = command.cmdDictionary.en;
            });
            commandDictionary = dictObj;
            //var str = JSON.stringify(resDict);
            //console.log('res dict:', commandDictionary);
            if(callbackDone){
                callbackDone(null, dictObj);
            }
        }
    })
};

function checkLanguage(lang){
    return lang == 'en' || lang == 'he'? lang : 'en'
};

function createMessage(userLang, messageComponents){

    var checkedLang = checkLanguage(userLang);
    var resMessage = '';
    messageComponents.forEach(function(component){
        //console.log('createMessage param', component);
        if(component['param'] != null){
            resMessage += component['param'];
        }
        else{
            resMessage += commandDictionary[checkedLang][component['commandId']]
        }
    });
    return resMessage;
};



getDictionary(null);

module.exports = {
    update: function(command, callback){
        Dictionary.findByIdAndUpdate(command._id, command, {new: true}, function(err, updatedCommand){
            if(err){ callback(err); }
            else{ callback(null, updatedCommand); }
        })
    },
    getById: function(id, callback){
        Dictionary.findById(id, function(err, resCommand){
            if(err){ callback(err); }
            else{ callback(null, resCommand); }
        })
    },
    createCommand: function(_id, ctrlName, ctrlCommand, cmdDict, callbackDone){
        var newCommand = Dictionary({
                    _id: _id,
                    control: ctrlName,
                    command: ctrlCommand,
                    cmdDictionary: cmdDict
                });
        console.log('NEW SERVER COMMAND', newCommand);
        newCommand.save(function(err, resCmd){
            if(err){ callbackDone(err); }
            else{ callbackDone(null, resCmd) }
        })
    },
    dictionary: commandDictionary,
    getDictionary: getDictionary,
    createMessage: createMessage,
    checkLanguage: checkLanguage


};

function deleteAll(){
    var connection = require('../lib/db.js').connection;
    connection.db.dropCollection('serverdictionaries', function(err, result) {
        if(err){
            console.error(err)
        }
        else{
            console.log(result)
        }
    });
}

//deleteAll();