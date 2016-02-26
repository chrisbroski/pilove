/*jslint node: true, sloppy: true */

/*
Run this on pi endpoints with server URL and pair id as parameters
Example: $ node piloveclient.js www.pilove.com pairname
*/

var dgram = require('dgram'),
    readline = require('readline'),
    http = require('http'),
    socket = dgram.createSocket('udp4'),
    serverAddress = process.argv[2],
    resourceName = process.argv[3],
    peerAddress,
    port,
    lastReceived = 0,
    lastSent = 0,
    simultaneousResolution = 5000, // Interval to determine if touches are simultaneous in milliseconds
    rl = readline.createInterface(process.stdin, process.stdout);

function send(msg) {
    var now = +(new Date());
    /* There should be 3 types of messages
        * touch
        * confirm
        * ping
       Confirm and ping are yet to be implemented
    */
    socket.send(msg, 0, msg.length, port, peerAddress, function (err) {
        if (err) {
            console.log(err);
            getSocketFromServer(init);
            return;
        }

        if (msg === 'touch') {
            if (lastReceived && lastReceived + simultaneousResolution > now) {
                console.log('simultaneous touch');
            }
            lastSent = now;
        }
        //console.log('Sent message to ' + peerAddress + ":" + port + " at " + now);
        rl.prompt();
    });
}

function receive(message) {
    var msg = message.toString('utf8'),
        now = +(new Date());

    if (msg === 'touch') {
        if (lastSent && lastSent + simultaneousResolution > now) {
            console.log('simultaneous touch');
        } else {
            console.log('touch received');
        }
        lastReceived = now;

    } else if (msg === 'confirm') {
        console.log('touch confirmed');
    } else {
        console.log('ping received');
    }
    rl.prompt();
}

function getSocketFromServer(callback) {
    // HTTP req
    // get ip and port from serverAddress
    if (!serverAddress || !resourceName) {
        throw 'Must include parameters for server and pair id.';
    }

    var options = {hostname: serverAddress, port: 40000, path: '/' + resourceName},
        responseData = '',
        status,
        pollingTime = 6000,
        req;

    req = http.request(options, function (res) {
        console.log('STATUS: ', res.statusCode);
        status = res.statusCode;

        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            responseData += chunk;
        });
        res.on('end', function () {
            if (status === 200) {
                callback.call(this, JSON.parse(responseData));
            } else {
                setTimeout(function () {
                    getSocketFromServer(init);
                }, pollingTime);
                console.log('No pair found yet. Trying again in ' + (pollingTime / 60000).toFixed(1) + ' minutes.');
            }
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ', e.message);
    });

    req.end();
}

function init(socketInfo) {
    console.log(socketInfo);

    peerAddress = socketInfo.ip;
    port = socketInfo.port;

    socket.bind(port, '0.0.0.0');

    // Send a request to the router so it forwards incoming UDP messages to this process
    socket.send('', 0, 0, port, peerAddress, function (err) {
        if (err) {
            throw err;
        }
        console.log('Receiving UDP from ' + peerAddress + ' over port:' + port);

        // Set up command line interface for messages
        rl.setPrompt('PUNCH> ');
        rl.prompt();
        rl.on('line', function (line) {
            send(line);
        });
    });

    socket.on('message', function (message, remote) {
        receive(message, remote);
    });
}

getSocketFromServer(init);
