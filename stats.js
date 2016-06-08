var twoFactorCode = '223667';

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var mongoose = require('./configs/mongoose');
var log = require('./configs/logger')(module);
var config = require('./configs/config_file');
var async = require('async');
var fs = require('fs');
var Player = require('./models/player.js');
var app = express();


var port = process.env.PORT || 5001;

mongoose.connection.on('open', function () {
    log.info('connected to database ' + config.get('db:name'));
});
    
// view engine setup
app.engine('ejs', require('ejs-locals'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(__dirname + '/public/assets/favicon.png'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.use(express.static(path.join(__dirname, 'public')));
// лендинг и регистрации
// app.use('/', require('./routes/index.js')(express));

app.get('/', function (req, res, next) {
    Player.find({ sold : true }).sort({ sold : -1 }).exec(function (err, players) {
        res.render('stats', {
            players : players
        });
    })
});

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.listen(port, function() {
    // fs.writeFile(__dirname + '/debug.log', '', function(){});
    console.log('Node app is running on port', port);
});
