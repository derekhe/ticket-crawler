var request = require("request");
var async = require('async');

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
        "json": '{"depcity":"PEK", "arrcity":"CTU", "flightdate":"20160531", "adultnum":"1", "childnum":"0", "infantnum":"0", "cabinorder":"0", "airline":"1", "flytype":"0", "international":"0", "action":"0", "segtype":"1", "cache":"0", "preUrl":"", "isMember":""}'
    }
};

var q = async.queue(function (id, callback) {
    request(options, function (error, response, body) {
        callback();
        if (error) throw new Error(error);

        //console.log(JSON.parse(body));
        console.log(body);
    });
}, 2);

q.drain = function () {
    console.log('all items have been processed');
};

for (var i = 0; i < 100; i++) {
    q.push(i, function (error) {
        console.log(error);
    });
}