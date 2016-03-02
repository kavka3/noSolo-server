/**
 * Created by Ignat on 1/25/2016.
 */

var shorter = require('goo.gl'),
    API_KEY = null
    ;

if(!process.env.GOOGLE_API_KEY){
    var config = require('../config/config');
    API_KEY = config.google.api_key;
}
else{
    API_KEY = process.env.GOOGLE_API_KEY;
}

shorter.setKey(API_KEY);


module.exports = {
    minimizeUrl: function(fullUrl, callback){
        shorter.shorten(fullUrl)
            .then(function (shortUrl) {
                //console.log(shortUrl);
                callback(null, shortUrl)
            })
            .catch(function (err) {
                //console.error(err.message);
                callback(err);
            });
    },
    // See: https://developers.google.com/console/help/#cappingusage to extra parameters
    expandUrl: function(shortUrl, callback){
        shorter.expand(shortUrl)
            .then(function (longUrl) {
                //console.log(longUrl);
                callback(null, longUrl);
            })
            .catch(function (err) {
                //console.error(err.message);
                callback(err);
            });
    },
    getAnalyticsByUrl: function(url, callback){
        shorter.analytics(url, {projection: 'FULL'})
            .then(function(result) {
                //console.log(result);
                callback(null, result);
            })
            .catch(function (err) {
                //console.error(err.message);
                callback(err);
            });
    }
};
