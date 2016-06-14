// Если ситуация [6500, 8000] то покупаем и делаем [9000 - 3 позиции ниже, 9000]
// 
// либо Сделать отдельную функцию которая делаем each на переданных игроках 
// и вызывать ее после стратегии если игроки имеются

// Работают страта обычная, те играоки которые удовлетворяют нашим
// условиям (быстро проданы или дорого проданы) в базе вносятся в список игроков по которым будет ебашить
// другая страта, тип страты с которой игрок вообще был куплен сохранять у него в модели


var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
var log_stdout = process.stdout;
var async = require('async');
var futapi = require("./futLib/index.js");
var _ = require('lodash');
var Player = require('./models/player.js');
var MoneySnapshot = require('./models/MoneySnapshot.js');
var moment = require('moment');

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
		bidIncr : 150,
		buyNowIncr : 150,
		buyMinPercent : 90,
		minPlayerSpeed : 75,
		minPlayerDribling : 75,
		lowerCostCountForSkip : 3,
		buyAndSellDiffNotToSkip : 200 // разница цены чтоб купить а не скипнуть
	};
	this.playersForInstantBuy = [];
	this.playersInTradeList = 0;
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
		self.keepAlive(function () {
			async.series(methods, function (err, k) {
				console.log('startTrading:: TRADING CYCLE COMPLETED');
			});
		});
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
// buyAndSellSelectedPlayers({}, {}, 25, 1.25, 30, 10)
/**
 * Стратегия поиска игроков из переданного списка с покупкой минимального
 * и дальнейшей его продажей учитывая параметры
 * @param  {object}   findObject            объект поиска
 * @param  {array }   playersArray          список переданных игроков 
 * @param  {number}   maxPlayersInListToBuy количество игроков в списке для совершения покупки, при увеличении -> скипаем
 * @param  {number}   buyMinNoiseCoef       коэффициент умножение на который даст нам список подходящих цен
 * @param  {number}   maxBuyPrice           максимальная стоимость покупки
 * @param  {number}   itemsLimit            максимальное количество айтемов для покупки в рамках одного прогона
 */
