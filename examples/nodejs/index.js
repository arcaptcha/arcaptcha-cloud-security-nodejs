const ARCaptcha = require("../../arcaptcha");
const http = require("http");

const hostname = "127.0.0.1";
const port = 3000;

const arcaptchaClient = new ARCaptcha("arefkharegavemane", "127.0.0.1", { ssl: false, port: 8010 })
    .on("blocked", function (req) {
        console.log("blocked");
        // console.log("ARCaptcha blocked this request");
    })
    .on("valid", function (req, res) {
        // console.log("ARCaptcha passed this request");
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.end("Hello World\n");
    });

const server = http.createServer((req, res) => {
    arcaptchaClient.auth(req, res);
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});