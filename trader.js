// EXAMPLES

// var trader = new Trader();
// trader
//         .set({ bidPricePlus : 100, buyNowPricePlus : 1500 })
//         .search({ type : 'player', micr : 150})
//         .each(trader.buy, trader.toTradepile, trader.sell);

var async = require('async');
var futapi = require("fut-api");
var _ = require('lodash');

function Trader(apiClient) {
	this.playersList = null;
	this.options = {
		bidIncr : null,
		buyNowIncr : null,
		buyMinPercent : null
	};
	this.apiClient = apiClient;
	this.timeoutTime = { max : 7000, min : 4000 };
	this.freePacks = 0;
	this.currentStrategyData = null;
	this._intervalFunction = null; // meta for each function
	this.iterateParams = {
		costs : {
			// tradeId : { bid : null, buyNow : null }
		}
	};
}
Trader.prototype.randomTime = function () {
    return Math.random() * (this.timeoutTime.max - this.timeoutTime.min) + this.timeoutTime.min;
}
/**
 * Стратегия последовательного поиска начиная с меньшей цены
 * через step доходя до максимальной цены с условием выхода по достижении
 * максимальной суммы траты либо покупки максимального количества вещей
 * @param  {object} findObject объект поиска в search
 * @param  {number} minCost    меньшая цена
 * @param  {number} maxCost    максимальная цена
 * @param  {number} step       шаг цены
 * @param  {number} moneyLimit максимальная разрешимая для траты в стратегии сумма
 * @param  {number} itemsLimit максимальное количество вещей купленных в стратегии
 */
Trader.prototype.buyAndSellWithIncreasingCost = function (findObject, maxCost, step, buyMinNoiseCoef, moneyLimit, itemsLimit) {
	moneyLimit = moneyLimit || 5000;
	itemsLimit = itemsLimit || 5;
	var self = this, stack = [];
	this.currentStrategyData = {
		spendMoney : 0,
		boughtItems : 0,
		continueStatus : function () {
			var res = !(findObject.maxb > maxCost || 
				self.currentStrategyData.spendMoney > moneyLimit || 
				self.currentStrategyData.boughtItems > itemsLimit);
			if (!res) {
				console.log('strategy::STRATEGY ENDED WITH CONDITIONS');
			}
			return res;
		}
	};
	this.options.buyMinNoiseCoef = buyMinNoiseCoef;
	findObject.maxb = findObject.maxb - step;
	// вспомогательная функция для нормального пуша
	var exit = function (callback) { callback(null); }

	var handler = function () {
		return function (callback) {
			console.log('handler::NEW CYCLE');
			setTimeout(function () {
				if (self.currentStrategyData.continueStatus()) {
					stack.splice(stack.length - 1, 0, 
						self.search.bind(self, findObject), 
						self.each.bind(self, false, [self.buyMin, self.toTradepile, self.sell]), 
						handler(callback)
					);
					findObject.maxb += step;	
				}
				callback(null);
			}, 1000);
		}
	}

	stack = [handler(), exit];

	async.waterfall(stack, function (err, finish) {
		if (err) {
			console.log('buyAndSellWithIncreasingCost::STRATEGY FINISHED WITH CONDITION');
			return;
		}
		console.log('buyAndSellWithIncreasingCost::STRATEGY ENDED');
	})
	// this.search(findObject).each(this.buyMin, this.toTradepile, this.sell);

	// стартуем наш цикл с минимальной стоимости 
	// Если никого не нашли то повышаем ставку + step
	// Если дошли до moneyLimit || itemsLimit то останавливаемся
}





