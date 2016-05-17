/**
 * Created by Ignat on 12/1/2015.
 */

var redis = require('redis'),
    common = require('./commonFunctions.js'),
    url = require('url'),
    redisClient
    ;

function setConnection(){
    if(!common.isEmpty(process.env.REDISCLOUD_URL)){
        var redisURL = url.parse(process.env.REDISCLOUD_URL );
        redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
        redisClient.auth(redisURL.auth.split(":")[1]);
    }
    else{
        var config = require('../config/config');
        var redisURL = url.parse(config.redis.url);
        redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
        redisClient.auth(redisURL.auth.split(":")[1]);
    }

};

setConnection();

module.exports = {
    client: redisClient
};