const express = require("express");
const fileUpload = require("express-fileupload");
const app = express();
const bodyParser =  require("body-parser");
const axios = require("axios").default;
const cheerio = require("cheerio");
const fs = require("fs").promises;
const mammoth = require("mammoth")
const pdf = require("pdf-parse");

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/uploads", express.static("uploads"));

// for environmental variables
require("dotenv").config()
AI_API_TOKEN = process.env.AI_API_TOKEN
AI_API_TEST_TOKEN = process.env.AI_API_TEST_TOKEN

// text page
app.get("/text", function(req, res) {
    res.sendFile(__dirname + "/public/text.html");
});

app.post("/text", async (req, res) => {
    const data = await processData(req.body.text);
    res.json(data);
});

// document page
app.get("/document", function(req, res) {
    res.sendFile(__dirname + "/public/document.html");
});

app.post("/document", async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: "No files were uploaded." });
    }
  
    const file = req.files.file;
  
    try {
      const timeStamp = Date.now();
      await file.mv("uploads/" + timeStamp + "_" + file.name);
      const filePath = __dirname + "/uploads/" +  timeStamp + "_" + file.name;
  
      if (file.name.endsWith(".pdf")) {
        try {
          const dataBuffer = await fs.readFile(filePath);
          const data = await pdf(dataBuffer);
          const textContent = data.text;
          const processedData = await processData(textContent);
          res.json({ message: "File uploaded and processed successfully", content: processedData });
        } catch (error) {
          console.error("Error processing PDF:", error);
          res.status(500).json({ error: "Error processing PDF: " + error.message });
        }
      } else if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        try {
          const dataBuffer = await fs.readFile(filePath);
          const result = await mammoth.extractRawText({ buffer: dataBuffer });
          const textContent = result.value;
          const processedData = await processData(textContent);
          res.json({ message: "File uploaded and processed successfully", content: processedData });
        } catch (error) {
          console.error("Error processing Word document:", error);
          res.status(500).json({ error: "Error processing Word document: " + error.message });
        }
      } else if (file.name.endsWith(".txt")) {
        try {
          const textContent = await fs.readFile(filePath, "utf8");
          const processedData = await processData(textContent);
          res.json({ message: "File uploaded and processed successfully", content: processedData });
        } catch (error) {
          console.error("Error processing text file:", error);
          res.status(500).json({ error: "Error processing text file: " + error.message });
        }
      } else {
        res.status(400).json({ error: "Unsupported file format." });
      }
    } catch (err) {
      console.error("File upload error:", err);
      res.status(500).json({ error: "File upload error: " + err.message });
    }
  });  

// website page
app.get("/website", function(req, res) {
    res.sendFile(__dirname + "/public/website.html");
});

app.post("/website", async function(req, res) {
    // use scraper
    let numCrawl = req.body["numCrawl"];
    if (numCrawl === undefined || numCrawl === null || numCrawl === "" || isNaN(numCrawl)) {
      numCrawl = 1;
    } else {
      numCrawl = parseInt(numCrawl);    
      if (numCrawl <= 0) {
        numCrawl = 1;
      } else if (numCrawl >= 6) {
        numCrawl = 5; 
      }
    }
    scraped = await scrape(req.body["url"], numCrawl);
    let data = await processData(scraped);
    console.log(data);
    res.json(data);
});

// default to text page
app.get("/*", function(req, res) {
    res.redirect("/text");
});

app.listen(process.env.PORT || 3000, function() {
    console.log(`Server is listening on ${process.env.PORT || 3000}`);
});

async function processData(text) {

  const options = {
    method: "POST",
    url: "https://api.edenai.run/v2/text/custom_named_entity_recognition",
    headers: {
      authorization: "Bearer " + AI_API_TOKEN,
    },
    data: {
      show_original_response: false,
      fallback_providers: "",
      providers: "openai",
      language: "en",
      text: text,
      entities: ["Name", "Gender", "Person", "Date/Time", "Relationship", "Birthday", "Location", "Biometric Data", "Health/Medical", "Financial", "Other PII"],
    }
  }

  let newText = text;
  let newText2 = []
  try {
    const response = await axios.request(options);

    // get the PII, hide or change details
    let hideData = [];
    for (let i = 0; i < response.data["openai"].items.length; i++) {
      let entity = response.data["openai"].items[i].entity;
      hideData.push((i + 1) + ". " + response.data["openai"].items[i].category + ": " + entity);
      newText = newText.split(entity).join("*****");
    }
    
    // add the synonyms, parse by sentence.
    // to be added in the future

    // return it
    hideData = Array.from(new Set(hideData)); // make it unique
    console.log(newText2)
    return { "content1": hideData.join("<br>"), "content2": newText};
  } catch (error) {
    console.error(error);
  }
}

async function scrape(url, depth) {
  if (depth <= 0) {
    return "";
  }

  try {
    const response = await axios.get(url);
    if (response.status === 200) {
      const html = response.data;
      const $ = cheerio.load(html);

      // Select and extract text content from specific tags (e.g., p, h1, h2)
      const textContent = $("p, h1, h2").text();
      console.log(`Scraped: ${url}`);

      // Find links on the page and follow them recursively
      const links = [];
      $("a").each((index, element) => {
        const link = $(element).attr("href");
        if (link && link.startsWith("http")) {
          links.push(link);
        }
      });

      let subContent = "";
      for (const link of links) {
        try {
          subContent += await scrape(link, depth - 1);
        } catch (error) {
          console.error(`Error while scraping ${link}: ${error.message}`);
          // Continue with the next link even if one fails
        }
      }

      return textContent + subContent;
    } else {
      console.error(`Failed to fetch the website: ${url}`);
      return "";
    }
  } catch (error) {
    console.error(`Error while scraping ${url}: ${error.message}`);
    return "";
  }
}