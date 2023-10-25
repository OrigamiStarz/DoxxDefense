const express = require("express");
const fileUpload = require('express-fileupload');
const app = express();
const bodyParser =  require("body-parser");
const crawlee = require("crawlee")


app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: false }));

// text page
app.get("/text", function(req, res) {
    res.sendFile(__dirname + "/public/text.html");
});

app.post("/text", function(req, res) {
    // good luck
});

// document page
app.get("/document", function(req, res) {
    res.sendFile(__dirname + "/public/document.html");
});

app.post("/document", function(req, res) {
    console.log(req.files);
    res.send({
        content: "yes"
    });
});

// website page
app.get("/website", function(req, res) {
    res.sendFile(__dirname + "/public/website.html");
});

app.post("/website", async function(req, res) {
    // use scraper
    scraped = await scrape(req.body["url"],req.body["numCrawl"]);
    res.send(scraped);
});

// default to text page
app.get("/*", function(req, res) {
    res.redirect("/text");
});

app.listen(process.env.PORT || 3000, function() {
    console.log(`Server is listening on ${process.env.PORT || 3000}`);
});

// https://stackoverflow.com/questions/23691194/node-express-file-upload

async function scrape(url, numCrawl) {
    if (!numCrawl) numCrawl = 1;
    numCrawl = parseInt(numCrawl);
    numCrawl = (numCrawl >= 1 && numCrawl < 10) ? numCrawl : 1;
    allContent = []
    const crawler = new crawlee.CheerioCrawler({
        // limit requests
        maxRequestsPerCrawl: numCrawl,
        // start crawling
        async requestHandler({ $, request, enqueueLinks }) {
            const content = $('body').text();
            allContent.push(content);
            // keep crawling links
            await enqueueLinks();
        }
    });
    await crawler.run([url]);
    return {content:allContent};
}