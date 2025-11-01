const path = require('path');

const envConfig = {
    development: {
        envPath: path.resolve(__dirname, '../../.env'),
        useFirebaseMock: true
    },
    production: {
        envPath: process.env.ENV_PATH || '.env',
        useFirebaseMock: false
    }
};

module.exports = envConfig[process.env.NODE_ENV || 'development'];
