function twoFactorCodeCb(next) {
    next("223667");
}

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var mongoose = require('./configs/mongoose');
var log = require('./configs/logger')(module);
var config = require('./configs/config_file');
var Player = require('./models/player.js');

var port = process.env.PORT || 5000;
var fs = require('fs');

var options = {
    saveCookie : true,
    saveCookiePath : './cookie/mycookie',
    loadCookieFromSavePath : './cookie/mycookie'
}
var futapi = require("./futLib/index.js");
var apiClient = new futapi(options);
var async = require('async');
var trader = new (require('./trader.js'))(apiClient);

var botStatus = false, inter, time = 60 * 1000 * 34, timeInter;

var actualTime = time;


var app = express();

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
    Player.find(function (err, players) {
        res.render('index', {
            status : botStatus,
            players : players,
            time : time
        });
    })
})
app.get('/start', function (req, res, next) {
    if (botStatus) {
        return;
    }
    command();
    inter = setInterval(function () {
        command();
    }, time);

    timeInter = setInterval(function () {
        actualTime -= 1000;
    }, 1000);
    botStatus = true;
    res.redirect('/log');
});
app.get('/stop', function (req, res, next) {
    clearInterval(inter);
    clearInterval(timeInter);
    actualTime = time;
    botStatus = false;
})
app.get('/log', function (req, res) {
    res.sendfile('debug.log');
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
    fs.writeFile(__dirname + '/debug.log', '', function(){});
    console.log('Node app is running on port', port);
});

function command() {

    actualTime = time;

    // apiClient.login("antonovphilipdev@gmail.com","F16FifaFut", "tatiana", "xone",
    apiClient.login("molo4nik11@gmail.com","Clorew321SSaa", "kopitin", "xone",
        twoFactorCodeCb,
        function (error,response) {
        if (error) {
        	console.log(error);
            return console.log("Unable to login.");
        }
        console.log("logged in.");
        console.log("*******************************************************");
        console.log("*******************************************************");
        console.log("*******************************************************");

        // Возможные ключи
        // leag : 13 // Barclays
        // micr min bid
        // macr max bid
        // minb max buy now
        // maxb max buy now
        // zone defense midfield attacker
        // pos для точной позиции
        // rare : 'SP'

        // rareflag : 0 обычная
        // rareflag : 1 чуть лучше
        // rareflag : 2 или 3 информ !!!! почему то нельзя поискать по 2
        // raraflag : 4 hero фиолетовая
        // raraflag : 5 тоти синяя
        // raraflag : 6 рекорд брейкер синяя с красной полосой и красным низом
        // raraflag : 11 тотс синяя с полоской золотой
        
        // торговая страта
        // trader.startNonStopTrading([
        // ], 1000 * 60 * 60);
        
        // trader.removeSold();
        
        trader.set({
            minPlayerSpeed : 78,
            // minPlayerSpeed : 60,
            // buyAndSellDiffNotToSkip : 300,
            buyAndSellDiffNotToSkip : 200,
            // buyAndSellDiffNotToSkip : 0,
            lowerCostCountForSkip : 3
            // lowerCostCountForSkip : 99
        })
            .tradeCycle([
            trader.reList.bind(trader),
            // trader.buyAndSellWithIncreasingCost.bind(trader, {type: "player", lev: 'bronze', maxb : 200, start:0, num:20 }, 100000, 50, 1.25, null, 1)
            // trader.buyAndSellWithIncreasingCost.bind(trader, {type:'player', rare:'SP', minb: 3000, maxb: 4000, start:0, num:20 }, 100000, 200, 1.25, null, 8)
            trader.buyAndSellWithIncreasingCost.bind(trader, {type:'player', rare:'SP', minb: 5000, maxb: 7000, start:0, num:20 }, 100000, 300, 1.25, null, 8)
        ]);

        // var a = trader
            // .set({ bidIncr : 150, buyNowIncr : 150, buyMinPercent : 90 })

            // специальные бичи с 3000
            // .buyAndSellWithIncreasingCost({type:'player', rare:'SP', minb: 5000, maxb: 7000, start:0, num:10 }, 9000, 300, 1.25, null, 8);


            // .search({type: "player", maskedDefId : 8494, start: 0, num : 1 })
            // .search({type: "player", lev: "silver", pos: "LB", micr : 150, maxb : 300, start: 0, num : 1 })
            // .search({type: "player", lev: 'bronze', rare : '3', start: 0, num : 10 })
            // .each(true, [trader.buyMin, trader.toTradepile, trader.sell]);
            // .each(true, [trader.buy, trader.toTradepile, trader.sell]);
            // .openPack();
    });
}
