var request = require("request");
var async = require('async');
var Agent = require('socks5-http-client/lib/Agent');
var moment = require('moment');
var hotCites = require('./hotcity.json');
var _ = require('lodash');

var threads = 40;
var q = async.queue(function (data, callback) {
    var depCode = data.depCode;
    var arrCode = data.arrCode;
    var date = data.date;
    var id = data.id;

    var port = (id % threads);
    var options = {
        method: 'POST',
        url: 'http://b2c.csair.com/B2C40/query/jaxb/direct/query.ao',
        headers: {
            'postman-token': 'd66078de-9f4e-ddc1-2ddd-7c2e9af7ff09',
            'cache-control': 'no-cache',
            'accept-language': 'en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4,zh-TW;q=0.2',
            'content-type': 'application/x-www-form-urlencoded',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36',
            origin: 'http://b2c.csair.com',
            accept: 'application/json, text/javascript, */*; q=0.01'
        },
        form: {
            "json": `{"depcity":"${depCode}", "arrcity":"${arrCode}", "flightdate":"${date}", "adultnum":"1", "childnum":"0", "infantnum":"0", "cabinorder":"0", "airline":"1", "flytype":"0", "international":"0", "action":"0", "segtype":"1", "cache":"0", "preUrl":"", "isMember":""}`
        },
        agentClass: Agent,
        agentOptions: {
            socksHost: "107.170.8.79",
            socksPort: 2000 + port
        }
    };

    console.log(data);

    request(options, function (error, response, body) {
        callback();
        if (error) {
            console.log(error);
            return;
        }

        console.log(id, port, body.substring(1, 20));
    });
}, threads);

q.drain = function () {
    console.log('all items have been processed');
};

var codes = _.map(hotCites, function (city) {
    return city.code;
});

var id = 0;
var finished = 0;
var startTime = moment();
_.each(codes, function (depCode) {
    _.each(codes, function (arrCode) {
        if (depCode === arrCode) return;

        for (var day = 0; day <= 30; day++) {
            id++;
            var date = moment().add(day, 'days').format("YYYYMMDD");
            q.push({"id": id, "depCode": depCode, "arrCode": arrCode, "date": date}, function () {
                finished++;
                var duration = moment.duration(moment() - startTime).as("minutes");
                console.log(`finished: ${finished}, ${finished / duration}`);
            });
        }
    })
});