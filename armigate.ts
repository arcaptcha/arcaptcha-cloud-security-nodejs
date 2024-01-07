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
    'x-armigate-isbot'?: string;
    'x-armigate-botname'?: string;
    'x-armigate-ruletype'?: string;
}

export default class ARmigate {
    constructor(apiKey: string, url: string, options: Options);

    authCallback(
        req: IncomingMessage,
        resp: ServerResponse,
        validCallBack: (ddHeaders?: DDheaders) => void,
        blockCallBack: (ddHeaders?: DDheaders) => void
    ): void;
}
