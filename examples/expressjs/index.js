const ARmigate = require("../../armigate");


const express = require("express");
const app = express();
app.use(express.json());
const isInProd = process.env.NODE_ENV === 'production';

const config = require(`./config.${isInProd ? 'production' : 'development'}.json`);

const ARmigateClient = new ARmigate(config.key, config.api, config.options);

app.use(function (req, resp, next) {
    console.log(Object.keys(req));
    ARmigateClient.authCallback(
        req,
        resp,
        function (data) {
            // apiserver passed request, move forward
            next();
        },
        function () {
            // resp.send('Blocked')
        }
    );
});

app.post("/", function (req, res) {
    console.log(req.socket.remoteAddress);
    res.send("Hello World");
});

app.listen(3000, '0.0.0.0');