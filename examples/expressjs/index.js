const ARCaptcha = require("../../arcaptcha");


const express = require("express");
const app = express();
const isInProd = process.env.NODE_ENV === 'production';

const config = require(`./config.${isInProd ? 'production' : 'development'}.json`);

const arcaptchaClient = new ARCaptcha(config.key, config.api, config.options);

app.use(function (req, resp, next) {
    arcaptchaClient.authCallback(
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

app.get("/", function (req, res) {
    console.log(req.socket.remoteAddress);
    res.send("Hello World");
});

app.listen(3000, '0.0.0.0');