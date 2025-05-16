// Configurări server - backend SkinEvo pentru Render.com
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

// Configurări server - backend SkinEvo
const app = express();
const port = process.env.PORT || 3001;

// OpenAI API Key - va fi încărcată din variabile de mediu
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Enable CORS for all origins
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json({ limit: '50mb' }));

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).send("SkinEvo Backend is running! Try /ping endpoint.");
});

// Ping endpoint
app.get("/ping", (req, res) => {
  console.log("Received ping request");
  res.status(200).send("pong");
});

// Analyze skin endpoint
app.post("/analyze-skin", async (req, res) => {
  console.log("Received request to /analyze-skin");
  
  try {
    const { photos } = req.body;
    
    if (!photos) {
      console.log("Error: No photos in request");
      return res.status(400).json({ error: "No photos provided" });
    }
    
    // Folosim prima imagine disponibilă pentru analiză
    let imageUrl = null;
    if (photos.front) {
      imageUrl = photos.front;
    } else if (photos.side) {
      imageUrl = photos.side;
    } else {
      imageUrl = Object.values(photos)[0]; // Luăm prima imagine din orice cameră
    }
    
    if (!imageUrl) {
      console.log('Error: No valid image URL found in request');
      return res.status(400).json({ error: 'No valid image provided' });
    }
    
    console.log('Calling OpenAI API for skin analysis...');
    
    // Pregătim datele pentru API-ul OpenAI
    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Ești un expert dermatolog. Analizează fotografia pielii și oferă o evaluare detaliată în limba română despre starea pielii, posibile probleme și recomandări de îngrijire. Structurează răspunsul în două secțiuni: analiza pielii și recomandări."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analizează această imagine a feței mele și spune-mi starea pielii mele, ce probleme ai detectat și ce recomandări de îngrijire a pielii îmi sugerezi."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 800
    };
    
    // Facem cererea către API-ul OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    console.log('OpenAI response received');
    
    // Extragem și returnăm analiza
    if (response.data && 
        response.data.choices && 
        response.data.choices.length > 0 && 
        response.data.choices[0].message &&
        response.data.choices[0].message.content) {
      const analysisContent = response.data.choices[0].message.content;
      console.log('Analysis content:', analysisContent.substring(0, 100) + '...');
      res.json({ result: analysisContent });
    } else {
      console.log('Unexpected OpenAI API response format');
      throw new Error('API response format not recognized');
    }
  } catch (error) {
    console.error('Error processing request:', error.message);
    console.error('Error details:', error.response?.data || 'No additional details');
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Start the server on all interfaces
app.listen(port, "0.0.0.0", () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`App is running at: http://localhost:${port}`);
  console.log("Available endpoints:");
  console.log("- GET /      - Root endpoint");
  console.log("- GET /ping  - Test connection endpoint");
  console.log("- POST /analyze-skin - Skin analysis endpoint");
});
