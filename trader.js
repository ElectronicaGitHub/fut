var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
var log_stdout = process.stdout;
var async = require('async');
var futapi = require("./futLib/index.js");
var _ = require('lodash');

console.log = function(d) {
	var array = Array.prototype.slice.call(arguments, 0);
	array.splice(0, 0, UTILS.getTime() + ' |');
	array.push('\n');
	log_file.write(util.format.apply(null, array));
	log_stdout.write(util.format.apply(null, array));
};

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
 * Единичный торговый цикл
 * @param  {array} methods Методы
 */
Trader.prototype.tradeCycle = function (methods) {
	var self = this;

	self.getCredits(function () {
		// self.keepAlive(function () {
			async.series(methods, function (err, k) {
				console.log('startTrading:: TRADING CYCLE COMPLETED');
			});
		// });
	});
	
}
/**
 * Фукнция последовательного повторения торговых методов
 * @param  {array } methods Методы 
 * @param  {number} time    Частота повторения
 */
Trader.prototype.startNonStopTrading = function (methods, time) {
	var self = this;
	self.tradeCycle(methods);
	this._tradingIntervalFunction = setInterval(function () {
		self.tradeCycle(methods);
	}, time);
	
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
Trader.prototype.buyAndSellWithIncreasingCost = function (findObject, maxCost, step, buyMinNoiseCoef, moneyLimit, itemsLimit, callback) {
	if (this.credits < findObject.maxb) {
		console.log('buyAndSellWithIncreasingCost::NOT ENOUGHT MONEY FOR START STRATEGY');
		return callback(null);
	}
	moneyLimit = moneyLimit || this.credits - 2000;
	itemsLimit = itemsLimit || 5;
	var self = this, stack = [];
	this.iterateParams = {
		costs : {}
	};
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
	this.options.lowerCostCountForSkip = 3;
	this.options.buyMinNoiseCoef = buyMinNoiseCoef;
	findObject.maxb = findObject.maxb - step;
	// вспомогательная функция для нормального пуша
	var exit = function (callback) { callback(null); }
	// главная функция которая разруливает что делать дальше на каждой итерации
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
					if (findObject.minb) {
						findObject.minb += step;
					}	
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
		callback(null);
	})
}




/**
 * Метод перебирающий единожды переданные в него методы
 * @param  {bool} notSingle    запускаем ли мы интервально пока не будет игроков загружено
 * @param  {array} functions    Методы
 * @param  {function} MAINCALLBACK Колбек
 */
