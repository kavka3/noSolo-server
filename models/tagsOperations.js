var log = require('../lib/log.js')(module),
    common = require('../lib/commonFunctions.js'),
    Tag = require('../data/tagSchema.js');

var TagsOperations = {
    createNewTag: function(tag, callback){
        var savingTag = new Tag(tag);
        savingTag.save(function(err, savingTag, affected){
            if(err){
                log.error(err);
                callback(err);
            }
            else{
                log.info('tag saved: ' + savingTag._title);
                callback(null, savingTag);
            }
        });
    },

    addActivities: function(activityObj, callback){
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
    },

    getTagsDictionary: function(languages, callback){
        Tag.find({},'_title tagDictionary tagCategory imageUrl', function(err, results, affected){
            if(err){
                log.error(err.message);
                callback(err);
            }
            else{
                var sortedTags = {},
                    en = [],
                    ru = [],
                    he = [];
                for(var tag = 0; tag < results.length; tag++){
                    /*var enTag = {};
                     enTag._title = results[tag]._title;
                     enTag.name = results[tag]._title;
                     if(results[tag].tagCategory){
                     enTag.tagCategory = results[tag].tagCategory;
                     }
                     if (results[tag].imageUrl) {
                     enTag.imageUrl = results[tag].imageUrl;
                     }
                     en.push(enTag);*/
                    if(results[tag].tagDictionary){
                        for(var i = 0; i < results[tag].tagDictionary.length; i++){
                            for(var lang in results[tag].tagDictionary[i]) {
                                if (languages.indexOf(lang) > -1) {
                                    var tagObj = {};
                                    tagObj._title = results[tag]._title;
                                    if (results[tag].tagCategory) {
                                        tagObj.tagCategory = results[tag].tagCategory;
                                    }
                                    if (results[tag].imageUrl) {
                                        tagObj.imageUrl = results[tag].imageUrl;
                                    }
                                    if (results[tag].tagDictionary[i].hasOwnProperty(lang)) {
                                        tagObj.name = results[tag].tagDictionary[i][lang];
                                        switch (lang) {
                                            case 'ru':
                                                ru.push(tagObj);
                                                break;
                                            case 'he':
                                                he.push(tagObj);
                                                break;
                                            case 'en':
                                                en.push(tagObj);
                                            default:
                                                break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                sortedTags.en = en;
                sortedTags.ru = ru;
                sortedTags.he = he;
                callback(null, sortedTags);
            }
        });
    },

    imageUrlUpdate: function(tagId, url, callback){
        Tag.findByIdAndUpdate(tagId,{imageUrl: url}, function(err, resTag){
            if(err){
                log.error(err);
                callback(err);
            }
            else{
                callback(null, resTag);
            }
        } )
    },

    getAllTags: function(callback){
        Tag.find({}, function(err, tags){
            if(err){ callback(err); }
            else{ callback(null, tags); }
        })
    }
};

module.exports = TagsOperations;