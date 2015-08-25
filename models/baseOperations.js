var mongoose = require('../lib/db.js').connection;
var log = require('../lib/log.js')(module);

var Base = {
    clearBase: function(callback){
        mongoose.db.dropDatabase(function () {
            callback('base empty');
        });
    }
};

module.exports = Base;