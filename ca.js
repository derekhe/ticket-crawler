var request = require("request");
var async = require('async');
var Agent = require('socks5-http-client/lib/Agent');
var moment = require('moment');
var hotCites = require('./hotcity.json');
var proxies = require("./proxy.json");
var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var zlib = require('zlib');
var threads = 50;

proxies = _.filter(proxies, (item)=>{return item.types["HTTP"] == "High";})

var invalidAirlines = [];
var queueCallback = function (valid) {
    if (valid) {
        finished++;
    }
    else {
        error++;
    }
    var duration = moment.duration(moment() - startTime).as("minutes");
    console.log(`finished: ${finished}, error: ${error}, speed: ${finished / duration}, proxies: ${proxies.length}`);
};

var q = async.queue(function (data, callback) {
    var depCode = data.depCode;
    var arrCode = data.arrCode;

    var airlineKey = `${depCode}-${arrCode}`;
    if (_.indexOf(invalidAirlines, airlineKey) != -1) {
        console.log(`${airlineKey} , skip`);
        callback(false);
        return;
    }

    var date = data.date;
    var id = data.id;

    var proxyIndex = id % proxies.length;
    var proxy = proxies[proxyIndex];

    var httpProxy = `http://${proxy.host}:${proxy.port}`;
    var options = {
        method: 'POST',
        url: 'http://b2c.csair.com/B2C40/query/jaxb/direct/query.ao',
        headers: {
            'cache-control': 'no-cache',
            'accept-language': 'en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4,zh-TW;q=0.2',
            'content-type': 'application/x-www-form-urlencoded',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36',
            origin: 'http://b2c.csair.com',
            accept: 'application/json, text/javascript, */*; q=0.01',
        },
        form: {
            "json": `{"depcity":"${depCode}", "arrcity":"${arrCode}", "flightdate":"${date}", "adultnum":"1", "childnum":"0", "infantnum":"0", "cabinorder":"0", "airline":"1", "flytype":"0", "international":"0", "action":"0", "segtype":"1", "cache":"0", "preUrl":"", "isMember":""}`
        },
        proxy: httpProxy
    };

    console.log(data);

    request(options, function (error, response, body) {
        var valid = false;
        try {
            if (error) {
                console.error(error);
                q.push(data, queueCallback);
                callback(false);
                return;
            }

            var s = body.substring(0, 200);

            valid = body.indexOf("airports") != -1;
            if (valid) {
                console.log(id, httpProxy, s);

                var dirName = `./out/${moment().format("YYYY-MM-DD")}`;
                fs.ensureDirSync(dirName);
                var fileName = path.join(dirName, `${moment().format("x")}.json.gz`);
                zlib.gzip(JSON.stringify(JSON.parse(body), null, 2), function (err, result) {
                    fs.writeFileSync(fileName, result);
                });
            }
            else if (body.indexOf("很抱歉，暂无此航线") != -1) {
                invalidAirlines.push(airlineKey);
            } else if (body.indexOf("message") != -1) {
                console.error("Skip", id, httpProxy, s);
                valid = false;
            } else if ((body.indexOf("403 Forbidden") != -1) || (body.indexOf("needverify") != -1)){
                _.pullAt(proxies, proxyIndex);
                console.log("Num of proxies: " + proxies.length);
            } else {
                console.error("Retry", id, httpProxy, s);
                q.push(data, queueCallback);
            }

            callback(valid);
        }
        catch (err) {
            _.pullAt(proxies, proxyIndex);
            console.log("ERROR:" , err, httpProxy);
            q.push(data, queueCallback);
            callback(false);
        }
    });
}, threads);

q.drain = function () {
    console.log('all items have been processed');
};

var codes = _.shuffle(_.map(hotCites, function (city) {
    return city.code;
}));

var id = 0;
var finished = 0;
var error = 0;
var startTime = moment();
_.each(codes, function (depCode) {
    _.each(codes, function (arrCode) {
        if (depCode === arrCode) return;

        for (var day = 2; day <= 30; day++) {
            id++;
            var date = moment().add(day, 'days').format("YYYYMMDD");
            q.push({"id": id, "depCode": depCode, "arrCode": arrCode, "date": date}, queueCallback);
        }
    })
});