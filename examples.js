var options = {
	saveCookie : true,
	saveCookiePath : './cookie/mycookie',
	loadCookieFromSavePath : './cookie/mycookie'
}
var futapi = require("fut-api");
var apiClient = new futapi(options);
var async = require('async');
var trader = new Trader();

function twoFactorCodeCb(next) {
	next("028870");
}

apiClient.login("molo4nik11@gmail.com","Clorew321SSaa", "kopitin", "xone",
// apiClient.login("antonovphilipdev@gmail.com","F16FifaFut", "tatiana", "xone",
    twoFactorCodeCb,
    function (error,response) {
    if (error) {
    	console.log(error);
        return console.log("Unable to login.");
    }
    console.log("logged in.");

    async.series([
    	// function (callback) {
		   //  apiClient.getCredits(function (err, ok) {
		   //  	console.log('getCredits', err, ok);
		   //  	callback(null);
		   //  });
    	// },


    	// РУЧКА ДЛЯ АНАССИГНЕД ПОСЛЕ ПОКУПКИ
    	// ЭТА ХУЙНЯ ПОМЕЩАЕТ В ТРЕЙДПАЙП
    	// И ОТТУДА ПРОДАЕМ
    	// function (callback) {
    	// 	apiClient.getUnassigned(function (err, ok) {
    	// 		console.log('getUnassigned', err, ok);
    	// 		for ( i in ok.itemData) {
    	// 			var player = ok.itemData[i];
    	// 			console.log('test', player.id, player.lastSalePrice, player.lastSalePrice + 150, 3600);
		   //  		apiClient.sendToTradepile(player.id, function (err, ok) {
		   //  			console.log('sendToTradepile', err, ok);
		   //  			// ПОСЛЕ ЭТОГО ПОПАДАЕМ В ТРЕЙДПАЙЛ В AVAILABLE ITEMS
		   //  		});
    	// 		}
	    // 		callback(null);
    	// 	})
    	// },

   //  	function (callback) {
			// apiClient.search({type: "player", lev: "gold", start: 0, num : 30 }, function (error, response) {
			// 	for (var i in response.auctionInfo) {
			// 		console.log(response.auctionInfo[i].itemData.rating);
			// 	}
			// })
   //  	},



    	// ПОИСК МИНИМАЛЬНОЙ ЦЕНЫ И ПОКУПКА
    	// ПОИСК МИНИМАЛЬНОЙ ЦЕНЫ И ПОКУПКА
    	// ПОИСК МИНИМАЛЬНОЙ ЦЕНЫ И ПОКУПКА
    	// ПОИСК МИНИМАЛЬНОЙ ЦЕНЫ И ПОКУПКА
    	// ПОИСК МИНИМАЛЬНОЙ ЦЕНЫ И ПОКУПКА
    	// ПОИСК МИНИМАЛЬНОЙ ЦЕНЫ И ПОКУПКА
    	// ПОИСК МИНИМАЛЬНОЙ ЦЕНЫ И ПОКУПКА

	 // 	function (callback) {
		// 	// apiClient.search({type: "player", lev: "gold", maskedDefId: 31432, pos: "CB" }, function (error, response) {
		// 	apiClient.search({
		// 		type: "player",
		// 		leag: 13,
		// 		start : 0,
		// 		num : 15,
		// 		micr : 150,
		// 		maxb : 450,
		// 		zone :  'defense'
		// 	}, function (error, response) {
		// 		console.log('FOUND :',  response.auctionInfo.length);

		// 		// ЕСЛИ ИЩЕМ ПО ИГРОКУ ТО МОЖНО СОРТИРНУТЬ ПО МИНИМАЛЬНОЙ ЦЕНЕ И ПРОДАТЬ
		// 		// ЕСЛИ РАНДОМ ТО ПОКУПАЕМ БЛИЖАЙШИХ В НОРМ ЛИГЕ ГДЕ БОЛЬШОЙ ТРАФФИК

		// 		async.eachSeries(response.auctionInfo, function (item, callback) {
		// 			setTimeout(function () {
		// 				// КУПИТЬ ИЛИ СДЕЛАТЬ СТАВКУ
		// 				apiClient.placeBid(item.tradeId, item.buyNowPrice, function (err, pl) {
		// 					// console.log('PLAYER BOUGHT FROM AUCTION , ID: ', pl.auctionInfo[0].itemData);
		// 					console.log('PLAYER BOUGHT FROM AUCTION');
		// 					// callback(null);

		// 					// ПРОДАТЬ СРАЗУ
		// 					setTimeout(function () {

		// 						console.log(item.itemData.id, item.startingBid + 100, item.buyNowPrice + 100);

		// 	  					apiClient.sendToTradepile(item.itemData.id, function (err, ok) {

		// 							apiClient.listItem(item.itemData.id, item.startingBid + 100, item.buyNowPrice + 100, 3600, function (err, ok) {

		// 		    					if (err) callback(err);
		// 		    					else {
		// 			    					console.log('PLAYER LISTED TO AUCTION');
		// 			    					callback(null);
		// 		    					}
		// 		    				});	
		// 	  					});
		// 					}, 500);
		// 				});
		// 			}, 1000);
		// 		},
		// 		function (err, final) {
		// 			callback(null);
		// 		});
		// 	});
		// },




		// ПРОДАТЬ ИЗ АНАСИГНЕДА
		// function (callback) {
  //   		apiClient.getUnassigned(function (err, ok) {
  //   			console.log('getUnassigned', ok.itemData.length);
  //   			async.eachSeries(ok.itemData, function (player, callback) {
  //   				// if (!player.itemData) return callback(null);
  //   				console.log('test', player.id, player.lastSalePrice, player.lastSalePrice + 150, 3600);
  //   				setTimeout(function () {
  //   					apiClient.sendToTradepile(player.id, function (err, ok) {
  //   						console.log(err, ok);
		// 					apiClient.listItem(player.id, player.lastSalePrice, player.lastSalePrice + 150, 3600, function (err, ok) {
		//     					if (err) callback(err);
		//     					else {
		// 	    					console.log('PLAYER LISTED TO AUCTION');
		// 	    					callback(null);
		//     					}
		//     				});	
  //   					})
		// 			}, 1000);
  //   			}, function (err, ok) {
  //   				callback(null);
  //   			});
  //   		})
  //   	},




    	// В ТРЕЙДЛИСТЕ ЗАНОВО ПРОДАТЬ
    	function (callback) {
    		apiClient.getTradepile(function (err, ok) {

    			apiClient.removeSold(function (err, ok) {
    				console.log('removeSold', ok);
    			});

    			// console.log('getTradepile', err, ok);
    			var available = ok.auctionInfo.filter(function (el) {
    				return el.tradeState != 'active';
    			});

    			console.log('available', available.length);
    			async.eachSeries(available, function (player, callback) {
    				setTimeout(function () {

	    				var data = player.itemData;
	    				var buyNowPrice = player.buyNowPrice
	    				var lastSalePrice = player.itemData.lastSalePrice;
	    				var price = lastSalePrice || buyNowPrice;
	    				console.log(player.itemData.id, price, price + 100, 3600);


    					apiClient.listItem(player.itemData.id, player.startingBid, player.buyNowPrice, 3600, function (err, ok) {
	    					if (err) callback(err);
	    					else {
		    					console.log('PLAYER LISTED', err, ok);
		    					callback(null);
	    					}
	    				});	
	    				
	    				// leag : 13 // Barclays
	    				// micr min bid
	    				// macr max bid
	    				// // // // // //
	    				// minb max buy now
	    				// maxb max buy now
	    				// zone defense midfield attacker
	    				// pos для точной позиции
    					// apiClient.search({type: "player", maskedDefId: data.assetId, start : 0, num : 30}, function (error, response) {
    					// 	console.log('FOUND ON MARKET NUMBER', response.auctionInfo.length);
    					// 	var buyNowPriceOnMarket = trader.findMin(response.auctionInfo, 'buyNowPrice');
    					// 	var startingBidOnMarket = trader.findMin(response.auctionInfo, 'startingBid');

    					// 	console.log(player.itemData.id, startingBidOnMarket, buyNowPriceOnMarket);

		    			// 	apiClient.listItem(player.itemData.id, startingBidOnMarket, buyNowPriceOnMarket, 3600, function (err, ok) {
		    			// 		if (err) callback(err);
		    			// 		else {
			    		// 			console.log('PLAYER LISTED', err, ok);
			    		// 			callback(null);
		    			// 		}
		    			// 	});	
    					// });
    					
    				}, 1000);
    			}, function (err, success) {
    				if (err) console.log(err);
    				console.log(success);
    				callback(null);
    			});
    		});
    	},







    	// обновить лист продаж
    	// function (callback) {
    	// 	apiClient.relist(function (err, ok) {
    	// 		console.log(err, ok);
    	// 		callback(null);
    	// 	});
    	// },






    	// function (callback) {
    	// 	apiClient.getWatchlist(function (err, ok) {
    	// 		console.log('getWatchlist', err, ok);
    	// 		for ( i in ok.auctionInfo) {
    	// 			var player = ok.auctionInfo[i];
    	// 			console.log(ok.auctionInfo[i].itemData);
    	// 			console.log('test', player.itemData.id, player.startingBid, player.buyNowPrice, 3600);
    	// 			// apiClient.listItem(player.itemData.id, player.startingBid, player.buyNowPrice, 3600, function (err, ok) {
    	// 			// 	console.log('players listed to sell', err, ok);
    	// 			// });
		   //  		apiClient.sendToTradepile(player.itemData.id, function (err, ok) {
		   //  			console.log('sendToTradepile', err, ok);
		   //  			// ПОСЛЕ ЭТОГО ПОПАДАЕМ В ТРЕЙДПАЙЛ В AVAILABLE ITEMS
		   //  		});
    	// 		}
	    // 		callback(null);
    	// 	})
    	// },


    	// ТОРГИ

    	// НАШЕ
		// bidState : "highest"
		// ПЕРЕБИЛИ
		// bidState : "outbid"
		// currentBid : то значение которое переставили


   
    ], function (err, finish) {
    	if (err) console.log(err);
    	console.log('============');
    	console.log('= FINISHED =');
    	console.log('============');
    })

});

function Trader() {
	this.playersList = [];
	this.currentPlayer = [];
}
Trader.prototype.search = function (object) {
	console.log('search', this);
	console.log('find by object', object);
	console.log('get data with apiClient.search');
	this.playersList = [{id : 1}, {id : 2,}, {id : 3}];
	this.currentPlayer = this.playersList[0];
	return this;
}
Trader.prototype.each = function () {
	for (var i in arguments) {
		arguments[i]();
	}
}
Trader.prototype.toTradepile = function () {
	console.log('toTradepile', this);
	return this;	
}
Trader.prototype.sell = function (object, bidPricePlus, buyNowPricePlus) {
	console.log('sellEach', this);
}

Trader.prototype.findMin = function (array, keyName) {
	var value = array.map(function (el) {
		return el[keyName];
	})
	.sort(function (a,b) {
		return +a - +b;
	});

	return value[0];
}

// сделать пайп
// передаем названия функций
// например


// trader.search({}).each(trader.buy, trader.toTradepile, trader.sell.bind(trader, null, bidPricePlus, buyNowPrice));
// toTradepile().sellEach(bidPricePlus, buyNowPricePlus)

















