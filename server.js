const express = require("express");
const fileUpload = require('express-fileupload');
const app = express();
const bodyParser =  require("body-parser");
const axios = require('axios').default;
const cheerio = require('cheerio');
const fs = require('fs').promises;
const mammoth = require("mammoth")
const pdf = require('pdf-parse');

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/uploads', express.static('uploads'));

// for environmental variables
require('dotenv').config()
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


app.post('/document', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }
  
    const file = req.files.file;
  
    try {
      await file.mv('uploads/' + file.name);
      const filePath = __dirname + '/uploads/' + file.name;
  
      if (file.name.endsWith('.pdf')) {
        try {
          const dataBuffer = await fs.readFile(filePath);
          const data = await pdf(dataBuffer);
          const textContent = data.text;
          const processedData = await processData(textContent);
          res.json({ message: 'File uploaded and processed successfully', content: processedData });
        } catch (error) {
          console.error('Error processing PDF:', error);
          res.status(500).json({ error: 'Error processing PDF: ' + error.message });
        }
      } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        try {
          const dataBuffer = await fs.readFile(filePath);
          const result = await mammoth.extractRawText({ buffer: dataBuffer });
          const textContent = result.value;
          const processedData = await processData(textContent);
          console.log(textContent);
          res.json({ message: 'File uploaded and processed successfully', content: processedData });
        } catch (error) {
          console.error('Error processing Word document:', error);
          res.status(500).json({ error: 'Error processing Word document: ' + error.message });
        }
      } else if (file.name.endsWith('.txt')) {
        try {
          const textContent = await fs.readFile(filePath, 'utf8');
          const processedData = await processData(textContent);
          res.json({ message: 'File uploaded and processed successfully', content: processedData });
        } catch (error) {
          console.error('Error processing text file:', error);
          res.status(500).json({ error: 'Error processing text file: ' + error.message });
        }
      } else {
        res.status(400).json({ error: 'Unsupported file format.' });
      }
    } catch (err) {
      console.error('File upload error:', err);
      res.status(500).json({ error: 'File upload error: ' + err.message });
    }
  });  

// website page
app.get("/website", function(req, res) {
    res.sendFile(__dirname + "/public/website.html");
});

app.post("/website", async function(req, res) {
    console.log(req.body)
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

// use AI to process data
function processData(text) {
    const options = {
        method: "POST",
        url: "https://api.edenai.run/v2/text/anonymization",
        headers: {
          authorization: "Bearer " + AI_API_TEST_TOKEN,
        },
        data: {
          show_original_response: false,
          fallback_providers: "",
          providers: "microsoft",
          text: text,
          language: "en",
        },
      };
      
    return axios
        .request(options)
        .then((response) => {
            let hiddenData = [];
            for (let i=0; i<response.data.microsoft.entities.length; i++) {
                hiddenData.push((i+1) + ". " + response.data.microsoft.entities[i].subcategory + ": " + response.data.microsoft.entities[i].content)
            }
            return { "content1": hiddenData.join("<br>"), "content2": response.data.microsoft.result};
        })
        .catch((error) => {
          console.error(error);
          return {content1: "Error", content2: "Error"}
    });      
}

function getSynonym(sentence, avoid) {
    const options = {
        method: "POST",
        url: "https://api.edenai.run/v2/text/generation",
        headers: {
          authorization: "Bearer " + AI_API_TEST_TOKEN,
        },
        data: {
          show_original_response: false,
          fallback_providers: "",
          providers: "openai",
          text: "Fill in the blank: " + sentence + ". Avoid: " + avoid.join(", ") + ". Format: answer, separated by commas",
          temperature: 0.2,
          max_tokens: 50,
        },
      };
      
      return axios
        .request(options)
        .then((response) => {
          return response.data.openai.generated_text.split(", ");
        })
        .catch((error) => {
          console.error(error);
    });      
}

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