/*jslint node: true, sloppy: true */

/*
Run this on pi endpoints with server URL and pair id as parameters
Example: $ node piloveclient.js www.pilove.com pairname
*/

var dgram = require('dgram'),
    http = require('http'),
    socket = dgram.createSocket('udp4'),
    serverAddress = process.argv[2],
    resourceName = process.argv[3],
    peerAddress,
    port,
    lastReceived = 0,
    lastSent = 0,
    simultaneousResolution = 5000, // Interval to determine if touches are simultaneous in milliseconds
    serverPort = 40001,
    GPIO = require('onoff').Gpio,
    led = new GPIO(18, 'out'),
    button = new GPIO(17, 'in', 'both');

/*
From http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js#8440736
Answer by http://stackoverflow.com/users/1088990/nodyou
*/
function getLocalIPs() {
    "use strict";

    var os = require('os'),
        ifaces = os.networkInterfaces(),
        ips = [];

    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;

        ifaces[ifname].forEach(function (iface) {
            if (iface.family !== 'IPv4' || iface.internal) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }

            if (alias >= 1) {
                // this single interface has multiple ipv4 addresses
                ips.push(iface.address);
            } else {
                // this interface has only one ipv4 adress
                ips.push(iface.address);
            }
            alias += 1;
        });
    });
    return ips;
}

function send(msg) {
    var now = +(new Date());
    /* There should be 3 types of messages
        * touch (t)
        * confirm (c+ping id)
        * ping (integer ping id)
       Confirm and ping are yet to be implemented
    */
    msg = msg || (Math.floor(Math.random() * 65536)).toString(10);
    socket.send(msg, 0, msg.length, port, peerAddress, function (err) {
        if (err) {
            console.log(err);
            getSocketFromServer(init);
            return;
        }

        if (msg && msg.slice(0, 1) === 't') {
            if (lastReceived && lastReceived + simultaneousResolution > now) {
                console.log('simultaneous touch');
                flash();
            }
            lastSent = now;
        }
    });
}

function light(duration) {
    led.writeSync(1);
    setTimeout(function () {
        led.writeSync(0);
    }, duration);
}

function flash() {
    led.writeSync(0)
    led.writeSync(1);
    setTimeout(function () {
        led.writeSync(0);
    }, 100);
    setTimeout(function () {
        led.writeSync(1);
    }, 200);
    setTimeout(function () {
        led.writeSync(0);
    }, 300);
    setTimeout(function () {
        led.writeSync(1);
    }, 400);
    setTimeout(function () {
        led.writeSync(0);
    }, 500);
    setTimeout(function () {
        led.writeSync(1);
    }, 600);
    setTimeout(function () {
        led.writeSync(0);
    }, 700);
    setTimeout(function () {
        led.writeSync(1);
    }, 800);
    setTimeout(function () {
        led.writeSync(0);
    }, 900);
    setTimeout(function () {
        led.writeSync(1);
    }, 1000);
    setTimeout(function () {
        led.writeSync(0);
    }, 1100);
}

function receive(message) {
    var msg = message.toString('utf8'),
        now = +(new Date());

    if (msg && msg.slice(0, 1) === 't') {
        if (lastSent && lastSent + simultaneousResolution > now) {
            console.log('simultaneous touch');
            flash();
        } else {
            console.log('touch received');
            light(2000);
        }
        lastReceived = now;

    } else if (msg && msg.slice(0, 1) === 'c') {
        console.log('touch confirmed');
    } else {
        console.log('ping received. id:', msg);
    }
}

function getSocketFromServer(callback) {
    // HTTP req
    // get ip and port from serverAddress
    if (!serverAddress || !resourceName) {
        throw 'Must include parameters for server and pair id.';
    }

    var options = {
            hostname: serverAddress,
            port: serverPort,
            path: '/' + resourceName,
            headers: {
                'x-forwarded-for': getLocalIPs().join(', ')
            }
        },
        responseData = '',
        status,
        pollingTime = 20000,
        req;

    // pass local ip in X-Forwarded-For
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
    button.watch(function (err, status) {
        if (status) {
            send('touch');
        }
    });

    socket.bind(port, '0.0.0.0');

    // Send a request to the router so it forwards incoming UDP messages to this process
    socket.send('', 0, 0, port, peerAddress, function (err) {
        if (err) {
            throw err;
        }
        console.log('Receiving UDP from ' + peerAddress + ' over port:' + port);

        // crude repeating ping to keep connection open
        setInterval(send, 30000);
    });

    socket.on('message', function (message, remote) {
        receive(message, remote);
    });
}

getSocketFromServer(init);