Trader.prototype.each = function (notSingle, functions, MAINCALLBACK) {
	var args = functions, self = this;
	// console.log('each::', self.playersList && self.playersList.length);

	var fn = function () {
		if (!self.playersList) {
			console.log('each::NO PLAYERS FIND YET');
			return;
		}
		clearInterval(self._intervalFunction);

		async.eachSeries(self.playersList, function (player, callback) {

			async.eachSeries(args, function (fn, callback) {
				fn.call(self, player, callback);
			}, function (err, ok) {
				if (err) return callback(err);
				callback(null);
				console.log('------------------');
			});
			
		}, function (err, ok) {
			if (err) {
				console.log('error::STRATEGY ENDED WITH CONDITIONS', err);
				return callback(err);
			} 
			console.log('EACH COMPLETED');
			if (MAINCALLBACK && typeof MAINCALLBACK == 'function') {
				MAINCALLBACK(null);
			}
		});
	}

	if (notSingle) {
		this._intervalFunction = setInterval(fn, 400);
	} else {
		if (!self.playersList.length) {
			return MAINCALLBACK(null);
		}
		fn();
	}

}
Trader.prototype.set = function (options) {
	this.options = options;
	return this;
}
Trader.prototype.search = function (object, callback) {
	console.log('search::', object);
	var self = this;
	this.playersList = null;
	this.apiClient.search(object, function (error, response) {
		if (!response.auctionInfo) {
			return console.log(response);
		}
		self.playersList = response.auctionInfo;
		var b = response.auctionInfo.map(function (el) {
			return { id: el.itemData.id, rare : el.itemData.rareflag, rating: el.itemData.rating, buyNowPrice : el.buyNowPrice }
		});
		console.log(b);
		console.log('search::completed, found :', response.auctionInfo.length, 'elements');

		if (callback && typeof callback == 'function') {
			callback(null);
		}
	});
	return this;
}
Trader.prototype.bid = function (player, callback) {
	console.log('bid', player);
	// TODO
	callback(null);
	return this;
}
Trader.prototype.buy = function (player, callback) {
	var self = this, time = self.randomTime();

	console.log('buy', player.tradeId);
	setTimeout(function () {
		self.apiClient.placeBid(player.tradeId, player.buyNowPrice, function (err, pl) {
			if (err) throw err;
			console.log('buy::PLAYER', player.tradeId, 'WITH RATING', player.itemData.rating, 'BOUGHT WITH ', player.buyNowPrice);
			time = self.randomTime();
			callback(null);
		});
	}, time);
	return this;
}
Trader.prototype.openPack = function () {
	console.log('openPack start');
	var self = this, isFree = false, time = self.randomTime(), quickSellArray = [];

	if (self.freePacks > 0) {
		freePacks--;
		isFree = true;
	}

	self.apiClient.openPack(100, isFree, function (err, response) {
		if (!response.itemList) {
			console.log(response);
			return
		}
		console.log('openPack::PACK OPENED AND HAS', response.itemList.length, 'ITEMS');

		async.eachSeries(response.itemList, function (item, callback) {
			time = self.randomTime();
			setTimeout(function () {
				if (item.itemType == 'contract' || item.itemType == 'training' || item.itemType == 'health') {
					self.apiClient.sendToTradepile(item.id, function (err, ok) {
						// console.log('openPack::TO TRADEPILE', ok);
						self.apiClient.listItem(item.id, 150, 200, 3600, function (err, ok) {
							console.log('openPack::', ok);
							console.log('openPack::ITEM HAS BEEN SOLD, TYPE', item.itemType);
							callback(null);
						});
					});
				} else if (item.itemType == 'misc' && item.cardsubtypeid == 233) {
				// } else if (item.itemType == 'misc') {
					console.log('openPack::PACK FOUND');
					self.apiClient.useMiscItem(item.id, function (err, ok) {
						self.freePacks++;
						console.log('openPack::PACK ADDED');
						console.log(ok);
						callback(null);
					});
				} else if (item.itemType == 'misc' && item.cardsubtypeid != 233) {
					self.apiClient.useMiscItem(item.id, function (err, ok) {
						console.log('openPack::MONEY USED');
						console.log(ok);
						callback(null);
					});
				} else if (item.itemType == 'player' && item.rareflag > 1) {
					console.log('openPack::RARE PLAYER FOUND');
					callback(null);
				} else {
					quickSellArray.push(item.id);
					console.log('openPack::ITEM ADDED TO QUICKSELL LIST, TYPE', item.itemType);
					callback(null);
				}
			}, time);
		}, function (err, ok) {
			self.apiClient.quickSellMany(quickSellArray, function (err, ok) {
				console.log(ok);
				console.log('openPack::ITEMS HAS QUICKSELLED');
			});
		})
		
	});
}
Trader.prototype.keepAlive = function () {
	this.apiClient.keepAlive();
}
Trader.prototype.buyMin = function (player, callback) {
	var self = this, time = this.randomTime();

	async.waterfall([
		function (cb) {
			time = self.randomTime();
			setTimeout(function () {
				self.apiClient.search({
					type: "player", 
					maskedDefId: player.itemData.assetId, 
					rare: player.itemData.rareflag,
					start: 0, 
					num: 50
				}, function (error, response) {
					if (!response.auctionInfo) {
						console.log('buyMin::ERROR, RESPONSE', response);
						cb(null, []);
					} else {
						cb(null, response.auctionInfo);
					}
				});
			}, time);
		},
		function (players, cb) {
			if (!players.length) {
				return cb(null);
			}
			console.log('buyMin::PLAYERS FOUND BY ID', player.itemData.assetId, 'NUMBER', players.length);
			time = self.randomTime();
			setTimeout(function () {
				// сортируем по порядку
				var minMaxPlayersSorted = self.minMaxSortWith(players, false, ['buyNowPrice', 'tradeId', 'startingBid']);
				var buyPlayerFor = minMaxPlayersSorted[0].buyNowPrice;
				// фильтруем цены которые не больше минимальной ставки * коэффициент
				var filteredCosts = minMaxPlayersSorted.map(function (el) {
					return el.buyNowPrice;
				}).filter(function (cost) {
					return cost < buyPlayerFor * self.options.buyMinNoiseCoef;
				});
				console.log('buyMin::prices for current', filteredCosts);
				// ищем средние цены по рынку из фильтрованного списка
				var buyNowPriceOnMarketAvg = futapi.calculateValidPrice(self.findAverage(filteredCosts));
				startingBidOnMarketAvg = futapi.calculateNextLowerPrice(buyNowPriceOnMarketAvg);

				self.iterateParams.costs[player.tradeId] = { 
					bid : startingBidOnMarketAvg, 
					buyNow : buyNowPriceOnMarketAvg,
					tradeId : minMaxPlayersSorted[0].tradeId,
					id : minMaxPlayersSorted[0].itemData.id
				};
				// если в фильтранутом списке вдруг окажется лишь наша цена то мы выкупаем и
				// переставляем на значение нашего коэффициента и да будет кайф
				if (filteredCosts.length == 1) {
					buyPlayerFor *= self.options.buyMinNoiseCoef;
				}

				console.log('buyMin::averages', self.iterateParams.costs[player.tradeId]);
				console.log('buyMin::buyPlayerFor', buyPlayerFor);

				self.apiClient.placeBid(minMaxPlayersSorted[0].tradeId, minMaxPlayersSorted[0].buyNowPrice, function (err, pl) {
					if (err) throw err;
					console.log('buyMin::', pl);
					console.log('buyMin::PLAYER', player.tradeId, 'WITH RATING', player.itemData.rating, 'BOUGHT FOR', minMaxPlayersSorted[0].buyNowPrice);
					self.currentStrategyData.spendMoney += buyPlayerFor;
					self.currentStrategyData.boughtItems++;

					cb(null);
				});

			}, time);
		}
	], function (err, ok) {	
		callback(null);
	});

	return this;
}
Trader.prototype.toTradepile = function (player, callback) {
	var self = this, time = this.randomTime();
	var id = player.itemData.id;
	if (this.iterateParams.costs[player.tradeId]) {
		id = this.iterateParams.costs[player.tradeId].id;
	}
	console.log('toTradepile::player', player.itemData.id);

	setTimeout(function () {
		self.apiClient.sendToTradepile(id, function (err, ok) {
			if (err) throw err;
			console.log('toTradepile::answer', ok);
			console.log('toTradepile::PLAYER', player.tradeId, 'WITH RATING', player.itemData.rating, 'SEND TO TRADEPILE');	
			callback(null);
		});
	}, time);
	return this;
}
Trader.prototype.sell = function (player, callback) {
	var self = this;
	var id = player.itemData.id;
	var time = this.randomTime(),
	costs = {
		bid : player.startingBid + this.options.bidIncr,
		buyNow : player.buyNowPrice + this.options.buyNowIncr
	}
	if (this.iterateParams.costs[player.tradeId]) {
		id = this.iterateParams.costs[player.tradeId].id;
		costs = {
			bid : this.iterateParams.costs[player.tradeId].bid,
			buyNow : this.iterateParams.costs[player.tradeId].buyNow
		}
		delete this.iterateParams.costs[player.tradeId];
	}

	setTimeout(function () {
		self.apiClient.listItem(id, 
			costs.bid,
			costs.buyNow,
			3600, function (err, ok) {
				if (err) throw err;
				console.log('sell::', ok);
				console.log('sell::PLAYER', player.tradeId, 'WITH RATING', player.itemData.rating, 'SEND TO TRANSFER, BID', costs.bid, ', BUY NOW', costs.buyNow);
				callback(null);
		});
	}, time);
	return this;
}
Trader.prototype.reList = function () {
	apiClient.relist(function (err, ok) {
		console.log('reList::ALL RELISTED', ok);
		callback(null);
	});
}
Trader.prototype.findAverage = function (array, keyName) {
	if (keyName) {
		array = array.map(function (el) {
			return el[keyName];
		}).filter(function (el) {
			return el != 10000;
		});
	}
	var average = array.reduce(function (a, b, c) { return a + b }) / array.length;
	// console.log('average by', keyName, 'is', average);
	return average;
}

Trader.prototype.minMaxSortWith = function (array, isMap, keyNames) {
	var values;
	if (isMap) {
		values = array.map(function (el) {
			var _el = {};
			for (var i in keyNames) {
				_el[keyNames[i]] = el[keyNames[i]];
			}
			return _el;
		}).sort(function (a,b) {
			return +a[keyNames[0]] - +b[keyNames[0]];
		});
	} else {
		values = array.sort(function (a,b) {
			return +a[keyNames[0]] - +b[keyNames[0]];
		});
	}

	return values;
}
module.exports = Trader;

// TODO
// Спарсить и сделать базу игроков с futhead.com
// Сделать вочер который по времени будет чтото запускат
// Сделать ручку для открытия паков и потом ичом его проглядывать


//quick sells https://utas.s3.fut.ea.com/ut/game/fifa16/item?itemIds=105366432847%2C105366558571
//quick sell  https://utas.s3.fut.ea.com/ut/game/fifa16/item/105359618508




