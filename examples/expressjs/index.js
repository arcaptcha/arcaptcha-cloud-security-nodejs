const ARCaptcha = require("../../arcaptcha");

const express = require("express");
const app = express();

const arcaptchaClient = new ARCaptcha("arefkharegavemane", "127.0.0.1", { ssl: false, port: 8010 });

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
    res.send("Hello World");
});

app.listen(3000, '0.0.0.0');