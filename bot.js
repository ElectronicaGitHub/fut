var express = require('express');
var app = express();
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

var botStatus = false, inter;


app.get('/', function (req, res, next) {
    res.sendfile('index.html');
})
app.get('/start', function (req, res, next) {
    command();
    inter = setInterval(function () {
        command();
    }, 1000 * 60 * 34);
    botStatus = true;
    res.redirect('/log');
});
app.get('/status', function (req, res) {
    res.send('СТАТУС СТРАТЕГИИ: ' + (botStatus ? 'ЗАПУЩЕН' : 'ВЫКЛЮЧЕН'));
})
app.get('/stop', function (req, res, next) {
    clearInterval(inter);
    botStatus = false;
})
app.get('/log', function (req, res) {
    res.sendfile('debug.log');
});
app.listen(port, function() {
    fs.writeFile(__dirname + '/debug.log', '', function(){});
    console.log('Node app is running on port', port);
});

function twoFactorCodeCb(next) {
	next("028870");
}

function command() {

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
        trader.set({minPlayerSpeed : 80})
            .tradeCycle([
            trader.reList.bind(trader),
            trader.buyAndSellWithIncreasingCost.bind(trader, {type:'player', rare:'SP', minb: 5000, maxb: 7000, start:0, num:10 }, 9000, 300, 1.25, null, 8)
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