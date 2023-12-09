const os = require('os');
const url = require('url');
const http = require('http');
const https = require('https');
const querystring = require('querystring');
const EventEmitter = require('events');
const extend = require('util')._extend;

const { moduleName, moduleVersion } = require('./lib/metadata.js');

const defaultParams = {
    ssl: true,
    port: 443,
    path: '/validate-request/',
    timeout: 150,
    uriRegex: null,
    uriRegexExclusion:
        /\.(avi|flv|mka|mkv|mov|mp4|mpeg|mpg|mp3|flac|ogg|ogm|opus|wav|webm|webp|bmp|gif|ico|jpeg|jpg|png|svg|svgz|swf|eot|otf|ttf|woff|woff2|css|less|js)$/,
    logger: console,
};

/**
 * @typedef {object} Params
 * @property {string} nonce - Nonce to be injected to the HTML body of block responses returned by the module.
 */

module.exports = class ARCaptchaClient extends EventEmitter {
    constructor(apiKey, endPoint, params = {}) {
        super();
        this.apiKey = apiKey;
        this.endPoint = endPoint;

        const finalParams = extend(defaultParams, params);

        this.timeout = finalParams['timeout'];
        this.uriRegex = finalParams['uriRegex'];
        this.uriRegexExclusion = finalParams['uriRegexExclusion'];
        this.logger = finalParams['logger'];
        this.hostname = os.hostname();

        this.options = {
            host: this.endPoint,
            port: finalParams['port'],
            path: finalParams['path'],
            method: 'POST',
            keepAlive: true,
            headers: {
                Connection: 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        };

        if (finalParams['ssl']) {
            this.connection = https;
        } else {
            this.connection = http;
        }

        this.options.agent = new this.connection.Agent(this.options);
    }

    /**
     * Handles authentication callback logic.
     * To be used with the Express framework.
     * @param {IncomingMessage} req - The request object.
     * @param {ServerResponse} resp - The response object.
     * @param {function(): void} validCallback - The callback function to invoke when the request is valid.
     * @param {function(object.<string, string>): void} blockCallback - The callback function to invoke when the request is blocked. Takes a dictionary containing enriched headers returned by the ARCaptcha API.
     * @param {Params} params - Additional parameters.
     */
    authCallback(req, resp, validCallback, blockCallback, params = {}) {
        const requestUrl = req.url || req.baseUrl || '/';
        const pathname = url.parse(requestUrl).pathname;

        if (this.uriRegexExclusion !== null) {
            if (this.uriRegexExclusion.test(pathname) !== false) {
                validCallback();
                return;
            }
        }

        if (this.uriRegex !== null) {
            if (this.uriRegex.test(pathname) === false) {
                validCallback();
                return;
            }
        }

        const clientIdAndCookiesLength = getClientIdAndCookiesLength(req);
        const hasClientIdHeader =
            typeof req.headers['x-arcaptcha-clientid'] !== 'undefined';

        const requestData = {
            Key: this.apiKey,
            RequestMo   uleName: moduleName,
            ModuleVersion: moduleVersion,
            ServerName: truncateHeaderToSize(this.hostname, 512),
            APIConnectionState: 'new',
            IP: req.socket.remoteAddress,
            Port: req.socket.remotePort,
            TimeRequest: getCurrentMicroTime(),
            Protocol: req.connection.encrypted ? 'https' : 'http',
            Method: req.method,
            ServerHostname: truncateHeaderToSize(req.headers['host'], 512),
            Request: truncateHeaderToSize(requestUrl, 2048),
            HeadersList: truncateHeaderToSize(getHeadersList(req), 512),
            Host: truncateHeaderToSize(req.headers['host'], 512),
            UserAgent: truncateHeaderToSize(req.headers['user-agent'], 768),
            Referer: truncateHeaderToSize(req.headers['referer'], 1024),
            Accept: truncateHeaderToSize(req.headers['accept'], 512),
            AcceptEncoding: truncateHeaderToSize(
                req.headers['accept-encoding'],
                128
            ),
            AcceptLanguage: truncateHeaderToSize(
                req.headers['accept-language'],
                256
            ),
            AcceptCharset: truncateHeaderToSize(
                req.headers['accept-charset'],
                128
            ),
            Origin: truncateHeaderToSize(req.headers['origin'], 512),
            XForwardedForIP: truncateHeaderToSize(
                req.headers['x-forwarded-for'],
                -512
            ),
            'X-Requested-With': truncateHeaderToSize(
                req.headers['x-requested-with'],
                128
            ),
            Connection: truncateHeaderToSize(req.headers['connection'], 128),
            Pragma: truncateHeaderToSize(req.headers['pragma'], 128),
            CacheControl: truncateHeaderToSize(
                req.headers['cache-control'],
                128
            ),
            ContentType: truncateHeaderToSize(req.headers['content-type'], 128),
            From: truncateHeaderToSize(req.headers['from'], 128),
            'X-Real-IP': truncateHeaderToSize(req.headers['x-real-ip'], 128),
            Via: truncateHeaderToSize(req.headers['via'], 256),
            TrueClientIP: truncateHeaderToSize(
                req.headers['true-client-ip'],
                128
            ),
            CookiesLen: clientIdAndCookiesLength.cookiesLength,
            AuthorizationLen: getAuthorizationLength(req),
            PostParamLen: req.headers['content-length'],
            ClientID: hasClientIdHeader
                ? truncateHeaderToSize(req.headers['x-arcaptcha-clientid'], 128)
                : truncateHeaderToSize(clientIdAndCookiesLength.clientId, 128),
            SecCHUA: truncateHeaderToSize(req.headers['sec-ch-ua'], 128),
            SecCHUAArch: truncateHeaderToSize(
                req.headers['sec-ch-ua-arch'],
                16
            ),
            SecCHUAFullVersionList: truncateHeaderToSize(
                req.headers['sec-ch-ua-full-version-list'],
                256
            ),
            SecCHUAPlatform: truncateHeaderToSize(
                req.headers['sec-ch-ua-platform'],
                32
            ),
            SecCHUAModel: truncateHeaderToSize(
                req.headers['sec-ch-ua-model'],
                128
            ),
            SecCHUAMobile: truncateHeaderToSize(
                req.headers['sec-ch-ua-mobile'],
                8
            ),
            SecCHDeviceMemory: truncateHeaderToSize(
                req.headers['sec-ch-device-memory'],
                8
            ),
        };

        const postData = querystring.stringify(requestData);

        const requestOptions = hasClientIdHeader
            ? Object.assign({}, this.options, {
                headers: Object.assign(
                    { 'X-ARCaptcha-X-Set-Cookie': 'true' },
                    this.options.headers
                ),
            })
            : this.options;
        const logger = this.logger;

        let finished = false;

        this.connection
            .request(requestOptions, function (apiResp) {
                apiResp.setEncoding('utf8');

                let body = '';

                apiResp.on('data', function (chunk) {
                    body = body + chunk;
                });

                apiResp.on('error', (err) => {
                    if (finished) {
                        return;
                    }
                    finished = true;

                    logger.error(
                        'ARCaptcha: Error retrieving the response from arcaptcha, request skipped'
                    );
                    validCallback();
                    return;
                });

                apiResp.on('end', function () {
                    if (finished) {
                        return;
                    }
                    finished = true;

                    if (
                        apiResp.headers['x-arcaptcharesponse'] !=
                        apiResp.statusCode
                    ) {
                        logger.error(
                            'ARCaptcha: Invalid X-ARCaptchaResponse header, is it ApiServer response?'
                        );
                        validCallback();
                        return;
                    }

                    // Gather 'x-arcaptcha-request-headers' into an object to pass information outside of the middleware
                    const ddRequestHeaders = getARCaptchaRequestHeaders(apiResp);

                    switch (apiResp.statusCode) {
                        case 301:
                        case 302:
                        case 403:
                        case 401:
                            executeARCaptchaHeaders(apiResp, resp);
                            resp.statusCode = apiResp.statusCode;
                            if (params.nonce) {
                                body = addNonceToResponseBody(
                                    body,
                                    params.nonce
                                );
                            }
                            resp.end(body);
                            blockCallback(ddRequestHeaders);
                            return;

                        case 200:
                            executeARCaptchaHeaders(apiResp, resp);
                            executeARCaptchaRequestHeaders(apiResp, req);
                            validCallback(ddRequestHeaders);
                            return;

                        default:
                            validCallback();
                            return;
                    }
                });
            })
            .setTimeout(this.timeout, function () {
                if (finished) {
                    return;
                }
                finished = true;

                logger.error(
                    'ARCaptcha: Timeout happened with connection to arcaptcha, request skipped'
                );
                validCallback();
            })
            .on('error', (err) => {
                if (finished) {
                    return;
                }
                finished = true;

                logger.error(
                    'ARCaptcha: Error establishing the connection to arcaptcha, request skipped'
                );
                validCallback();
            })
            .end(postData);
    }

    /**
     * Verifies requests and emits either a "valid" or "blocked" event
     * depending on the outcome of the validation.
     * To be used for integrations with a simple HTTP server.
     * @param {IncomingMessage} req - The request object.
     * @param {ServerResponse} resp - The response object.
     * @param {function(): void} validCallback - The callback function to invoke when the request is valid.
     * @param {function(object.<string, string>): void} blockCallback - The callback function to invoke when the request is blocked. Takes a dictionary containing enriched headers returned by the ARCaptcha API.
     * @param {Params} params - Additional parameters.
     */
    auth(req, resp, params) {
        const arcaptchaAuthEvent = this;

        this.authCallback(
            req,
            resp,
            function (ddHeaders) {
                arcaptchaAuthEvent.emit('valid', req, resp, ddHeaders);
            },
            function (ddHeaders) {
                arcaptchaAuthEvent.emit('blocked', req, ddHeaders);
            },
            params
        );
    }
};

function getCurrentMicroTime() {
    return new Date().getTime() * 1000;
}

function getHeadersList(req) {
    return [...Object.keys(req.headers)].join(',');
}

function getAuthorizationLength(request) {
    const authorization = request.headers['authorization'];
    return authorization === undefined ? null : authorization.length;
}

function getClientIdAndCookiesLength(request) {
    const cookiesParse = (str) => {
        var obj = {};

        const tryDecode = (str) => {
            try {
                return decodeURIComponent(str);
            } catch (e) {
                return str;
            }
        };

        str.split(/; */).forEach(function (pair) {
            var eq_idx = pair.indexOf('=');
            if (eq_idx > 0) {
                var key = pair.substr(0, eq_idx).trim();
                var val = pair.substr(++eq_idx, pair.length).trim();

                // quoted values
                if ('"' == val[0]) {
                    val = val.slice(1, -1);
                }

                // only assign once
                if (undefined == obj[key]) {
                    obj[key] = tryDecode(val);
                }
            }
        });

        return obj;
    };

    const cookies = request.headers['cookie'];

    var clientId = null;
    var cookiesLength = 0;

    if (cookies !== undefined) {
        const parsed = cookiesParse(cookies);

        Object.keys(parsed).forEach(function (name) {
            const value = parsed[name];
            cookiesLength += value.length;
            if (name === 'arcaptcha') {
                clientId = value;
            }
        });
    }

    return {
        clientId: clientId,
        cookiesLength: cookiesLength,
    };
}

function executeARCaptchaHeaders(req, resp) {
    const arcaptchaHeadersStr = req.headers['x-arcaptcha-headers'];
    if (arcaptchaHeadersStr === undefined) {
        return;
    }
    arcaptchaHeadersStr.split(' ').forEach(function (arcaptchaHeaderName) {
        const arcaptchaHeaderValue =
            req.headers[arcaptchaHeaderName.toLowerCase()];
        if (arcaptchaHeaderValue === undefined) {
            return;
        }
        if (arcaptchaHeaderName == 'Set-Cookie') {
            var headerValues = [];
            if (resp.hasHeader(arcaptchaHeaderName)) {
                headerValues = resp.getHeader(arcaptchaHeaderName);
            }
            resp.setHeader(
                arcaptchaHeaderName,
                [arcaptchaHeaderValue].concat(headerValues)
            );
        } else {
            resp.setHeader(arcaptchaHeaderName, arcaptchaHeaderValue);
        }
    });
}

function executeARCaptchaRequestHeaders(apiReq, req) {
    const arcaptchaHeadersStr = apiReq.headers['x-arcaptcha-request-headers'];
    if (arcaptchaHeadersStr === undefined) {
        return;
    }
    arcaptchaHeadersStr.split(' ').forEach(function (name) {
        const arcaptchaHeaderName = name.toLowerCase();
        const arcaptchaHeaderValue = apiReq.headers[arcaptchaHeaderName];
        if (arcaptchaHeaderValue === undefined) {
            return;
        }
        req.headers[arcaptchaHeaderName] = arcaptchaHeaderValue;
    });
}

/**
 * Extract enriched headers for client requests
 *
 * @param { http.ServerResponse } apiResp
 * @return { object.<string, string> } Header names listed by the "x-arcaptcha-request-headers" response header and their values
 */
function getARCaptchaRequestHeaders(apiResp) {
    const ddHeaders = apiResp.headers['x-arcaptcha-request-headers'];
    if (ddHeaders === undefined) {
        return;
    }
    let ddRequestHeaders = {};
    ddHeaders
        .split(' ')
        .map((name) => name.toLowerCase())
        .filter((ddName) => apiResp.headers[ddName])
        .forEach(
            (ddName) => (ddRequestHeaders[ddName] = apiResp.headers[ddName])
        );
    return ddRequestHeaders;
}

/**
 * Helper method to truncate a string to a given size (if possible)
 * @param {string} headerValue
 * @param {number} size
 * @returns {string} Input truncated to desired size or an empty string if the input is invalid
 * */
function truncateHeaderToSize(headerValue, size) {
    if (headerValue == null || typeof headerValue !== 'string') {
        return '';
    }
    if (size < 0) {
        // truncate from the end
        return headerValue.slice(size);
    } else {
        return headerValue.slice(0, size);
    }
}

/**
 * Adds a nonce attribute to script and style tags within our response HTML body.
 * @param {string} htmlBody - The HTML body content as a string.
 * @param {string} nonce - The nonce value to be added as an attribute.
 * @returns {string} The modified HTML body with nonce attributes added.
 */
function addNonceToResponseBody(htmlBody, nonce) {
    return htmlBody
        .replace(/<script/g, `<script nonce="${nonce}" `)
        .replace(/<style/g, `<style nonce="${nonce}" `);
}
