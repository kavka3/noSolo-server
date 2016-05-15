/**
 * Created by Ignat on 11/11/2015.
 */

var Dictionary = require('../data/serverDictionarySchema.js'),
    commandDictionary = {}
    ;

getDictionary(null);

module.exports = {
    update: update,
    createCommand: createCommand,
    dictionary: commandDictionary,
    getDictionary: getDictionary,
    createMessage: createMessage,
    checkLanguage: checkLanguage
};

function update(command, callback){
    Dictionary.findByIdAndUpdate(command._id, command, {new: true}, function(err, updatedCommand){
        if(err){ callback(err); }
        else{ callback(null, updatedCommand); }
    })
};

function createCommand(_id, ctrlName, ctrlCommand, cmdDict, callbackDone){
    var newCommand = Dictionary({
        _id: _id,
        control: ctrlName,
        command: ctrlCommand,
        cmdDictionary: cmdDict
    });
    newCommand.save(function(err, resCmd){
        if(err){ callbackDone(err); }
        else{ callbackDone(null, resCmd) }
    })
};

function getDictionary(callbackDone){
    Dictionary.find({}, function(err, resDict){
        if(err){ if(callbackDone){ callbackDone(err); } }
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
        if(component){
            if(component['param'] != null){
                resMessage += component['param'];
            }
            else{
                resMessage += commandDictionary[checkedLang][component['commandId']]
            }
        }

    });
    return resMessage;
};
