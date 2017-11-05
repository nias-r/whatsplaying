const faye = require('faye');
const rp = require('request-promise');

const chromecast = require('./chromecast');

const SERVER = process.env.SERVER_URL || 'http://localhost:8000';

const client = new faye.Client(`${SERVER}/pubsub`);

const createDefaultMessage = ({state, title}) => (
    {
        text: `Now ${state}: *${title}*`
    }
);

const createYoutubeMessage = ({state, contentId, title, image}) => (
    {
        text: `Now ${state}: *${title}*`,
        attachments: [
            {
                fallback: `https://www.youtube.com/watch?v=${contentId}`,
                title: `${title} on YouTube`,
                title_link: `https://www.youtube.com/watch?v=${contentId}`,
                image_url: image,
                thumb_url: image
            }
        ]
    }
);

const createSpotifyMessage = ({state, contentId, title, artist, image}) => (
    {
        text: `Now ${state}: *${title}* by *${artist}*`,
        attachments: [
            {
                fallback: contentId,
                title: `${title} by ${artist} on Spotify`,
                title_link: `https://open.spotify.com/${contentId.split(':')[1]}/${contentId.split(':')[2]}`,
                image_url: image,
                thumb_url: image
            }
        ]
    }
)

const messageFormats = {
    'x-youtube/video': createYoutubeMessage,
    'application/x-spotify.track': createSpotifyMessage,
    defaultFormat: createDefaultMessage
};

const getMessageFormat = (contentType) => contentType in messageFormats ? messageFormats[contentType] : messageFormats.defaultFormat;

const createMessage = ({contentType, ...playingInfo}) => getMessageFormat(contentType)(playingInfo);

const createBody = (url, message) => ({
    url: url,
    json: true,
    body: {
        response_type: 'in_channel',
        mrkdwn: true,
        ...message
    }
});

const sendMessage = url => message => rp.post(createBody(url, message));

client.subscribe('/nowplaying', function (message) {
    console.log('Song ID request received');
    const {response_url} = message;
    chromecast.getCurrentPlaying()
        .then(createMessage)
        .catch(err => {
            console.error(err, err.stack || '');
            return {text: `Something is wrong!\n\`${err}\``};
        })
        .then(sendMessage(response_url))
        .catch(console.error);
});