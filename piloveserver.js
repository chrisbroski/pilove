/*jslint node: true, sloppy: true */

var express = require('express'),
    app = express(),
    data = {},
    serverPort = 40001;

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
From:
http://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript#answer-16436975
*/
function arraysEqual(a, b) {
    var ii, len = a.length;
    if (a === b) {
        return true;
    }
    if (a == null || b == null) {
        return false;
    }
    if (len != b.length) {
        return false;
    }

    a.sort();
    b.sort();
    for (ii = 0; ii < len; ii += 1) {
        if (a[ii] !== b[ii]) {
            return false;
        }
    }
    return true;
}

function getLanIp(remoteAddress, localIPs) {
    if (localIPs.length = 1) {
        return localIPs[0];
    }
    /*
    Put logic to figure out which IP is better here
    */
    return localIPs[0];
}

function clientEquals(client1Addr, client1LocalIPs, client2Addr, client2LocalIPs) {
    if (client1Addr !== client2Addr) {
        return false;
    }
    if (!arraysEqual(client1LocalIPs, client2LocalIPs)) {
        return false;
    }
    return true;
}

function saveSocket(name, addr, localIPs) {
    console.log('saveSocket:', name, addr, localIPs);
    if (!data[name] || (!data[name].ip1 && !data[name].ip2)) {
        data[name] = {ip1: addr, ip2: '', localIp1: localIPs, localIp2: [], port: randomPort()};
        console.log('New pair started id:' + name + ' ip:' + addr + ' local:', localIPs);
        return;
    }

    if (!data[name].ip2) {
        if (!clientEquals(addr, localIPs, data[name].ip1, data[name].localIp1)) {
            data[name].ip2 = addr;
            data[name].localIp2 = localIPs;
            console.log('Paired ' + data[name].ip1 + ' to ' + data[name].ip2 + ' on port ' + data[name].port);
        }
        return;
    }
    if (clientEquals(addr, localIPs, data[name].ip2, data[name].localIp2)) {
        return;
    }
    if (clientEquals(addr, localIPs, data[name].ip1, data[name].localIp1)) {
        return;
    }
    data[name].ip1 = addr;
    data[name].ip2 = '';
    data[name].localIp1 = localIPs;
    data[name].localIp2 = [];
    data[name].port = randomPort();

/*
If the remoteAddress = 127.0.0.1, the server and client are running on the same boxes
    Use the LAN IP:
    if (addr === '127.0.0.1') {
        addr = iPv6ToIPv4(getLocalIPs()[0]);
    }

If the remoteAddress are the same, either it is the same end point, or both are in the same LAN
    Check localIPs to know the difference
    If the localIPs are different, use the local IPs as the connection addresses
        If there is more than 1 local address, match the ones with the same range
*/
}

function getOtherSocket(name, addr, localIPs) {
/*
If an IP is present, send the other IP (200)
If The other IP is not there, send blank (202)
If there are two IPs but the requesting IP is not one, erase all and 202
*/
    var socketInfo = {ip: '', port: data[name].port, status: 200};
    if (data[name].ip1 && data[name].ip2) {
        if (clientEquals(addr, localIPs, data[name].ip1, data[name].localIp1)) {
            socketInfo.ip = data[name].ip2;
            if (socketInfo.ip === '127.0.0.1' || data[name].ip1 === data[name].ip2) {
                socketInfo.ip = getLanIp('127.0.0.1', data[name].localIp2);
            }
        } else {
            socketInfo.ip = data[name].ip1;
            if (socketInfo.ip === '127.0.0.1' || data[name].ip1 === data[name].ip2) {
                socketInfo.ip = getLanIp('127.0.0.1', data[name].localIp1);
            }
        }
        console.log('socket info:', socketInfo);
        return socketInfo;
    }
    socketInfo.status = 202;
    console.log('socket info:', socketInfo);
    return socketInfo;
}

function createConnection(name, addr, localIPs) {
    var responseData;
    saveSocket(name, addr, localIPs);
    responseData = getOtherSocket(name, addr, localIPs);
    return [{ip: responseData.ip, port: responseData.port}, responseData.status];
}

function parseClientIPs(forwardedIPs) {
    var arrayIP;
    if (!forwardedIPs) {
        return [];
    }
    arrayIP = forwardedIPs.split(', ');
    arrayIP.map(function (ip) {
        return iPv6ToIPv4(ip);
    });
    return arrayIP;
}

app.get('/(:id)', function (req, res) {
    var namedData;
    if (req.params.id !== 'favicon.ico') {
        res.setHeader('Cache-Control', 'max-age=0,no-cache,no-store,post-check=0,pre-check=0');
        namedData = createConnection(req.params.id, iPv6ToIPv4(req.connection.remoteAddress), parseClientIPs(req.headers['x-forwarded-for']));
        res.statusCode = namedData[1];
        res.json(namedData[0]);
    } else {
        res.status = 404;
        res.end();
    }
});

app.listen(serverPort, function () {
    // This should use port 80 when on a production server
    console.log('Server started on port ' + serverPort);
});
