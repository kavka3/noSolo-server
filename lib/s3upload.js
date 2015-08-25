/**
 * Created by comp on 3/5/2015.
 */

var crypto = require('crypto'),
    log = require('./log.js')(module),
    mongoose = require('./db.js').mongoose,
    async = require('async'),
    User = require('../models/userOperations.js'),
    Activity = require('../models/activitiesOperations.js'),
    ObjectId = mongoose.Types.ObjectId,
    Tag = require('../models/tagsOperations.js'),

    END_OF_URL = '.s3.amazonaws.com/',
    bucket = process.env.S3_BUCKET,
    awsKey = process.env.AWS_ACCESS_KEY,
    secret = process.env.AWS_SECRET_KEY;

exports.sign = function(req, res, next) {

    console.log('IN S3 UPLOAD');

    var parsed = JSON.parse(req.body.fileName),
        expiration = new Date(new Date().getTime() + 1000 * 60 * 5).toISOString(),
        fileName,
        fullPath,
        activityId = null;

    async.series([
            function(callback){
                if(parsed.type == 'userId'){
                    fileName = 'u' + parsed._id.toString() + '.' + parsed.encodingType;
                    fullPath = 'https://' + bucket + END_OF_URL + fileName;
                    User.universalUserUpdate(parsed._id, 'imageUrl', fullPath, function(err, resUser){
                        if(err){ callback(err); }
                        else{ callback(null); }
                    });
                }
                else if(parsed.type === 'tagId'){
                    fileName = 't' + parsed._id.toString()+ '.' + parsed.encodingType;
                    fullPath = 'https://' + bucket + END_OF_URL + fileName;
                    Tag.imageUrlUpdate(parsed._id, fullPath,  function(err, resTag){
                        if(err){ callback(err); }
                        else{ callback(null); }
                    });
                }
                else if(parsed.type == 'newActivityId' || parsed.type == 'activityId'){
                    if (parsed.type == 'newActivityId') {
                        activityId = new ObjectId;
                        fileName = 'a' + activityId + '.' + parsed.encodingType;
                        fullPath = 'https://' + bucket + END_OF_URL + fileName;
                        callback(null);
                    }
                    else if (parsed.type == 'activityId') {
                        console.log('IN ACTIVITY ID CASE');
                        activityId = parsed._id;
                        fileName = 'a' + parsed._id + '.' + parsed.encodingType;
                        fullPath = 'https://' + bucket + END_OF_URL + fileName;
                        Activity.updateImage({_id: parsed._id, imageUrl: fullPath}, function (err, resAct) {
                            if(err){ console.log('UPDATE ERROR', err);callback(err); }
                            else{ callback(null); }
                        });
                    }
                }
                else if(parsed.type == 'chatPhoto'){
                    console.log('IN CHAT PHOTO ID CASE');
                    var timestmp = Math.floor(Date.now() / 1000);
                    fileName = 'chph' + parsed._id + timestmp + '.' + parsed.encodingType;
                }
            },
            function(callback){
                var policy =
                { "expiration": expiration,
                    "conditions": [
                        {"bucket": bucket},
                        {"key": fileName},
                        {"acl": 'public-read'},
                        ["starts-with", "$Content-Type", ""],
                        ["content-length-range", 0, 524288000]
                    ]};

                policyBase64 = new Buffer(JSON.stringify(policy), 'utf8').toString('base64');
                signature = crypto.createHmac('sha1', secret).update(policyBase64).digest('base64');
                var response = {bucket: bucket, awsKey: awsKey, policy: policyBase64,
                    signature: signature, fileName: fileName, activityId: activityId, fullPath: fullPath };

                console.log('IN RESPONSE OF UPLOAD: ', response);
                res.send(response);
                callback(null);

            }
        ],
        function(err){
            if(err){
                log.error(err);
                res.send(err);
            }
        }
    );
};
