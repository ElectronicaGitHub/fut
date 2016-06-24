// var twoFactorCode = '223667';

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
var DataItem = require('./models/DataItem.js');
var DataStorage = require('./models/DataStorage.js');
var MoneySnapshot = require('./models/MoneySnapshot.js');
var _ = require('lodash');

var app = express();

// проверка аргументов
var DEBUG = false;
var argv = require('minimist')(process.argv.slice(2));
if (argv.DEBUG) {
    DEBUG = true;
    console.log('DEBUG MODE');
}

// для снепшотов
var heapdump = require('heapdump');
var path = require('path');
var fs = require('fs');
heapdump.writeSnapshot(path.join(__dirname, 'var/local/') + Date.now() + '.heapsnapshot');

var port = process.env.PORT || 5000;
var options = {
    saveCookie : true,
    saveCookiePath : './cookie/mycookie',
    loadCookieFromSavePath : './cookie/mycookie'
}
var futapi = require("./futLib/index.js");
var apiClient = new futapi(options);
var trader = new (require('./trader.js'))(apiClient);

var botStatus = !DEBUG,
    buyStatus = true,
    inter,
    timeInter,
    time = 60 * 1000 * 34;

var parsingData = {
    players : []
}

var actualTime = time, 
    currentStrategy = 'default',
    searchOptions = {
        rare : 'SP',
        maxb : 16000,
        minb : 13000,
        zone : 'attacker'
    },
    strategyOptions = {
        default : {
            minPlayerSpeed : 80,
            minPlayerDribling : 80,
            buyAndSellDiffNotToSkip : 500,
            lowerCostCountForSkip : 3,
            step : 1000,
            buyMinNoiseCoef : 1.25,
            moneyLimit : null,
            itemsLimit : 8,
            maxPlayersInListToBuy : 25,
            maxSoldTimeToSkipInDays : 3,
            minimumRating : 76
        },
        players : {
            list : [],
            maxPlayersInListToBuy : 25, 
            buyMinNoiseCoef: 1.25, 
            maxBuyPrice: 30000,
            itemsLimit : 8
        }
    }

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
    DataStorage.findOne(function (err, dataStorage) {
        DataItem.find(function (err, dataItems) {
            // Player.find().sort({ soldTime : -1 }).exec(function (err, players) {
            Player.find({ sold : true }).sort({ soldTime : -1 }).exec(function (err, players) {
                // Player.find().sort({ created : -1 }).exec(function (err, activePlayers) {
                Player.find({ sold : false }).sort({ created : -1 }).exec(function (err, activePlayers) {
                    MoneySnapshot.find().sort({ created : -1 }).exec(function (err, snapshots) {
                        readCodeFromFile(function (code) {
                            res.render('index', {
                                status : botStatus,
                                players : players,
                                activePlayers : activePlayers,
                                snapshots : snapshots,
                                time : actualTime,
                                dataStorage : dataStorage.data,
                                credits : trader.credits,
                                buyStatus : buyStatus,
                                twoFactorCode : code,
                                currentStrategy : currentStrategy,
                                playersListForStrategy : strategyOptions.players.list,
                                searchOptions : searchOptions,
                                strategyOptions : strategyOptions,
                                playersInTradeList : trader.playersInTradeList,
                                soldPlayersCount : trader.soldPlayersCount,
                                parsingData : parsingData,
                                dataItems : dataItems
                            });     
                        });
                    });
                });
            });
        });
    });
});
app.get('/start', function (req, res, next) {
    start();
    res.redirect('/');
});
app.get('/stop', function (req, res, next) {
    stop();
    res.redirect('/');
});
app.get('/log', function (req, res) {
    res.sendfile('debug.log');
});

