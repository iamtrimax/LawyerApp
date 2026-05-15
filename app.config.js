require('dotenv/config');

module.exports = ({ config }) => {
    return {
        ...config,
        extra: {
            ...(config.extra || {}),
            apiUrl: process.env.EXPO_PUBLIC_API_URL,
            cloudName: process.env.EXPO_PUBLIC_CLOUD_NAME,
        },
    };
};
