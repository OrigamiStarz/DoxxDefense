const express = require("express");
const fileUpload = require('express-fileupload');
const app = express();
const bodyParser =  require("body-parser");
const axios = require('axios');
const cheerio = require('cheerio');
const crawlee = require("crawlee")
const Apify = require("apify-cli")

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
    scraped = await scrape(req.body["url"], 0, req.body["numCrawl"]);
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

async function scrape(url, depth, numCrawl) {
    if (!numCrawl) numCrawl = 1;
    numCrawl = parseInt(numCrawl);
    numCrawl = (numCrawl >= 1 && numCrawl < 10) ? numCrawl : 1;
    content = await scrapeWithDepth(url, depth, numCrawl)
    return {content:content}
}

async function scrapeWithDepth(url, depth, numCrawl) {
    // scrape a URL up to a maximum depth
    if (depth >= numCrawl) {
        return; // exit if maximum depth
    }
    // fetch html
    content = []
    await axios.get(url)
    .then((response) => {
    if (response.status === 200) {
        const html = response.data;
        const $ = cheerio.load(html);
        // Use Cheerio to select and extract data from the HTML
        content.push($.text());
        // Find links on the page and recursively scrape them
        const links = [];
        $('a').each((index, element) => {
        const link = $(element).attr('href');
        if (link && link.startsWith('http')) {
            links.push(link);
        }
        });
        if (depth + 1 < numCrawl) {
            // recursive scrape
            links.forEach((link) => {
                console.log(link)
                let next = scrapeWithDepth(link, depth + 1, numCrawl);
                if (next) content.push(next);
            });
        }
    }
    })
    .catch((error) => {
        return {content: error};
    });
    return content;
}