app.get('/toggleBuying', function (req, res, next) {
    buyStatus = !buyStatus;
    res.redirect('/');
});
app.post('/changeTwoFactorCode', function (req, res, next) {
    var data = req.body;
    // twoFactorCode = data.twoFactorCode;
    writeCodeToFile(data.twoFactorCode);
    res.redirect('/');
});
app.post('/changePlayersList', function (req, res, next) {
    var data = req.body;
    strategyOptions.players.list = data.searchPlayersList;
    res.send('ok');
});
app.post('/changeDataStorage', function (req, res, next) {
    var data = req.body;
    DataStorage.findOne({}, function (err, ok) {
        if (err) return next(err);
        var _data = _.extend(ok.data, data);
        ok.data = _data;
        ok.save(function (err, ok) {
            if (err) return next(err);
            res.send('ok');
        })
    });
});
app.post('/saveCurrentStrategy', function (req, res, next) {
    var data = req.body;
    currentStrategy = data.currentStrategy;
    res.send('ok');
})
app.post('/changeSearchOptions', function  (req, res, next) {
    var data = req.body;
    searchOptions = data.searchOptions;
    res.send('ok');
});
app.post('/changeStrategyOptions', function  (req, res, next) {
    var data = req.body;
    strategyOptions = data.strategyOptions;
    res.send('ok');
});

// API
// 
app.get('/api/players', function (req, res, next) {
    Player.find({ sold : true }).sort({ soldTime : -1 }).exec(function (err, players) {
        res.json({
            players : players,
        });
    });
});
app.get('/api/snapshots', function (req, res, next) {
    MoneySnapshot.find().sort({ created : -1 }).exec(function (err, snapshots) {
        res.json({
            snapshots : snapshots
        });
    });
});

function start() {
    // if (botStatus) {
        // return;
    // }
    command();
    inter = setInterval(function () { command(); }, time);
    timeInter = setInterval(function () { actualTime -= 1000; }, 1000);
    botStatus = true;
}
function stop () {
    clearInterval(inter);
    clearInterval(timeInter);
    actualTime = time;
    botStatus = false;
}

if (botStatus) {
    start();
}

function readCodeFromFile(cb) {
    var filePath = path.join(__dirname, './cookie/code');

    fs.readFile(filePath, {encoding: 'utf-8'}, function (err,data) {
        if (!err) {
            cb(data);
            // console.log('received data: ' + data);
        } else {
            console.log(err);
        }
    });
}
function writeCodeToFile (code) {
    fs.writeFile("./cookie/code", code, function (err) {
        if (err) {
            return console.log(err);
        } else {
            // console.log('wroted');
        }
    }); 
}

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
        console.log("*******************************************************");
        console.log("********************* logged in ***********************");
        console.log("*******************************************************");

        var tradeList = [
            // trader.reListWithDBSync.bind(trader),
            trader.startParse.bind(trader, parsingData.players, strategyOptions.default.buyMinNoiseCoef)
        ];
        // if (buyStatus) {
        //     if (currentStrategy == 'default') {
        //         tradeList.push(trader.buyAndSellWithIncreasingCost.bind(trader, {
        //             type:'player', 
        //             rare: searchOptions.rare, 
        //             minb: searchOptions.minb, 
        //             maxb: searchOptions.maxb, 
        //             zone: searchOptions.zone, 
        //             start: 0, 
        //             num: 40 
        //         }, 100000, 
        //             strategyOptions.default.step, 
        //             strategyOptions.default.maxPlayersInListToBuy, 
        //             strategyOptions.default.buyMinNoiseCoef, 
        //             strategyOptions.default.moneyLimit, 
        //             strategyOptions.default.itemsLimit,
        //             strategyOptions.default.maxSoldTimeToSkipInDays));

        //     } else if (currentStrategy == 'players') {
        //         tradeList.push(trader.buyAndSellSelectedPlayers.bind(trader, {
        //             type:'player', 
        //             rare: searchOptions.rare, 
        //             minb: searchOptions.minb, 
        //             maxb: searchOptions.maxb, 
        //         }, strategyOptions.players.list, 
        //             strategyOptions.players.maxPlayersInListToBuy, 
        //             strategyOptions.players.buyMinNoiseCoef, 
        //             strategyOptions.players.maxBuyPrice, 
        //             strategyOptions.players.itemsLimit));
        //     }

        // }
       // trader.buyAndSellWithIncreasingCost.bind(trader, {type:'player', rare:'SP', minb: 3000, maxb: 4000, start:0, num:20 }, 100000, 200, 1.25, null, 8)
       // trader.buyAndSellWithIncreasingCost.bind(trader, {type: "player", lev: 'bronze', maxb : 200, start:0, num:20 }, 100000, 50, 1.25, null, 1)

        trader.set(strategyOptions[currentStrategy])
        .tradeCycle(tradeList);
    });
}

function twoFactorCodeCb(next) {
    readCodeFromFile(function (code) {
        next(code);
    });
}

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
