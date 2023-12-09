# ARCaptcha Cloud Security Node.js Module

This module is dedicated to be used inside the Node.js backend web-server.

Before the regular Node.js HTTP process starts, it sends requests to the ARCaptcha server. Depending on the API response, the module either blocks the request or proceeds with the regular process.

The module has been developed to protect the users' experience: if any errors were to occur during the process, or if the timeout is reached, the module will automatically disable its blocking process and allow the regular process to proceed.

## How to install and embed the module

The module is distributed as a [npm package](https://www.npmjs.com/package/arcaptcha-cloud-security-nodejs). You can install it in your process and you will need to slightly modify the code.

The first step is to install it into an application (using npm) with the following command:

```shell
npm i arcaptcha-cloud-security-nodejs
```

The next step is more complex and requires you to update your application to work over the ARCaptcha module.

Below is an example with a simple HTTP server:

```javascript
const http = require("http");

const hostname = "127.0.0.1";
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Hello World\n");
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
```

To integrate ARCaptcha you need to make the following changes on this application:

```javascript
const ARCaptcha = require("arcaptcha-cloud-security-nodejs");
const http = require("http");

const hostname = "127.0.0.1";
const port = 3000;

const arcaptchaClient = new ARCaptcha("Some Key", "roz.arcaptcha.co")
  .on("blocked", function (req) {
    console.log("ARCaptcha blocked this request");
  })
  .on("valid", function (req, res) {
    console.log("ARCaptcha passed this request");
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
```

The idea behind the changes above is moving the application logic into a valid event of the module. This module will still generate a blocked event with the original request, but now it will deliver the Captcha page to the user before generating the event.

## Express integration

The module also supports integration through callbacks. Refer to the example below for an integration with `express`:

```javascript
const ARCaptcha = require("arcaptcha-cloud-security-nodejs");

const express = require("express");
const app = express();

const arcaptchaClient = new ARCaptcha("Some Key", "roz.arcaptcha.co");

app.use(function (req, resp, next) {
  arcaptchaClient.authCallback(
    req,
    resp,
    function () {
      // apiserver passed request, move forward
      next();
    },
    function () {
      // nothing to do when blocked
    }
  );
});

app.get("/", function (req, res) {
  res.send("Hello World");
});

app.listen(3000);
```

## Options and events

This module provides two events:

- `valid`: accepts a function with two arguments request and response. Both contain updated headers, based on the APIServer response.
- `blocked`: accepts a function with one argument request that contains the request as it was sent to the module.
  Events are generated only when you call the auth method. In case you use authCallback, it calls the specified callback and doesn't generate events.

You can also customize the behavior of the module by adding an object as a third argument with parameters:

| Option    | Default value | Description                                 |
| --------- | ------------- | ------------------------------------------- |
| `ssl`     | `true`        | Does the module use HTTPS                   |
| `port`    | `443`         | The port to connect on the APIServer        |
| `timeout` | `150`         | The endpoint on the APIServer (miliseconds) |
