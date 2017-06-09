var enableHosts = [];

// load ip address
chrome.webRequest.onCompleted.addListener(function (details) {
    setTimeout(function(){
        details.req = 'showip';
        details.hosts = enableHosts;
        chrome.tabs.sendRequest(details.tabId, details, function (response) {
        });
    }, 1000);
}, {
    urls: [ 'http://*/*', 'https://*/*' ],
    types: [ 'main_frame' ]
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    enableHosts = request;
});

// Get ip location message
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var location = localStorage[request.ip] || getIpLocation(request.ip);
    localStorage[request.ip] = location;
    sendResponse({
        'location': location,
        'stock': getStockInfo()
    });
});

function getStockInfo() {
    var stockInfo = {};
    var stockList = [],
        stockListStocks = JSON.parse(localStorage['stockListStocks']);
    for (var i in stockListStocks) {
        stockList.push(stockListStocks[i].stockCode);
    }
    var stockUpdateAt = parseInt(new Date().getTime() / 10000) * 10;
    if (localStorage['stockUpdateAt'] == stockUpdateAt) {
        return JSON.parse(localStorage['stock']);
    }
    http_ajax('https://hq.sinajs.cn/list=' + stockList.join(','), 'GET', false, function(data) {
        if (true === data.success) {
            try {
                stockInfo.success = true;
                stockInfo.content = data.content;
            } catch(exception) {
                stockInfo.success = false;
            }
        } else {
            stockInfo = {};
        }
    });
    stockInfo.config = stockList;
    localStorage['stock'] = JSON.stringify(stockInfo);
    localStorage['stockUpdateAt'] = stockUpdateAt;
    return stockInfo;
}

function getIpLocation(ip) {
    var location = '';
    http_ajax('http://int.dpool.sina.com.cn/iplookup/iplookup.php?format=json&ip=' + ip, 'GET', false, function(data) {
        if (true === data.success) {
            try {
                var loc = JSON.parse(data.content);
                if (loc.ret !== undefined) {
                    if (loc.ret < 0) {
                        location = '';
                    } else if(loc.ret == 1) {
                        location = loc.country + ' ' + loc.province + ' ' + loc.city;
                    }
                }
            } catch(exception) {
            }
        } else {
            location = '';
        }
    });
    return location;
}

function http_ajax(link, method, aysnc, callback){
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            var respData;
            if (xhr.status === 200 && xhr.responseText) {
                respData = {
                    success : true,
                    content : xhr.responseText
                };
            } else {
                respData = {
                    success : false,
                    content : "load remote file content failed."
                };
            }
            callback(respData);
        }
    };
    xhr.open(method, link, aysnc);
    xhr.send();
};