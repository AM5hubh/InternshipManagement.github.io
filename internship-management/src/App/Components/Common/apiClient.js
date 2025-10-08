import axios from 'axios';
import common from '../../../common';
import config from '../../../config';

const instance = axios.create({
    baseURL: config.API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// attach token before requests
instance.interceptors.request.use((cfg) => {
    const jwt = common.getCookieJWT();
    if (jwt) cfg.headers['Authentication'] = 'bearer ' + jwt;
    return cfg;
});

export default {
    get: (url, config) => instance.get(url, config),
    post: (url, data, config) => instance.post(url, data, config),
    patch: (url, data, config) => instance.patch(url, data, config),
    // helper for downloading binary (pdf)
    getBlob: (url) => instance.get(url, { responseType: 'blob' })
}
