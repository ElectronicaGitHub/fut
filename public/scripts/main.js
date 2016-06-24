// Timeout time refresh
$(function () {
	var el = $('#timeout'), 
		val = Number(el.text()), go = el.attr('data-go') === 'true';
	if (go) {
		setInterval(function () {
			val--;
			el.text(val);
		}, 1000);		
	}
});
var variables = {
	url : 'http://fifaparser.herokuapp.com/search'
}

angular.module('fifatrader', []).controller('fifatrader', ['$scope', '$http', function ($scope, $http) {
	$scope.name = '';
	$scope.moment = moment;
	$scope.playersList = [];
	$scope.players = window.players;
	$scope.soldPlayersCount = window.soldPlayersCount;
	$scope.activePlayers = window.activePlayers;
	$scope.parsingData = window.parsingData;
	$scope.dataItems = window.dataItems;
	$scope.searchPlayersList = window.playersListForStrategy;
	$scope.dataStorage = window.dataStorage;
	$scope.searchOptions = window.searchOptions;
	$scope.strategyOptions = window.strategyOptions;
	$scope.currentStrategy = window.currentStrategy;
	$scope.rareVariants = [0, 1, 'SP', 3, 11];
	$scope.filters = {
		fastBuyPlayers : {
			min : 0,
			max : 1000
		}
	};
	$scope.app = {
		// state : 'stats',
		state : 'main',
	}
	$scope.activePlayers = $scope.activePlayers.map(function (el) {
		el.timeInList = moment().diff(moment(el.created), 'hours', true).toFixed(2);
		return el;
	})
	$scope.playersLog = {
		state : 'sold',
		changeState : function () {
			$scope.playersLog.state = $scope.playersLog.state == 'sold' ? 'active' : 'sold';
		}
	}
	$scope.playersSelection = {
		selected : null,
		select : function (player) {
			console.log(player);
			this.selected = player;
		},
		showInfo : function (player) {
			var self = this;
			$.ajax({
				url : variables.url,
				method : 'POST', 
				data : { player : { assetId : player.assetId } }, 
				success : function (data) {
					angular.extend(player, data.result[0]);
					$scope.$apply();
					$('#selectedPlayerModal').modal('show');
					setTimeout(function () {
						self.makeGraph();
					},500);
				}, 
				error : function (data) {
					console.log(data);
				}
			})
		},
		makeData : function () {
			var self = this;
			var playersAll = $scope.players.concat($scope.activePlayers).filter(function (el) {
				return el.assetId == self.selected.assetId;
			});
			// купленные
			data0 = [];
			// еще не купленные
			data1 = [];
			for (var i in playersAll) {
				if (playersAll[i].sold) {
					data0.push({ x : playersAll[i].timeDiff, y : 10, r : 2 });
				} else {
					data1.push({ x : playersAll[i].timeDiff, y : 10, r : 2 });
				}
			}
			return [
				{
					label : 'SOLD',
					data : data0,
					backgroundColor : 'rgba(129, 226, 147, 0.43)'
				},
				{
					label : 'ACTIVE',
					data : data1,
					backgroundColor : 'rgba(100, 50, 47, 0.43)'
				}
			]
		},
		makeGraph : function () {
			var self = this;
			var data = self.makeData();
			console.log(data);
				
			var ctx = $('#selected-player-modal-canvas').get(0).getContext('2d');

			new Chart(ctx, {
                type: 'bubble',
                data: { datasets : data },
                options: {
                    responsive: true,
                    title:{
                        display:true,
                        text:'Chart.js Bubble Chart'
                    },
                }
            });
		}
	}
	$scope.noSkip = {
		name : '',
		playersList : [],
		searchPlayersList : $scope.dataStorage.noSkip || [],
		select : function (player) {
			$scope.noSkip.searchPlayersList.push(player);
			$scope.noSkip.playersList = [];
			$scope.noSkip.name = '';
			$scope.noSkip.changePlayersList($scope.noSkip.searchPlayersList);
		},
		deselect :function (index) {
			$scope.noSkip.searchPlayersList.splice(index, 1);
			$scope.noSkip.changePlayersList($scope.noSkip.searchPlayersList);
		},
		changePlayersList : function (list) {
			$http.post('/changeDataStorage', { noSkip : list })
			.success(function (data) { console.log(data);})
			.error(function (data) { console.log(data);});
		},
		search : function () {
			$.ajax({
				url : variables.url,
				method : 'POST', 
				data : { player : { name : $scope.noSkip.name } }, 
				success : function (data) {
					$scope.noSkip.playersList = data.result;
					$scope.$apply();
					console.log(data);
				}, 
				error : function (data) {
					console.log(data);
				}
			})
		}
	}

	$scope.parseData = {
		name : '',
		graphsData : null,
		playersList : [],
		searchPlayersList : $scope.dataStorage.playersForParse || [],
		select : function (player) {
			$scope.parseData.searchPlayersList.push(player);
			$scope.parseData.playersList = [];
			$scope.parseData.name = '';
			$scope.parseData.changePlayersList($scope.parseData.searchPlayersList);
		},
		deselect :function (index) {
			$scope.parseData.searchPlayersList.splice(index, 1);
			$scope.parseData.changePlayersList($scope.parseData.searchPlayersList);
		},
		changePlayersList : function (list) {
			$http.post('/changeDataStorage', { playersForParse : list })
			.success(function (data) { console.log(data);})
			.error(function (data) { console.log(data);});
		},
		search : function () {
			$.ajax({
				url : variables.url,
				method : 'POST', 
				data : { player : { name : $scope.parseData.name } }, 
				success : function (data) {
					$scope.parseData.playersList = data.result;
					$scope.$apply();
					console.log(data);
				}, 
				error : function (data) {
					console.log(data);
				}
			})
		},
		makeData : function () {
			var n = {};
			for (var i in window.dataItems) {
			    el = window.dataItems[i];
			    n[el.assetId] = n[el.assetId] || [];

			    el.graphsData = el.graphsData || [[], []];
			    // n[el.assetId].push({ x : el.created, y : el.minPrice });
			    // n[el.assetId].push({ x : el.created, y : el.averagePrice });

			    n[el.assetId].push(el);
			}
			// console.log(n);
			this.graphsData = n;
		},
		init : function () {
			this.makeData();
			// this.makeGraph();
		},
		dataByIds : {},
		makeGraph : function () {
			var self = this, n = 0, d = {
				type : 'line',
				data : { 
					datasets : []
				},
				options : {
					responsive: true,
					scales : {
						xAxes : [{
							type: "time",
							display: true,
							scaleLabel: {
								display: true,
								labelString: 'Date'
							}
						}],
						yAxes : [{
							display: true,
							scaleLabel: {
								display: true,
								labelString: 'value'
							}
						}]
					}
				}
			}
			self.charts = self.charts || [];
			console.log(self.graphsData);
			for (var i in self.graphsData) {
				var pl = self.graphsData[i];
				var canvas = $("#canvas-" + n++)[0];
				var obj = {
					backgroundColor : 'rgba(99, 209, 136, 0.4)', borderColor : 'rgba(99, 209, 136, 0.4)',
					pointBackgroundColor : 'rgba(84, 176, 115, 0.5)', pointBorderColor : 'rgba(84, 176, 115, 0.5)',
					pointBorderWidth : 1, label : 'Min Price', data : []
				}
				var obj2 = {
					backgroundColor : 'rgba(237, 207, 89, 0.5)', borderColor : 'rgba(237, 207, 89, 0.5)',
					pointBackgroundColor : 'rgba(199, 173, 75, 0.5)', pointBorderColor : 'rgba(199, 173, 75, 0.5)',
					pointBorderWidth : 1, label : 'Average Price', data : []
				}

				for (var j in self.graphsData[i]) {
					obj.data.push({ x : self.graphsData[i][j].created, y : self.graphsData[i][j].minPrice });
					obj2.data.push({ x : self.graphsData[i][j].created, y : self.graphsData[i][j].averagePrice });
				}
				self.dataByIds[i] = { data : [obj, obj2], canvas : canvas };

				// добавляем функцию в отложенные вызовы
				self.charts.push(function (i, player) {
					var __ctx = self.dataByIds[i].canvas.getContext('2d');
					var _d = angular.copy(d);
					// добавляем текст
					_d.options.title = { display : true, text : player.itemData.name + ' (' + i + ')' };
					var __d = angular.extend(_d, { data : { datasets : self.dataByIds[i].data } });
					console.log(i, self.dataByIds[i].canvas, self.dataByIds[i], __d);
					new Chart(__ctx, __d);
				});
			}
			var idKeys = Object.keys(self.dataByIds);
			for (var i in self.charts) {
				(function (i) {
					$.ajax({
						url : variables.url,
						method : 'POST', 
						data : { player : { assetId : idKeys[i] } }, 
						success : function (data) {
							player = data.result[0];
							self.charts[i](idKeys[i], player);
						}, 
						error : function (data) {
							console.log(data);
						}
					})
				})(i);
			}
		}
	}
	$scope.parseData.init();

	$scope.moneyLog = {
		data : {
			byDates : angular.copy(window.snapshots),
			byTimes : angular.copy(window.snapshots)
		},
		state : 'byDates',
		changeState : function () {
			$scope.moneyLog.state = $scope.moneyLog.state == 'byTimes' ? 'byDates' : 'byTimes';
		},
		init : function () {
			this.makeByDates();
		},
		makeByDates : function () {
			var obj = {};
			var data = $scope.moneyLog.data.byDates;
			for (var i in data) {
				var d = moment(data[i].created).format('DD-MM-YY');
				obj[d] = obj[d] || { buyMoney : [], sellMoney : [] };
				obj[d].buyMoney.push(data[i].buyMoney);
				obj[d].sellMoney.push(data[i].sellMoney);
			}
			for (var i in obj) {
				obj[i].buyMoney = Math.max.apply(null, obj[i].buyMoney);
				obj[i].sellMoney = Math.max.apply(null, obj[i].sellMoney);
			}

			var lastObj;
			var keys = Object.keys(obj);
			// for (var i in obj) {
			for (var i = keys.length -1; i >= 0; i--) {
				if (lastObj) {
					obj[keys[i]].buyMoneyDiff = obj[keys[i]].buyMoney - lastObj.buyMoney;
					obj[keys[i]].sellMoneyDiff = obj[keys[i]].sellMoney - lastObj.sellMoney;

					obj[keys[i]].buyMoneyDiffP = (obj[keys[i]].buyMoneyDiff / lastObj.buyMoney * 100).toFixed(3);
					obj[keys[i]].sellMoneyDiffP = (obj[keys[i]].sellMoneyDiff / lastObj.sellMoney * 100).toFixed(3);
				}
				lastObj = obj[keys[i]];
			}
			$scope.moneyLog.data.byDates = obj;
		}
	}
	$scope.moneyLog.init();

	$scope.changeStrategy = function (strategy) {
		$scope.currentStrategy = strategy;
		$scope.saveCurrentStrategy(strategy);
	}
	$scope.changePlayersList = function (list) {
		$http.post('/changePlayersList', { searchPlayersList : list })
		.success(function (data) { console.log(data);})
		.error(function (data) { console.log(data);});
	}
	$scope.saveCurrentStrategy = function (strategy) {
		$http.post('/saveCurrentStrategy', { currentStrategy : strategy })
		.success(function (data) { console.log(data);})
		.error(function (data) { console.log(data);});
	}
	$scope.search = function () {
		$.ajax({
			url : variables.url,
			method : 'POST', 
			data : { player : { name : $scope.name } }, 
			success : function (data) {
				$scope.playersList = data.result;
				$scope.$apply();
				console.log(data);
			}, 
			error : function (data) {
				console.log(data);
			}
		})
	}
	$scope.select = function (player) {
		$scope.searchPlayersList.push(player);
		$scope.playersList = [];
		$scope.name = '';
		$scope.changePlayersList($scope.searchPlayersList);
	}
	$scope.deselect = function (index) {
		$scope.searchPlayersList.splice(index, 1);
		$scope.changePlayersList($scope.searchPlayersList);
	}
	$scope.$watch('strategyOptions', function () {
		$http.post('/changeStrategyOptions', { strategyOptions : $scope.strategyOptions})
		.success(function (data) { console.log(data);})
		.error(function (data) { console.log(data);});
	}, true);
	$scope.$watch('searchOptions', function () {
		if (!$scope.searchOptions.moneyLimit) {
			$scope.searchOptions.moneyLimit = null;
		}
		$http.post('/changeSearchOptions', { searchOptions : $scope.searchOptions})
		.success(function (data) { console.log(data);})
		.error(function (data) { console.log(data);});
	}, true);

	function randomColorFactor() {
		return Math.round(Math.random() * 255);
	}
	function randomColor(opacity) {
		return 'rgba(' + randomColorFactor() + ',' + randomColorFactor() + ',' + randomColorFactor() + ',' + (opacity || '.3') + ')';
	}
}])


.filter('fastBuyPlayers', function ($rootScope) {
	return function (players, arr) {
		var min = arr[0];
		var max = arr[1];
		$rootScope._players = [];
		for (var i in players) {
			if (players[i].timeDiff != undefined) {
				if (players[i].timeDiff >= min && players[i].timeDiff <= max) {
					$rootScope._players.push(players[i]);
				}
			}
		}
		return $rootScope._players;
	}
});