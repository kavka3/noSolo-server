/**
 * Created by Ignat on 5/10/2016.
 */

var Tag = require('../../models/tagsOperations.js');

module.exports = {
   create: create,
   dictionary: dictionary
};

function create(request, response) {
    Tag.createNewTag(request.body, function(err, result){
        if(err){ response.status(500).json({ message: err.message }); }
        else{
            response.json({
                result: 'success',
                data: result
            });
        }
    });
};

function dictionary(request, response){
    Tag.getTagsDictionary(request.body.languages, function(err, resTags){
        if(err){ response.status(500).json({ message: err.message }); }
        else{
            response.json({
                result: 'success',
                data: resTags
            });
        }
    });
};