const Client = require('castv2').Client;
const mdns = require('mdns');

const {getRequestId} = require('./requestId');

const CHROMECAST_NAME = process.env.CHROMECAST_NAME || 'Boiler Room Basement';

function getCurrentPlaying() {
    return connect(CHROMECAST_NAME)
        .then(onConnect)
        .then(onReceive)
        .then(parseMedia)
}

function connect(chromecastName) {
    return new Promise(function (resolve, reject) {
        const timeout = setTimeout(function() {
            reject('Cannot find chromecast');
        }, 10000);
        const browser = mdns.createBrowser(mdns.tcp('googlecast'));
        browser.on('serviceUp', function (service) {
            if (service.txtRecord.fn === chromecastName) {
                console.log('Found the chromecast');
                browser.stop();
                clearTimeout(timeout);

                const client = new Client();
                client.connect(service.addresses[0], () => resolve(client));
            }
        });
        browser.start();
    });
}


function onConnect(client) {
    const connection = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.tp.connection', 'JSON');
    const heartbeat = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.heartbeat', 'JSON');
    const receiver = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.receiver', 'JSON');

    connection.send({type: 'CONNECT'});
    heartbeat.send({type: 'PING'});
    receiver.send({type: 'GET_STATUS', requestId: getRequestId()});

    return new Promise(function (resolve, reject) {
        receiver.on('message', data => resolve({client, data}));
    })
}

function onReceive({client, data}) {
    return new Promise(function (resolve, reject) {
        if (!data.status.applications) {
            reject('No application data');
        }

        const appID = data.status.applications[0].transportId;

        const mediaConnection = client.createChannel('client-17558', appID, 'urn:x-cast:com.google.cast.tp.connection', 'JSON');
        const media = client.createChannel('client-17558', appID, 'urn:x-cast:com.google.cast.media', 'JSON');

        mediaConnection.send({type: 'CONNECT'});
        media.send({type: 'GET_STATUS', requestId: getRequestId()});
        media.on('message', resolve);
    })
}

function parseMedia(songInfo) {
    const status = songInfo && songInfo.status[0];
    const state = status.playerState && status.playerState.toLowerCase();
    const media = status && status.media;
    const {contentId, contentType, metadata} = media || {metadata: {}};
    const {title, artist, images} = metadata;
    const image = (images || [{}])[0].url;
    console.log(`Now ${state}: ${title} — ${artist} (${contentId}) (${contentType}) (${image})`);
    return {
        state,
        contentType,
        contentId,
        title,
        artist,
        image
    };
}

module.exports = {
    getCurrentPlaying
};