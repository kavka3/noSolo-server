/**
 * Created by Ignat on 8/25/2015.
 */

var Agenda = require('agenda');
var mongodbUri = null;
if(!process.env.MONGOLAB_URI){
    console.log('AGENDA IN DB LOCAL');
    var config = require('../config/config');
    mongodbUri = config.mongoose.uri;
}
else{
    mongodbUri = process.env.MONGOLAB_URI;
}
    agenda = new Agenda({db: {address: mongodbUri}});

module.exports = {
    checkAgenda: function(){
        agenda.define('greet the world', function(job, done) {
            console.log(job.attrs.data.time, 'hello world!');
            done();
        });

        //agenda.schedule('in 10 seconds', 'greet the world', {time: new Date()});
        agenda.every('5 seconds', 'greet the world', {time: new Date()});
        agenda.start();

        console.log('Wait 10 seconds...');
    }
};
