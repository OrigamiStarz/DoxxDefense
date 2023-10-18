const express = require("express");
const app = express();
app.use(express.static(__dirname + "/public"));


// text page
app.get("/text", function(req, res) {
    res.sendFile(__dirname + "/public/text.html");
});

// document page
app.get("/document", function() {
    res.sendFile(__dirname + "/public/document.html");
})

// website page
app.get("/website", function(req, res) {
    res.sendFile(__dirname + "/public/website.html");
});

// default to text page
// app.get("/*", function(req, res) {
//     res.redirect("/text");
// });

app.listen(process.env.PORT || 3000, function() {
    console.log(`Server is listening on ${process.env.PORT || 3000}`);
});
