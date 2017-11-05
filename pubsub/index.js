const http = require('http');
const faye = require('faye');

const server = http.createServer();
const bayeux = new faye.NodeAdapter({mount: '/pubsub', timeout: 45});

bayeux.attach(server);
server.listen(8000);