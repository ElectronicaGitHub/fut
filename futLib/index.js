/*jslint node: true */
"use strict";
var utils = require("./lib/utils");

var futapi = function(options){
  var __ = require("underscore");
  var urls = require("./lib/urls");
  var async = require('async');
  var fs = require("fs");
  var defaultOptions = {
      saveCookie: false,
      saveCookiePath: null,
      loadCookieFromSavePath: false,
      cookieJarJson: null      
  };
  
  defaultOptions = __.extend(defaultOptions, options);
  
  var login = new (require("./lib/login"))(options);

  var loginResponse = {};

  var futApi = function(){
      if(defaultOptions.loadCookieFromSavePath)
      {
          try  {
            fs.accessSync(defaultOptions.saveCookiePath, fs.R_OK | fs.W_OK);
            var jsonString = fs.readFileSync(defaultOptions.saveCookiePath,"utf8");
            login.setCookieJarJSON(JSON.parse(jsonString));
          }
          catch(e){  }
      }
      else if(defaultOptions.cookieJarJson && typeof defaultOptions.cookieJarJson == "object")
      {
          var dcj = defaultOptions.cookieJarJson;
          if(dcj.version && dcj.storeType && dcj.rejectPublicSuffixes && dcj.cookies)
            login.setCookieJarJSON(dcj);
      }
  };
  
  futApi.prototype.getCookieJarJSON = function(){
    console.log('login.getCookieJarJSON()', login.getCookieJarJSON());
    return login.getCookieJarJSON();
  };

  futApi.prototype.setCookieJarJSON = function(json){
      login.setCookieJarJSON(json);
  };

  futApi.prototype.keepAlive = function (cb) {
    var json = login.getCookieJarJSON();
    var xsrfValue = json.cookies.filter(function (el) {
      if (el.key == 'XSRF-TOKEN') return el;
    })[0].value;
    login.keepAlive(xsrfValue, cb);
  }

  futApi.prototype.login = function(email, password, secret, platform, tfCodeCb, loginCb){
    login.login(email, password, secret,platform, tfCodeCb, function(error, result){
      if(error)
        loginCb(error);
      else {
        loginResponse = result;
        loginCb(null, result); 
        
        if(defaultOptions.saveCookie && defaultOptions.saveCookiePath)
        {
            fs.writeFile(defaultOptions.saveCookiePath, 
                JSON.stringify(login.getCookieJarJSON()), 
                "utf8", 
                function(saveError){
                    if(saveError) throw saveError;
                           
                    });
        }
      }
    });
  };
  
  futApi.prototype.getCredits = function(cb){
      sendRequest(urls.api.credits, cb);
  };
  
  futApi.prototype.getTradepile = function(cb){
      sendRequest(urls.api.tradepile, cb);
  };
  
  futApi.prototype.getWatchlist = function(cb){
      sendRequest(urls.api.watchlist, cb);
  };
  
  futApi.prototype.getPilesize = function(cb){
      sendRequest(urls.api.pilesize, cb);
  };
  
  futApi.prototype.relist = function(cb){
      sendRequest(urls.api.relist,{xHttpMethod: "PUT"}, cb);
  };
  
  futApi.prototype.search = function(filter,cb){
      var defaultFilter = {
          type: "player",
          start: 0,
          num: 16
      };
      
      defaultFilter = __.extend(defaultFilter, filter);
      
      if(defaultFilter.maskedDefId)
        defaultFilter.maskedDefId = utils.getBaseId(defaultFilter.maskedDefId);
      
      sendRequest(urls.api.transfermarket + toUrlParameters(defaultFilter), cb);
  }
  
    
  futApi.prototype.placeBid = function(tradeId, bid, cb){
      var tId = 0;
      var bData = {"bid":bid};
      
      if(!utils.isPriceValid(bid))
        return cb(new Error("Price is invalid."));
      
      if(__.isNumber(tradeId))
        tId = tradeId;
      else if(__.isObject(tradeId) && tradeId.tradeId && __.isNumber(tradeId.tradeId))
        tId = tradeId.tradeId;
      
      if(tId === 0) return cb(new Error("Tradid is value is not allowed."));
      
      sendRequest(utils.format(urls.api.placebid,[tId]),
      {
            xHttpMethod: "PUT", 
            body: bData
      }, cb);
  }
  
  futApi.prototype.listItem = function(itemDataId, startingBid, buyNowPrice, duration, cb){
      
      if([3600, 10800, 21600, 43200, 86400, 259200].indexOf(duration) < 0) 
        return cb(new Error("Duration is invalid."));
      
      if(!utils.isPriceValid(startingBid) || !utils.isPriceValid(buyNowPrice))
        return cb(new Error("Starting bid or buy now price is invalid."));
      
      var data = {
          "duration": duration,
          "itemData": { "id":itemDataId} ,
          "buyNowPrice": buyNowPrice,
          "startingBid": startingBid
      };
      
      sendRequest(urls.api.listItem,{
          xHttpMethod: "POST",
          body: data 
      }, cb);
  };
  
  futApi.prototype.getStatus = function(tradIds, cb){
      var urlParameters = "tradeIds=";
            
      for(var i = 0; i < tradIds.length ; i++)
          urlParameters += tradIds[i] + "%2c";

      sendRequest(urls.api.status + urlParameters.substr(0,urlParameters.length - 3), cb);
  };
  
  futApi.prototype.addToWatchlist = function(tradeId, cb){
      var data = {"auctionInfo":[{"id":tradeId}]};
      sendRequest(urls.api.watchlist+ utils.format("?tradeId={0}",[tradeId]), {  xHttpMethod: "PUT", body: data }, cb);
  };

  futApi.prototype.removeSold = function (cb) {
    sendRequest(urls.api.sold, { xHttpMethod : 'DELETE'}, cb);
  }

  futApi.prototype.getUnassigned = function (cb) {
      sendRequest(urls.api.unassigned, { xHttpMethod : 'GET' }, cb);
  }

  futApi.prototype.openPack = function (id, isFree, cb) {

    var data = {
      // currency:"COINS",
      // currency: null,
      packId: id,
      useCredits: 0,
      usePreOrder: isFree
      // usePreOrder: true если у нас уже есть пакет бесплатный
    }

    sendRequest(urls.api.openPack, { xHttpMethod : 'POST', body : data }, cb);
  }
  
  futApi.prototype.removeFromWatchlist = function(tradeId, cb){
      sendRequest(urls.api.watchlist  + utils.format("?tradeId={0}",[tradeId]), {  xHttpMethod: "DELETE" }, cb);
  }
  
  futApi.prototype.removeFromTradepile = function(tradeId, cb){
      sendRequest(utils.format(urls.api.removeFromTradepile,[tradeId]), {  xHttpMethod: "DELETE" }, cb);
  }
  
  futApi.prototype.sendToTradepile = function(itemDataId, cb){
      var data = {"itemData":[{"pile":"trade","id":itemDataId}]};
      sendRequest(urls.api.item, {  xHttpMethod: "PUT", body: data }, cb);
  };
  
  futApi.prototype.sendToClub = function(itemDataId, cb){
      var data = {"itemData":[{"pile":"club","id":itemDataId}]};
      sendRequest(urls.api.item, {  xHttpMethod: "PUT", body: data }, cb);
  };

  futApi.prototype.useMiscItem = function (id, cb) {
      sendRequest(urls.api.item + '/' + id, {  xHttpMethod: "POST", body: {apply : []} }, cb);
  }
  
  futApi.prototype.quickSell = function(itemDataId, cb ){
      sendRequest(urls.api.item  + utils.format("/{0}",[itemDataId]), {  xHttpMethod: "DELETE" }, cb);
  };
  futApi.prototype.quickSellMany = function(ids, cb ){
      sendRequest(urls.api.item  + '?itemIds=' + ids.join(','), {  xHttpMethod: "DELETE" }, cb);
  };
  
    function toUrlParameters(obj){
        var str = "";
        var keys = Object.keys(obj);
        for(var i = 0; i < keys.length;i++){
            str += keys[i] + "=" + encodeURI(obj[keys[i]]).replace(/%5B/g, '[').replace(/%5D/g, ']') + "&";
        }
        return str.substr(0, str.length - 1);
    }

    var lastSendRequestOptions = {};
    // var n = 0;
  
    function sendRequest(url,options,cb) {
        // n++;

        var defaultOptions = {
            xHttpMethod: "GET",
            headers: {}
        }

        if(__.isFunction(options)){
            cb = options;        
        }
        else if(__.isObject(options)) {
            defaultOptions = __.extend(defaultOptions,options);
        }

        defaultOptions.headers["X-HTTP-Method-Override"] = defaultOptions.xHttpMethod;
        delete defaultOptions.xHttpMethod;

        loginResponse.apiRequest.post(url,
        defaultOptions,
        function (error, response, body) {

            // if (n==3) {
            //     console.log('expired here naprimer', url, body);
            //     body = { reason: 'expired session', code: 401, message: null };
            // }
            if(error) {
                return cb(error,null)
            }
            else if(response.statusCode == 404) return cb(new Error(response.statusMessage),null);

              // если сессия заэкспайрилась то мы ее кароч продляем 
              // и заново последнюю функцию вызываем
            else if (body && body.code == 401) {
                lastSendRequestOptions = {
                    url : url,
                    options : options,
                    cb : cb
                };

                // if (n == 0) {
                //     n++;
                //     console.log(url, body);
                //     console.log('FUTAPI::INDEX.JS SESSION EXPIRED, KEEPALIVE START');

                //   console.log('LAST SAVE OPTIONS', url, options);

                //   var json = login.getCookieJarJSON();
                //   var xsrfValue = json.cookies.filter(function (el) {
                //     if (el.key == 'XSRF-TOKEN') return el;
                //   })[0].value;

                //   login.keepAlive(xsrfValue, function () {
                //     console.log('FUTAPI::INDEX.JS KEEPALIVE SUCCESS');
                //     return sendRequest(lastSendRequestOptions.url, lastSendRequestOptions.options, lastSendRequestOptions.cb);
                //   });
                      
                // } else if (n > 0) {
                console.log('FUTAPI::INDEX.JS SESSION EXPIRED, SESSION GET()');
                async.series([
                    function (cb) {
                        login.getSession(true, cb);
                    }
                ], function (err, ok) {

                    console.log('after expired CallBACK');
                    sendRequest(lastSendRequestOptions.url, lastSendRequestOptions.options, lastSendRequestOptions.cb);
                });
                return;
                // }
            }

            else if(utils.isApiMessage(body)) return cb(new Error(JSON.stringify(body)), null);

            var _cb = cb;
            if (lastSendRequestOptions.cb) {
                _cb = lastSendRequestOptions.cb;
            }
            lastSendRequestOptions = {};
            return _cb(null, body);
        });
    }

  return new futApi();
};


futapi.isPriceValid = utils.isPriceValid;
futapi.calculateValidPrice = utils.calculateValidPrice;
futapi.calculateNextLowerPrice = utils.calculateNextLowerPrice;
futapi.calculateNextHigherPrice = utils.calculateNextHigherPrice;
futapi.getBaseId = utils.getBaseId;
module.exports = futapi;