Trader.prototype.buyAndSellSelectedPlayers = function (findObject, playersArray, maxPlayersInListToBuy, buyMinNoiseCoef, maxBuyPrice, itemsLimit, callback) {
	if (this.credits < findObject.maxb) {
		console.log('buyAndSellSelectedPlayers::NOT ENOUGHT MONEY FOR START STRATEGY');
		return callback(null);
	}
	moneyLimit = this.credits;
	itemsLimit = itemsLimit || 10;
	var self = this, stack = [];
	this.iterateParams = {
		costs : {}
	};
	this.playersForInstantBuy = [];
	this.currentStrategyData = {
		type : 'players',
		spendMoney : 0,
		boughtItems : 0,
		maxBuyPrice : maxBuyPrice,
		buyMinNoiseCoef : buyMinNoiseCoef,
		maxPlayersInListToBuy : maxPlayersInListToBuy,
		getBuyMinObject : function (player) {
			return _.extend({
				type: "player", 
				maskedDefId: player.itemData.assetId,
				start: 0, 
				num: 50,
			}, findObject);
		},
		buyMinMakePrice : function (players, _this, player) {
			var self = _this, buyPlayerFor, buyId, cardId, preferredRating, filteredCosts, filteredPlayers, minCostCount, ratings = {};

			// наполняем мапу
			for (var i in players) {
				var player = players[i];
				ratings[player.itemData.rating] = ratings[player.itemData.rating] || [];
				ratings[player.itemData.rating].push(player);
			}
			// ищем минимумы
			for (var i in ratings) {
				ratings[i] = self.minMaxSortWith(ratings[i], false, ['buyNowPrice', 'tradeId', 'startingBid']);
				var minCost = ratings[i][0].buyNowPrice;
				
				if (minCost <= self.currentStrategyData.maxBuyPrice && minCost <= self.credits) {
					buyPlayerFor = minCost;
					preferredRating = i;
				}
			}

			if (!preferredRating) {
				console.log('buyMin::PRICE IS TOO BIG FOR BUYING, LIMIT', self.currentStrategyData.maxBuyPrice);
				self.iterateParams.costs[player.tradeId] = { was : true };
				return { skip : true };
			}
			if (buyPlayerFor > self.currentStrategyData.maxBuyPrice) {
				console.log('buyMin::PRICE IS TOO BIG FOR BUYING, LIMIT', self.currentStrategyData.maxBuyPrice);
				self.iterateParams.costs[player.tradeId] = { was : true };
				return { skip : true };
			}

			filteredCosts = ratings[preferredRating].map(function (el) { return el.buyNowPrice; })
			.filter(function (cost) { return cost < buyPlayerFor * self.currentStrategyData.buyMinNoiseCoef; });

			filteredPlayers = ratings[preferredRating]
			.filter(function (player) { return player.buyNowPrice < buyPlayerFor * self.currentStrategyData.buyMinNoiseCoef; });

			minCostCount = filteredCosts.filter(function (cost) { return cost == buyPlayerFor; }).length;

			buyId = ratings[preferredRating][0].tradeId;
			cardId = ratings[preferredRating][0].itemData.id;

			return {
				buyPlayerFor : buyPlayerFor,
				filteredCosts : filteredCosts,
				filteredPlayers : filteredPlayers,
				buyId : buyId,
				cardId : cardId,
				minCostCount : minCostCount
			}
		},
		continueStatus : function () {
			console.log('CONDITIONS CHECK CREDITS', self.credits, '|| findObject.maxb (', findObject.maxb, '/', maxCost, ')');
			console.log('money (', self.currentStrategyData.spendMoney, '/', moneyLimit, '), items (', self.currentStrategyData.boughtItems, '/', itemsLimit, ')');
			console.log('===============');
			var res = !(findObject.maxb > maxCost || 
				self.currentStrategyData.spendMoney > moneyLimit || 
				self.currentStrategyData.boughtItems > itemsLimit || 
				findObject.maxb > self.credits);
			if (!res) {
				console.log('strategy::STRATEGY ENDED WITH CONDITIONS');
			}
			return res;
		}
	};
	// this.options.buyMinNoiseCoef = buyMinNoiseCoef;
	// // добавляем tradeId тк в дальнейшем нам это понадобится
	playersArray =  playersArray.map(function (player) {
		player.tradeId = player.tradeId || UTILS.makeId();
		return player;
	});

	self.playersList = playersArray;
	// вспомогательная функция для нормального пуша
	var exit = function (callback) { callback(null); }

	stack = [
		self.each.bind(self, false, [self.buyMin, self.toTradepile, self.sell]), 
		exit
	];

	async.waterfall(stack, function (err, finish) {
		if (err) {
			console.log('buyAndSellSelectedPlayers::STRATEGY FINISHED WITH CONDITION');
			return callback(err);
		}
		console.log('buyAndSellSelectedPlayers::STRATEGY ENDED');
		callback(null);
	})
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
Trader.prototype.buyAndSellWithIncreasingCost = function (findObject, maxCost, step, maxPlayersInListToBuy, buyMinNoiseCoef, moneyLimit, itemsLimit, callback) {
	if (this.credits < findObject.maxb) {
		console.log('buyAndSellWithIncreasingCost::NOT ENOUGHT MONEY FOR START STRATEGY');
		return callback(null);
	}
	moneyLimit = moneyLimit || this.credits;
	itemsLimit = itemsLimit || 5;
	var self = this, stack = [];
	this.iterateParams = {
		costs : {}
	};
	this.playersForInstantBuy = [];
	this.currentStrategyData = {
		type : 'default',
		spendMoney : 0,
		boughtItems : 0,
		buyMinNoiseCoef : buyMinNoiseCoef,
		maxPlayersInListToBuy : maxPlayersInListToBuy,
		getBuyMinObject : function (player) {
			return {
				type: "player", 
				maskedDefId: player.itemData.assetId, 
				rare: player.itemData.rareflag,
				start: 0, 
				num: 50
			}
		},
		buyMinMakePrice : function (players, _this) {
			var self = _this, buyPlayerFor, filteredCosts, filteredPlayers, buyId, minCostCount, cardId;
			// сортируем по порядку
			var minMaxPlayersSorted = self.minMaxSortWith(players, false, ['buyNowPrice', 'tradeId', 'startingBid']);
			buyPlayerFor = minMaxPlayersSorted[0].buyNowPrice;
			// фильтруем цены которые не больше минимальной ставки * коэффициент
			filteredCosts = minMaxPlayersSorted.map(function (el) { return el.buyNowPrice; })
				.filter(function (cost) { return cost < buyPlayerFor * self.currentStrategyData.buyMinNoiseCoef; });

			filteredPlayers = minMaxPlayersSorted
				.filter(function (player) { return player.buyNowPrice < buyPlayerFor * self.currentStrategyData.buyMinNoiseCoef; });

			console.log('buyMin::prices for current', filteredCosts);

			minCostCount = filteredCosts.filter(function (cost) { return cost == buyPlayerFor; }).length;
			buyId = minMaxPlayersSorted[0].tradeId;
			cardId = minMaxPlayersSorted[0].itemData.id;

			return {
				buyPlayerFor : buyPlayerFor,
				filteredCosts : filteredCosts,
				filteredPlayers : filteredPlayers,
				buyId : buyId,
				cardId : cardId, 
				minCostCount : minCostCount
			}
		},
		continueStatus : function () {
			console.log('findObject.maxb', findObject.maxb, '||| maxCost', maxCost, 'spendMoney', self.currentStrategyData.spendMoney, '||| moneyLimit', moneyLimit, 'boughtItems', self.currentStrategyData.boughtItems, '||| itemsLimit', itemsLimit, 'credits', self.credits);
			var res = !(findObject.maxb > maxCost || 
				self.currentStrategyData.spendMoney > moneyLimit || 
				self.currentStrategyData.boughtItems > itemsLimit || 
				findObject.maxb > self.credits);
			if (!res) {
				console.log('strategy::STRATEGY ENDED WITH CONDITIONS');
			}
			return res;
		}
	};
	// this.options.buyMinNoiseCoef = buyMinNoiseCoef;
	findObject.maxb = findObject.maxb - step;
	// вспомогательная функция для нормального пуша
	var exit = function (callback) { 
		if (self.playersForInstantBuy.length) {
			self.instantBuyAndSellPlayers(self.playersForInstantBuy, callback);
		} else {
			return callback(null);
		}
	}
	// главная функция которая разруливает что делать дальше на каждой итерации
	var handler = function () {
		return function (callback) {
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
Trader.prototype.instantBuyAndSellPlayers = function (players, CALLBACK) {
	console.log('instantBuyAndSellPlayers::STARTED');
	var self = this;
	self.playersList = players;
	self.each.bind(trader, false, [self.buy, self.toTradepile, self.sell], function (err, ok) {
		if (err) return CALLBACK(err);
		console.log('instantBuyAndSellPlayers::ALL PLAYERS BOUGHT AND SOLD');
		return CALLBACK(null);
	});
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
	this.options = _.extend(this.options, options);
	// this.options = options;
	return this;
}
Trader.prototype.search = function (object, callback) {
	console.log('search::', object);
	var self = this;
	this.playersList = null;
	var time = self.randomTime();

	setTimeout(function () {
		self.apiClient.search(object, function (error, response) {
			if (!response.auctionInfo) {
				return console.log(response);
			}
			self.playersList = response.auctionInfo;
			// var b = response.auctionInfo.map(function (el) {
			// 	return { id: el.itemData.id, rare : el.itemData.rareflag, rating: el.itemData.rating, buyNowPrice : el.buyNowPrice }
			// });
			// console.log(b);
			console.log('search::COMPLETED, FOUND:', response.auctionInfo.length, 'ELEMENTS');

			if (callback && typeof callback == 'function') {
				callback(null);
			}
		});
	}, time);
}
Trader.prototype.bid = function (player, callback) {
	console.log('bid', player);
	// TODO
	callback(null);
	return this;
}
Trader.prototype.buy = function (player, сb) {
	var self = this, time = self.randomTime();

	console.log('buy', player.tradeId);
	setTimeout(function () {
		self.apiClient.placeBid(player.tradeId, player.buyNowPrice, function (err, pl) {
			console.log('buy::DEBUG INFO', pl);

			if (pl.code == 461) {
				self.iterateParams.costs[player.tradeId] = self.iterateParams.costs[player.tradeId] || {};
				self.iterateParams.costs[player.tradeId] = {
					was : true
				};
				return cb(null);
			}

			if (pl.code == 470) {
				console.log('buy::NO MONEY FOR BUYING');
				return cb(new Error('NO MONEY FOR BUYING'));
			}
			if (pl.success == false) {
				// ошибка при покупке
				console.log('buy::ERROR', pl);
				return cb(new Error('ERROR OCCURED WITH REASON', pl.reason));
			} else {
				var tradeId = player.tradeId;

				// все нормально покупка прошла успешно
				self.currentStrategyData.spendMoney += player.buyNowPrice;
				self.currentStrategyData.boughtItems++;
				self.credits -= player.buyNowPrice;

				// Указываем параметры для удобной работы потом с ними внутри следующих методов по
				// тому же плеер трейд id который был в списке, тк они меняются
				self.iterateParams.costs[player.tradeId] = { 
					bid : futapi.calculateNextLowerPrice(player.sellPrice), 
					buyNow : player.sellPrice,
					tradeId : tradeId,
					cardId : player.itemData.id,
					id : tradeId,
					position : player.itemData.preferredPosition,
					rare : player.itemData.rareflag,
					rating : player.itemData.rating,
					marketPrices : player.filteredCosts,
					assetId : player.itemData.assetId,
					buyPrice : player.buyNowPrice,
					sellPrice : player.sellPrice,
				};

				console.log('buy::PLAYER', tradeId, 'WITH RATING *', player.itemData.rating, '* BOUGHT FOR', buyPlayerFor);
				return cb(null);
			}
		});
	}, time);
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
Trader.prototype.removeSold = function (cb) {
	var self = this;
	self.apiClient.removeSold(function (error, ok) {
		console.log('removeSold::', error, ok);
		console.log('removeSold::SOLD PLAYERS REMOVED');
		if (error) return cb(error);
		return cb(null);
	})
}
Trader.prototype.reListWithDBSync = function (CALLBACK) {
	var self = this, oldTradepile, oldTradepileObject = {}, newTradepileObject = {};

	async.series([
		function (cb) {
			setTimeout(function () {
				self.apiClient.getTradepile(function (err, data) {
					if (err) return cb(err);
					var players = data.auctionInfo;

					if (!players) return CALLBACK(null);

					sold_players = players.filter(function (el) {
						return el.tradeState == 'closed';
					});

					self.playersInTradeList = players.length - sold_players.length;

					console.log('reListWithDBSync::PLAYERS CLOSED COUNT **', sold_players.length, '**');

					oldTradepile = players.map(function (player) {
						oldTradepileObject[player.itemData.id] = player.tradeId;
						return { cardId : player.itemData.id, tradeId : player.tradeId, sold : player.tradeState == 'closed'};
					});
					// console.log('reListWithDBSync::OLD TRADEPILE GET AND MAP FORMED', oldTradepileObject);
					return cb(null);
				});
			}, 5378);
		},
		function (cb) {
			setTimeout(function () {
				self.apiClient.relist(function (err, data) {
					if (err) return cb(err);
					console.log('reListWithDBSync::PLAYERS RELISTED', data);
					cb(null);
				});
			}, 3853);
		},
		function (cb) {
			setTimeout(function () {
				var buyMoney = self.credits, sellMoney = self.credits;
				self.apiClient.getTradepile(function (err, data) {
					if (err) return cb(err);
					data.auctionInfo.map(function (player) {
						// если сделка не закрыта то прибавляем ценники
						if (player.tradeState != 'closed') {
							var pr = player.itemData.lastSalePrice || 0;
							buyMoney += pr;
							sellMoney += player.buyNowPrice;
						}
						newTradepileObject[player.itemData.id] = player.tradeId;
						return { cardId : player.itemData.id, tradeId : player.tradeId, oldTradeId : oldTradepileObject[player.itemData.id] };
					});
					var ms = MoneySnapshot({buyMoney : buyMoney, sellMoney : sellMoney});
					ms.save(function (err, ok) {
						console.log('reListWithDBSync::SUMMARY BUY MONEY', buyMoney, 'SELL MONEY', sellMoney);
						return cb(null);
					});
				});
			}, 100078);
		},
		function (cb) {
			async.eachSeries(oldTradepile, function (player, cb) {
				// Player.findOneAndUpdate({tradeId : player.tradeId}, {
				Player.findOneAndUpdate({cardId : player.cardId}, {
					tradeId : newTradepileObject[player.cardId], 
					sold : player.sold, 
					soldTime : new Date(),
				}, {new : true}, function (dbError, dbResult) {
					if (dbResult) {
						console.log('reListWithDBSync::DB::PLAYER UPDATED WITH TRADEID', player.tradeId, 'TO', dbResult.tradeId, ' | :::SOLD:::', player.sold);
					} 
					else {
						console.log('reListWithDBSync::DB::PLAYER NOT FOUND IN BASE BY player.cardId');
					}
					if (dbError) return cb(dbError);
					return cb(null);
				});
			}, function (eachErr, eachOk) {
				if (eachErr) return cb(eachErr);
				console.log('reListWithDBSync::DB::ALL PLAYERS UPDATED');
				return cb(null);
			});
		}
	], function (err, ok) {
		if (err) return CALLBACK(err);
		console.log('reListWithDBSync::SUCCESFULLY COMPLETED !!!');
		self.removeSold(CALLBACK);
	});
}
Trader.prototype.keepAlive = function (cb) {
	this.apiClient.keepAlive(cb);
}
Trader.prototype.buyMin = function (player, BUYMINCALLBACK) {
	var self = this, time = this.randomTime();

	// проверяем не выполнились условия завершения
	if (!self.currentStrategyData.continueStatus()) {
		return BUYMINCALLBACK(new Error('NO MORE MONEY FOR CONTINUE'));
	}

	// ПРОВЕРКА ДЕФОЛТНОЙ ПОВЫШАЮЩЕЙ СТРАТЕГИИ
	if (self.currentStrategyData.type == 'default') {
		// проверка на пиздатую скорость и дриблинг
		if (player.itemData.attributeList[0].value <= self.options.minPlayerSpeed && 
			player.itemData.attributeList[4].value <= self.options.minPlayerDribling) {
			console.log('buyMin::TOO LOW SPEED, SKIP THIS PLAYER');
			self.iterateParams.costs[player.tradeId] = self.iterateParams.costs[player.tradeId] || {};
			self.iterateParams.costs[player.tradeId].was = true;
			return BUYMINCALLBACK(null);
		}
	}
	
	// тупая проверка на повторного игрока тк обновляется не сразу порой
	if (self.iterateParams.costs[player.tradeId]) {
		console.log('buyMin::PLAYER WITH ID', player.tradeId, 'IS ALREADY BOUGHT');
		self.iterateParams.costs[player.tradeId].was = true;
		return BUYMINCALLBACK(null);
	}

	async.waterfall([
		function (cb) {
			time = self.randomTime();
			console.log('buyMin::SEARCH QUERY', self.currentStrategyData.getBuyMinObject(player));
			setTimeout(function () {
				self.apiClient.search(self.currentStrategyData.getBuyMinObject(player), function (error, response) {
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
				self.iterateParams.costs[player.tradeId] = { was : true };
				return cb(null);
			}

			// если количество игроков слишком велико то нам не целесообразно их покупать и мы скипаем
			if (players.length > self.currentStrategyData.maxPlayersInListToBuy) {
				console.log('buyMin::TOO MANY PLAYERS IN SEARCH TO CONTINUE, LIMIT', self.currentStrategyData.maxPlayersInListToBuy);
				self.iterateParams.costs[player.tradeId] = { was : true };
				return cb(null);
			}

			console.log('buyMin::PLAYERS FOUND BY ID', player.itemData.assetId, 'NUMBER', players.length);
			time = self.randomTime();
			setTimeout(function () {

				var buyPlayerFor, buyNowPriceOnMarketAvg, filteredCosts, filteredPlayers, ardId, buyId, minCostCount;

				var _d = self.currentStrategyData.buyMinMakePrice(players, self, player);

				if (_d.skip) {
					return cb(null);
				} else {
					buyPlayerFor = _d.buyPlayerFor;
					filteredCosts = _d.filteredCosts;
					filteredPlayers = _d.filteredPlayers;
					buyId = _d.buyId;
					cardId = _d.cardId;
					minCostCount = _d.minCostCount;
				}

				// если количество мелких цен меньше указанного то скипаем [1, 1, 1, 1, 2, 3, 4, 5];
				// много единиц -> скипаем
				if (minCostCount >= self.options.lowerCostCountForSkip) {
					console.log('buyMin::TOO MANY PLAYERS WITH SAME LOW PRICE');
					self.iterateParams.costs[player.tradeId] = { was : true };
					return cb(null);
				}
				// ищем средние цены по рынку из фильтрованного списка
				var buyNowPriceOnMarketAvg = futapi.calculateValidPrice(self.findAverage(filteredCosts));
				// если цены совпали то увеличиваем немного цену
				if (buyPlayerFor == buyNowPriceOnMarketAvg) {
					buyNowPriceOnMarketAvg = futapi.calculateNextHigherPrice(self.findAverage(filteredCosts));
				}

				// если в фильтранутом списке вдруг окажется лишь наша цена то мы выкупаем и
				// переставляем на значение нашего коэффициента и да будет кайф
				if (filteredCosts.length == 1) {
					// buyNowPriceOnMarketAvg *= self.currentStrategyData.buyMinNoiseCoef;
					buyNowPriceOnMarketAvg += 400;
					buyNowPriceOnMarketAvg = futapi.calculateNextLowerPrice(buyNowPriceOnMarketAvg);
				}

				// обработка вот такой ситуации current [ 6500, 7800 ] тк средняя будет 7100 а так продадим за 7600
				if (filteredCosts.length == 2) {
					var validPrice = futapi.calculateValidPrice(buyNowPriceOnMarketAvg * 1.1);

					// buyNowPriceOnMarketAvg = futapi.calculateNextLowerPrice(filteredCosts[1]);
					buyNowPriceOnMarketAvg = validPrice;

					// добавляем в список игрока и указываем ему цену за которую он должен быть выставлен
					filteredPlayers[1].sellPrice = validPrice;
					filteredPlayers[1].filteredCosts = filteredCosts;
					self.playersForInstantBuy.push(filteredPlayers[1]);
				}

				// Последняя проверка с добавлением процента который берет себе фифа 0.0525
				// 4000 4200 -10
				// 4000 * 1.0525 = (4210 - 4200) = НЕ ОК
				// 
				// 4600 - 4000 ->
				// 4600 - 4210 = ОК
				// 
				// 4200 - 4210 = НЕ ОК
				// 
				if ((buyNowPriceOnMarketAvg - (buyPlayerFor * 1.0525)) <  self.options.buyAndSellDiffNotToSkip) {
					self.iterateParams.costs[player.tradeId] = { was : true };
					return cb(null);
					// тут можно переставлять подороже например а можно скипать
					// buyNowPriceOnMarketAvg *= self.currentStrategyData.buyMinNoiseCoef;
					// buyNowPriceOnMarketAvg = futapi.calculateNextHigherPrice(buyNowPriceOnMarketAvg);
				}

				console.log('buyMin::BUY FOR *', buyPlayerFor);
				console.log('buyMin::AVERAGE COST *', buyNowPriceOnMarketAvg);
				
				self.apiClient.placeBid(buyId, buyPlayerFor, function (err, pl) {
					console.log('buyMin::DEBUG INFO', pl);

					if (pl.code == 461) {
						self.iterateParams.costs[player.tradeId] = self.iterateParams.costs[player.tradeId] || {};
						self.iterateParams.costs[player.tradeId] = {
							was : true
						};
						return cb(null);
					}

					if (pl.code == 470) {
						console.log('buyMin::NO MONEY FOR BUYING');
						return cb(new Error('NO MONEY FOR BUYING'));
					}
					if (pl.success == false) {
						// ошибка при покупке
						console.log('buyMin::ERROR', pl);
						return cb(new Error('ERROR OCCURED WITH REASON', pl.reason));
					} else {
						var tradeId = player.tradeId;

						// if (!boughtPlayer) {
						// 	return cb(null);
						// }
						// var boughtPlayer = pl.auctionInfo[0];
						// tradeId = boughtPlayer.tradeId;
						// 
						// все нормально покупка прошла успешно
						self.currentStrategyData.spendMoney += buyPlayerFor;
						self.currentStrategyData.boughtItems++;
						self.credits -= buyPlayerFor;

						// Указываем параметры для удобной работы потом с ними внутри следующих методов по
						// тому же плеер трейд id который был в списке, тк они меняются
						self.iterateParams.costs[player.tradeId] = { 
							bid : futapi.calculateNextLowerPrice(buyNowPriceOnMarketAvg), 
							buyNow : buyNowPriceOnMarketAvg,
							// tradeId : boughtPlayer.tradeId,
							tradeId : tradeId,
							cardId : cardId,
							id : buyId,
							position : player.itemData.preferredPosition,
							rare : player.itemData.rareflag,
							rating : player.itemData.rating,
							marketPrices : filteredCosts,
							assetId : player.itemData.assetId,
							buyPrice : buyPlayerFor,
							sellPrice : buyNowPriceOnMarketAvg,
						};

						console.log('buyMin::PLAYER', tradeId, 'WITH RATING *', player.itemData.rating, '* BOUGHT FOR', buyPlayerFor);
						return cb(null);
					}
				});

			}, time);
		}
	], function (err, ok) {
		if (err) return BUYMINCALLBACK(err);
		BUYMINCALLBACK(null);
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
			// console.log('buyMin::PLAYER ALREADY BOUGHT');
			return callback(null);
		}
		id = this.iterateParams.costs[player.tradeId].cardId;
	}
	console.log('toTradepile::player', id);

	setTimeout(function () {
		self.apiClient.sendToTradepile(id, function (err, ok) {
			console.log('toTradepile::DEBUG', ok);
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
				// сохранение игрока
				var p = new Player(self.iterateParams.costs[player.tradeId]);
				p.save(function (err, ok) {
					if (err) return callback(err);
					return callback(null);
				});
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
			// console.log('buyMin::PLAYER ALREADY BOUGHT');
			return callback(null);
		}

		id = this.iterateParams.costs[player.tradeId].cardId;
		costs = {
			bid : this.iterateParams.costs[player.tradeId].bid,
			buyNow : this.iterateParams.costs[player.tradeId].buyNow
		}
		// delete this.iterateParams.costs[player.tradeId];
	}

	setTimeout(function () {
		self.apiClient.listItem(id, 
			costs.bid,
			costs.buyNow,
			3600, function (err, ok) {
				console.log('sell::', ok);
				if (ok.idStr) {
					console.log('sell::PLAYER', player.tradeId, 'WITH RATING', player.itemData.rating, 'SEND TO TRANSFER, BID', costs.bid, ', BUY NOW', costs.buyNow);
					// обновление трейдИд игроку который был выставлен на продажу
					Player.findOneAndUpdate({ cardId : id }, { tradeId : ok.idStr }, { new : true }, function (baseError, baseAnswer) {
						console.log('sell:PLAYER UPDATED IN BASE', 'FROM', player.tradeId, 'TO', baseAnswer.tradeId);
						if (baseError) return callback(baseError);
						return callback(null);
					});
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
	},
	makeId : function () {
	    return Math.random().toString(36).substring(7);
	}
}