Trader.prototype.each = function (notSingle, functions, MAINCALLBACK) {
	var args = functions, self = this;

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
				return MAINCALLBACK(err);
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
	var time = self.randomTime();
	
	setTimeout(function () {
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
	}, time);
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
			return console.log(response);
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
Trader.prototype.keepAlive = function (cb) {
	this.apiClient.keepAlive(cb);
}
Trader.prototype.buyMin = function (player, callback) {
	var self = this, time = this.randomTime();

	//проверка на повторного игрока
	if (self.iterateParams.costs[player.tradeId]) {
		self.iterateParams.costs[player.tradeId].was = true;
		console.log('buyMin::PLAYER WITH ID', player.tradeId, 'IS ALREADY BOUGHT');
		return callback(null);
	}
	// НАДО СДЕЛАТЬ ЧТОБЫ ПЕРЕД ПОКУПКОЙ ПРОВЕРЯТЬ ХВАТАЕТ ЛИ У НАС ДЕНЕГ НА ЭТУ ПОКУПКУ

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
				self.iterateParams.costs[player.tradeId] = {
					was : true
				};
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

				var minCostCount = filteredCosts.filter(function (cost) {
					return cost == buyPlayerFor;
				}).length;

				// если количество мелких цен меньше указанного то скипаем [1, 1, 1, 1, 2, 3, 4, 5];
				// много единиц -> скипаем
				if (minCostCount >= self.options.lowerCostCountForSkip) {
					console.log('buyMin::TOO MANY PLAYERS WITH SAME LOW PRICE');
					self.iterateParams.costs[player.tradeId] = {
						was : true
					};
					return callback(null);
				}

				// ищем средние цены по рынку из фильтрованного списка
				var buyNowPriceOnMarketAvg = futapi.calculateValidPrice(self.findAverage(filteredCosts));
				// если цены совпали то увеличиваем немного цену
				if (buyPlayerFor == buyNowPriceOnMarketAvg) {
					buyNowPriceOnMarketAvg = futapi.calculateNextHigherPrice(self.findAverage(filteredCosts));
				}
				var startingBidOnMarketAvg = futapi.calculateNextLowerPrice(buyNowPriceOnMarketAvg);

				// если в фильтранутом списке вдруг окажется лишь наша цена то мы выкупаем и
				// переставляем на значение нашего коэффициента и да будет кайф
				if (filteredCosts.length == 1) {
					buyNowPriceOnMarketAvg *= self.options.buyMinNoiseCoef;
					buyNowPriceOnMarketAvg = futapi.calculateNextHigherPrice(buyNowPriceOnMarketAvg);
				}

				// Указываем параметры для удобной работы потом с ними внутри следующих методов по
				// тому же плеер трейд id который был в списке, тк они меняются
				self.iterateParams.costs[player.tradeId] = { 
					bid : startingBidOnMarketAvg, 
					buyNow : buyNowPriceOnMarketAvg,
					tradeId : minMaxPlayersSorted[0].tradeId,
					id : minMaxPlayersSorted[0].itemData.id
				};

				console.log('buyMin::BUY FOR *', buyPlayerFor);
				console.log('buyMin::AVERAGE COST *', buyNowPriceOnMarketAvg);

				self.apiClient.placeBid(minMaxPlayersSorted[0].tradeId, buyPlayerFor, function (err, pl) {
					if (pl.success == false) {
						// ошибка при покупке
						console.log('buyMin::ERROR', pl);
						return cb(new Error('ERROR OCCURED WITH REASON', pl.reason));
					} else {
						// все нормально покупка прошла успешно
						self.currentStrategyData.spendMoney += buyPlayerFor;
						self.currentStrategyData.boughtItems++;

						console.log('buyMin::PLAYER', player.tradeId, 'WITH RATING *', player.itemData.rating, '* BOUGHT FOR', buyPlayerFor);
						return cb(null);
					}
				});

			}, time);
		}
	], function (err, ok) {
		if (err) return callback(err);
		callback(null);
	});

	return this;
}
Trader.prototype.toTradepile = function (player, callback) {
	// Проверка на количество повторений действий
	if (this.toTradePileTries > 2) {
		this.toTradePileTries = 0;
		this.iterateParams.costs[player.tradeId] = this.iterateParams.costs[player.tradeId] || {};
		this.iterateParams.costs[player.tradeId].was = true;
		console.log('toTradepile::EXIT AFTER SOME TIMES');
		return callback(null);
	} else {
		this.toTradePileTries = this.toTradePileTries || 0;
	}

	var self = this, time = this.randomTime();
	var id = player.itemData.id;
	if (this.iterateParams.costs[player.tradeId]) {
		//проверка на повторного игрока
		if (self.iterateParams.costs[player.tradeId].was) {
			console.log('buyMin::PLAYER ALREADY BOUGHT');
			return callback(null);
		}
		id = this.iterateParams.costs[player.tradeId].id;
	}
	console.log('toTradepile::player', player.itemData.id);

	setTimeout(function () {
		self.apiClient.sendToTradepile(id, function (err, ok) {
			if (ok.itemData[0].success == false) {
				console.log('toTradepile::answer', ok);
				if (self.toTradePileTries <= 2) {
					console.log('toTradepile::ONE MORE TRY', self.toTradePileTries);
					self.toTradePileTries++;
					return self.toTradepile(player, callback);
				} else {
					return callback(new Error('MULTITIME TRADEPILE ANSWER ERROR'));
				}
			} else {
				console.log('toTradepile::PLAYER', player.tradeId, 'WITH RATING', player.itemData.rating, 'SEND TO TRADEPILE');	
				return callback(null);
			}
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
		//проверка на повторного игрока
		if (self.iterateParams.costs[player.tradeId].was) {
			console.log('buyMin::PLAYER ALREADY BOUGHT');
			return callback(null);
		}

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
				console.log('sell::', ok);
				if (ok.idStr) {
					console.log('sell::PLAYER', player.tradeId, 'WITH RATING', player.itemData.rating, 'SEND TO TRANSFER, BID', costs.bid, ', BUY NOW', costs.buyNow);
					callback(null);
				} else {
					console.log('sell::ERROR OCCURED');
					callback(new Error('sell::SOME ERROR OCCURED'));
				}
		});
	}, time);
	return this;
}
Trader.prototype.reList = function (callback) {
	this.apiClient.relist(function (err, ok) {
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
Trader.prototype.getCredits = function (cb) {
	var self = this;
	this.apiClient.getCredits(function (err, result) {
		console.log('CREDITS::', result.credits);
		self.credits = result.credits;
		cb();
	});
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
//
var UTILS = {
	getTime : function () {
		return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
	}
}




