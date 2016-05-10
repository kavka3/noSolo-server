/**
 * Created by Ignat on 1/14/2016.
 */

var tinify = require("tinify"),
    fs = require('fs'),
    request = require('request'),
    base64 = require('node-base64-image'),
    async = require('async'),
    TINY_API_KEY = null,
    AWS_KEY = null,
    AWS_PASS = null,
    AWS_BUCKET = "nosoloimages/",
    AWS_LINK = 'https://s3.amazonaws.com/nosoloimages/'
;

if(!process.env.TINY_API_KEY){
    console.log('IN TINY LOCAL');
    var config = require('../config/config');
    TINY_API_KEY = config.tinyKey ;
    AWS_KEY = config.aws.aws_access_key_id;
    AWS_PASS = config.aws.aws_secret_access_key
}
else{
    TINY_API_KEY = process.env.TINY_API_KEY;
    AWS_KEY = process.env.AWS_KEY;
    AWS_PASS = process.env.AWS_PASS;
    console.log('IN TINY HEROKU');
}

tinify.key = TINY_API_KEY;

function b64toBlob(b64Data, sliceSize) {
    sliceSize = sliceSize || 512;
    var byteCharacters = atob(b64Data);
    var byteArrays = [];
    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);
        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        var byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, {type: 'image/jpeg'});
}


module.exports = {

    downLoadFile: function(uri, fileName, callbackDone){
        async.waterfall([
            //download image
            function(callback){
                var options = {string: true};
                base64.base64encoder(uri, options, function (err, image) {
                    if (err) {
                        callback(err);
                    }
                    //console.log('BASE 64', image);
                    var buf = new Buffer(image, 'base64');
                    //console.log('Binary', buf);

                    callback(null, buf)
                });
            },
            function(blob, callback){
                    //console.log('GET IMAGE DATA', blob);
                    var source = tinify.fromBuffer(blob);
                    //console.log('GET IMAGE DATA', source);
                    source.store({
                        service: "s3",
                        aws_access_key_id: AWS_KEY,
                        aws_secret_access_key: AWS_PASS,
                        path: AWS_BUCKET + fileName
                    },function(err){
                        console.error('downLoadFile error', err);
                    });
                callback(null, AWS_LINK + fileName + '.jpg');
            }
        ],
        function(err, awsUri){
            if(err){
                console.log(err);
                callbackDone(err);
            }
            else{
                console.log('image compressed', awsUri);
                callbackDone(null, awsUri);
            }
        })
    }

};