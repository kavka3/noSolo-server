var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    passport = require('passport'),
    multer  = require('multer'),
    http = require('http'),
    log = require('./lib/log.js')(module),
    async = require('async'),
    mail = require('./lib/email.js')
    ;

var app = express();
app.set('port', (process.env.PORT || 5000));
app.enable('trust proxy');

app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');//http://localhost:11000
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

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.cookieParser());
/*app.use(express.session({
  secret: 'session-secret',
  key: 'sid',
  cookie: {
    "path": "/",
    "httpOnly": true,
    "maxAge": null
  }
}));
app.use(passport.initialize());
app.use(passport.session());*/
//mw for file uploading managment
app.use(multer({ dest: './uploads/',
  rename: function (fieldname, filename) {
    return filename+Date.now();
  },
  onFileUploadStart: function (file) {
    console.log(file.originalname + ' is starting ...');
  },
  onFileUploadComplete: function (file) {
    console.log(file.fieldname + ' uploaded to  ' + file.path);
    done = true;
  }
}));
app.use(app.router);
require('./routes')(app);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/googlef8692a73a6a70ce3.html', function(req, res){
   res.sendfile(path.join(__dirname, 'public/googlef8692a73a6a70ce3.html'));
});

app.use(function(err, req, res, next){
// development only
  if ('development' == app.get('env'))
  {
    var errorHandler = express.errorHandler();
    errorHandler(err, req, res, next);
  }else
    res.send(err);
});

var server = http.createServer(app);
server.listen(app.get('port'), function(){
    log.info('Express server listening on port ' + app.get('port'));
});
var socket = require('./lib/socket.js');
socket.socketObj(server);


notify = require('./models/notificationManager.js');

process.on('uncaughtException', function(err){
    socket.closeConnection();
    notify.clearLocal(function(){
        console.log('EXTREMAL QUIT: ' + err.stack);
        mail.sendMail(err, function(error){
            if(error){ log.error('ONE MORE ERROR: ' + error); process.exit(1); }
            else{ console.log('EXTREMAL QUIT DONE'); process.exit(1); }
        })

    });
  /*  async.series([
            function(callback){
                socket.closeConnection();
                callback();
            },
            function(callback){
                notify.clearLocal(function(){
                    console.log('EXTREMAL QUIT: ' + err.stack);
                    callback();
                });
            },
            function(callback){
                mail.sendMail(err, function(err){
                    if(err){ log.error(err); callback(); }
                    else{ callback(); }
                })
            }
        ],
        function(error, result){
            if(error){log.error(error); process.exit(1); }
            else{ console.log('EXTREMAL QUIT DONE'); process.exit(1); }
        });*/



});


