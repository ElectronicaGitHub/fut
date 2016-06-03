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
	$scope.playersList = [],
	$scope.searchPlayersList = window.playersListForStrategy;
	$scope.searchOptions = window.searchOptions;
	$scope.strategyOptions = window.strategyOptions;
	$scope.currentStrategy = window.currentStrategy;
	$scope.rareVariants = [0, 1, 'SP', 3, 11];

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
}]);