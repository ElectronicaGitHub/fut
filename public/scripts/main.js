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
	$scope.searchPlayersList = window.playersListForStrategy;
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
	$scope.moneyLog = {
		data : {
			byDates : angular.copy(window.snapshots),
			byTimes : angular.copy(window.snapshots)
		},
		state : 'byDates',
		changeState : function () {
			$scope.moneyLog.state = $scope.moneyLog.state == 'byTimes' ? 'byDates' : 'byTimes';
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

			for (var i = 0; i < Object.keys(obj).length; i++) {
				if (obj[i-1]) {
					obj[i].buyMoneyDiff -= obj[i-1].buyMoneyDiff;
					obj[i].sellMoneyDiff -= obj[i-1].sellMoneyDiff;

					obj[i].buyMoneyDiffP = obj[i].buyMoneyDiff / obj[i-1].buyMoney;
					obj[i].sellMoneyDiffP = obj[i].sellMoneyDiff / obj[i-1].sellMoney;
				}
			}
			$scope.moneyLog.data.byDates = obj;
		}
	}
	$scope.moneyLog.makeByDates();

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
		// $http.post(variables.url, )
		// .success(function (data) {
		// 	console.log(data.result);
		// })
		// .error(function (data) {
		// 	console.log(data);
		// });
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