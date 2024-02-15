import bunyan = require('bunyan');

export default bunyan.createLogger({
    name: 'GitHub Hook Manager',
    streams: [
        {
            level: 'info',
            path: './hooks.log',
        },
        {
            level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info',
            stream: process.stdout,
        },
    ],
});
