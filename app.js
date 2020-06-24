const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const https = require('https');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname, {
  dotfiles: 'allow'
}));

httpPort = "3000";

// Start in http mode
const httpServer = http.createServer(app);
httpServer.listen(httpPort, function() {
  console.log('HTTP Server running on port ' + httpPort);
});


//Direct users
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});
