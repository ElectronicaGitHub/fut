var options = {
	saveCookie : true,
	saveCookiePath : './cookie/mycookie',
	loadCookieFromSavePath : './cookie/mycookie'
}
var futapi = require("fut-api");
var apiClient = new futapi(options);
var async = require('async');
var trader = new (require('./trader.js'))(apiClient);

function twoFactorCodeCb(next) {
	next("028870");
}

// apiClient.login("antonovphilipdev@gmail.com","F16FifaFut", "tatiana", "xone",


apiClient.login("molo4nik11@gmail.com","Clorew321SSaa", "kopitin", "xone",
    twoFactorCodeCb,
    function (error,response) {
    if (error) {
    	console.log(error);
        return console.log("Unable to login.");
    }
    console.log("logged in.");

    // Возможные ключи
    // leag : 13 // Barclays
    // micr min bid
    // macr max bid
    // // // // // //
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

    var a = trader
        .set({ bidIncr : 150, buyNowIncr : 150, buyMinPercent : 90 })
        // .buyAndSellWithIncreasingCost({type:'player', rare:'SP', maxb:3000, start:0, num:20}, 4500, 200, 1.2, 1000, 1); 
        .buyAndSellWithIncreasingCost({type:'player', lev:'bronze', maxb:200, start:0, num:20}, 500, 50, 1.2, 1000, 1); 

        // .search({type: "player", maskedDefId : 8494, start: 0, num : 1 })
        // .search({type: "player", lev: "silver", pos: "LB", micr : 150, maxb : 300, start: 0, num : 1 })
        // .search({type: "player", lev: 'bronze', rare : '3', start: 0, num : 10 })
        // .each(true, [trader.buyMin, trader.toTradepile, trader.sell]);
        // .each(true, [trader.buy, trader.toTradepile, trader.sell]);
        // .openPack();
});


// var a = trader




