const http = require('http');
const faye = require('faye');
const bodyParser = require('body-parser');
const express = require('express');

const app = express();
const bayeux = new faye.NodeAdapter({mount: '/pubsub', timeout: 45});

const VERIFY_TOKEN = process.env.SLACK_VERIFY_TOKEN;

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use('/webhook', function (req, res, next) {
    if (req.body.token === VERIFY_TOKEN) {
        next();
    } else {
        console.log('Forbidden');
        res.status(403).end('Forbidden');
    }
});

app.post('/webhook', function (req, res) {
    console.log('Request received');
    const {response_url} = req.body;
    bayeux.getClient().publish('/nowplaying', {
        response_url
    });
    res.json({
        response_type: 'in_channel',
    });
});


bayeux.on('handshake', function (clientId) {
    console.log(`Handshake with ${clientId}`);
});

bayeux.on('subscribe', function (clientId, channel) {
    console.log(`${clientId} subscribed to ${channel}`);
});

bayeux.on('unsubscribe', function (clientId, channel) {
    console.log(`${clientId} unsubscribed from ${channel}`);
});

bayeux.on('publish', function (clientId, channel) {
    console.log(`${clientId} published to ${channel}`);
});

const server = http.createServer(app);
bayeux.attach(server);
server.listen(8000);