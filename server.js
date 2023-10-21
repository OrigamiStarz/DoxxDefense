const express = require("express");
const fileUpload = require('express-fileupload');
const app = express();
const bodyParser =  require("body-parser");

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: false }));

// text page
app.get("/text", function(req, res) {
    res.sendFile(__dirname + "/public/text.html");
});

app.post("/text", function(req, res) {
    
});

// document page
app.get("/document", function(req, res) {
    res.sendFile(__dirname + "/public/document.html");
});

app.post("/document", function(req, res) {
    console.log(req.files);
    res.send({
        body: "yes"
    });
});

// website page
app.get("/website", function(req, res) {
    res.sendFile(__dirname + "/public/website.html");
});

app.post("/website", function(req, res) {
    res.send(req.body);
});

// default to text page
app.get("/*", function(req, res) {
    res.redirect("/text");
});

app.listen(process.env.PORT || 3000, function() {
    console.log(`Server is listening on ${process.env.PORT || 3000}`);
});


// https://stackoverflow.com/questions/23691194/node-express-file-upload