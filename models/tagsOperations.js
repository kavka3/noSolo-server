var log = require('../lib/log.js')(module),
    common = require('../lib/commonFunctions.js'),
    Tag = require('../data/tagSchema.js');

module.exports = {
    createNewTag: createNewTag,
    addActivities: addActivities,
    getTagsDictionary: getTagsDictionary,
    imageUrlUpdate: imageUrlUpdate,
    getAllTags: getAllTags
};

function createNewTag(tag, callback){
    var savingTag = new Tag(tag);
    savingTag.save(function(err, savingTag){
        if(err){
            log.error(err);
            callback(err);
        }
        else{
            callback(null, savingTag);
        }
    });
};

function addActivities(activityObj, callback){
    for(var i = 0; i < activityObj.tags.length; i++ ){
        Tag.findOne({_title: activityObj.tags[i]}, function(err, result){
            if(err){
                log.error(err);
                callback(err);
            }
            else if(result == null || result.length == 0){
                log.error('tag is not found: ' + activityObj.tags[i]);
                //callback(new Error('tag is not found'));
                //callback(null);
            }
            else{
                log.info('tag found: ' + result._title);
                result.activities.push(activityObj.activityId);
                result.save(function(err, result, affected){
                    if(err){
                        log.error(err);
                        callback(err);
                    }
                    else{
                        log.info('tag updated: ' + result._title);
                    }
                });
            }
        });
    }
    callback(null);
};

function getTagsDictionary(languages, callback){
    Tag.find({},'_title tagDictionary tagCategory imageUrl', function(err, allTags){
        if(err){
            log.error(err.message);
            callback(err);
        }
        else{
            var resTags = {};
            if(common.isEmpty(languages)){
                languages = ['en'];
            }
            for(var index in languages){
                var lang = languages[index];
                resTags[lang] = allTags.map(function(tag){
                    var copy = common.deepObjClone(tag);
                    copy['name'] = getTagNameByLang(tag.tagDictionary, lang);

                    return copy;
                })
            }
            callback(null, resTags);
        }
    });
};

function imageUrlUpdate(tagId, url, callback){
    Tag.findByIdAndUpdate(tagId,{imageUrl: url}, function(err, resTag){
        if(err){
            log.error(err);
            callback(err);
        }
        else{
            callback(null, resTag);
        }
    } )
};

function getAllTags(callback){
    Tag.find({}, function(err, tags){
        if(err){ callback(err); }
        else{ callback(null, tags); }
    })
};

function getTagNameByLang(dictionary, lang){
    for(var i = 0; i < dictionary.length; i++){
        if(dictionary[i].hasOwnProperty(lang)){
            return dictionary[i][lang];
        }
    }
    return 'unknown name';
};