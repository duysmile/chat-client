const express = require('express');
const app = express();
const server = require('http').Server(app);
// const https = require('https');
// const fs = require('fs');
// const path = require('path');
// const keyPath = path.resolve(__dirname, './sslcert/server.key');
// const certPath = path.resolve(__dirname, './sslcert/server.crt');
// const privateKey = fs.readFileSync(keyPath, 'utf8');
// const certificate = fs.readFileSync(certPath, 'utf8');

// const credentials = {
//     key: privateKey,
//     cert: certificate
// }

// const server = https.createServer(credentials, app);

const port = process.env.PORT || 3005;
// load static file
app.use(express.static('./'));

server.listen(port, () => console.log(`Example app listening on port ${port}!`));
