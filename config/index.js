/**
 * Created by Ignat on 5/10/2015.
 */

var nconf = require('nconf');
var path = require('path');
var fs = require('fs');

nconf.argv()
    .env()
    .file({ file: path.join(__dirname, 'config.json') });

module.exports = nconf;