/// <reference types="node" />

import {
    IncomingMessage,
    ServerResponse,
} from 'http'

interface Logger {
    debug(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
}

export interface Options {
    ssl?: boolean;
    port?: number;
    path?: string;
    timeout?: number;
    uriRegex?: RegExp;
    uriRegexExclusion?: RegExp;
    logger?: Logger;
}

export interface DDheaders {
    'x-arcaptcha-isbot'?: string;
    'x-arcaptcha-botname'?: string;
    'x-arcaptcha-ruletype'?: string;
}

export default class ARCaptcha {
    constructor(apiKey: string, url: string, options: Options);

    authCallback(
        req: IncomingMessage,
        resp: ServerResponse,
        validCallBack: (ddHeaders?: DDheaders) => void,
        blockCallBack: (ddHeaders?: DDheaders) => void
    ): void;
}
