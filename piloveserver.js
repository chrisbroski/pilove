/*jslint node: true, sloppy: true */

var express = require('express'),
    app = express(),
    data = {};

function randomPort() {
    // What if the ports are already in use?
    return Math.floor(Math.random() * 1196) + 43124;
}

function otherIP(name, ip) {
    if (data[name].ip1 === ip) {
        return data[name].ip2;
    }
    return data[name].ip1;
}

function iPv6ToIPv4(IP) {
    if (IP.slice(0, 7) === '::ffff:') {
        return IP.slice(7);
    }
    return IP;
}

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

/*
If an IP is present, send the other IP (200)
If The other IP is not there, send blank (202)
If there are two IPs but the requesting IP is not one, erase all and 202
*/
function createConnection(name, addr) {
    // If the server is being hosted on the same box as a client
    // This is only needed for the testing phase
    if (addr === '127.0.0.1') {
        addr = iPv6ToIPv4(getLocalIPs()[0]);
    }
    if (data[name]) {
        if (data[name].ip1 && data[name].ip2) {
            if (data[name].ip1 === addr || data[name].ip2 === addr) {
                return [{ip: otherIP(name, addr), port: data[name].port}, 200];
            }
            data[name].ip1 = addr;
            data[name].ip2 = '';
            data[name].port = randomPort();
            return [{ip: '', port: data[name].port}, 202];
        }
        if (data[name].ip1 === addr) {
            return [{ip: '', port: data[name].port}, 202];
        }
        data[name].ip2 = addr;
        return [{ip: data[name].ip1, port: data[name].port}, 200];
    }
    data[name] = {ip1: addr, ip2: '', port: randomPort()};
    return [{ip: '', port: data[name].port}, 202];
}

app.get('/(:id)', function (req, res) {
    var namedData;
    if (req.params.id !== 'favicon.ico') {
        res.setHeader('Cache-Control', 'max-age=0,no-cache,no-store,post-check=0,pre-check=0');
        namedData = createConnection(req.params.id, iPv6ToIPv4(req.connection.remoteAddress));
        res.statusCode = namedData[1];
        res.json(namedData[0]);
    } else {
        res.status = 404;
        res.end();
    }
});

app.listen(40000, function () {
    // This should use port 80 when on a production server
    console.log('Server started: http://localhost:40000/');
});
