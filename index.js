var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    passport = require('passport'),
    http = require('http'),
    async = require('async'),
    mail = require('./lib/email.js')
    ;

var app = express();
app.set('port', (process.env.PORT || 5000));
app.enable('trust proxy');

app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);
  // Pass to next layer of middleware
  next();
});


app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.cookieParser());

app.use(app.router);
require('./routes')(app);
app.use(express.static(path.join(__dirname, 'public')));

var server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});
var socket = require('./lib/socket.js');
socket.socketObj(server);

process.on('uncaughtException', function(err){
    socket.closeConnection();
    console.log('EXTREMAL QUIT: ' + err.stack);
    mail.sendMail(err, function(error){
        if(error){ console.error('ONE MORE ERROR: ' + error); process.exit(1); }
        else{ console.log('EXTREMAL QUIT DONE'); process.exit(1); }
    })
});


