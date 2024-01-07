const ARmigate = require("../../armigate");
const http = require("http");

const hostname = "127.0.0.1";
const port = 3000;

const ARmigateClient = new ARmigate("arefkharegavemane", "127.0.0.1", { ssl: false, port: 8010 })
    .on("blocked", function (req) {
        console.log("blocked");
        // console.log("ARmigate blocked this request");
    })
    .on("valid", function (req, res) {
        // console.log("ARmigate passed this request");
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.end("Hello World\n");
    });

const server = http.createServer((req, res) => {
    ARmigateClient.auth(req, res);
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});