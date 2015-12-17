/**
 * Created by Ignat on 12/1/2015.
 */

var redis = require('redis'),
    log = require('./log.js')(module),
    common = require('./commonFunctions.js'),
    url = require('url'),
    redisClient
    ;

function setConnection(){
    if(!common.isEmpty(process.env.REDISCLOUD_URL)){
        log.info('in set redis on heroku');
        var redisURL = url.parse(process.env.REDISCLOUD_URL );
        redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
        redisClient.auth(redisURL.auth.split(":")[1]);
    }
    else{
        log.info('in set redis local');////
        redisClient = redis.createClient();
    }

};

setConnection();

module.exports = {
    client: redisClient
};