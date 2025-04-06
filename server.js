// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL = "gemini-2.0-pro-exp-02-05";
const API_KEY = 'AIzaSyDx-PT8JE7ZM5mewYRYTqRKsImZ9KW1Twg'; // Replace with your real key
const ai = new GoogleGenerativeAI(API_KEY);
const model = ai.getGenerativeModel({ model: MODEL });

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

// ========== MEMORY STORE ==========
const fs = require('fs');
const MEMORY_FILE = './memory.json';

function loadMemoryFromFile() {
  try {
    const data = fs.readFileSync(MEMORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read memory.json:", err);
    return [];
  }
}

function saveMemoryToFile(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

let memoryStore = loadMemoryFromFile();

// ========== CONVERSATION HISTORY ==========
let conversationHistory = [];

// ========== ROUTES ==========

// Chat Endpoint
app.post('/response', async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log('User Question:', userMessage);

    conversationHistory.push(`User: ${userMessage}`);
    if (conversationHistory.length > 5) conversationHistory.shift();

    const prompt = `
    ## 🧠 Memory
    ${memoryStore.map(m => `- ${m.text}`).join("\n")}

    ## 💬 Conversation History
    ${conversationHistory.join("\n")}

    **Respond thoughtfully and politely.**
    `;

    const { response } = await model.generateContent(prompt);
    const aiResponse = response.text();
    console.log('AI Response:', aiResponse);

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error generating AI response:', error);
    res.status(500).json({ error: "Sorry, I couldn't generate a response right now." });
  }
});

app.use(express.static(__dirname + '/public'));

// Memory - Get All
app.get('/memory', (req, res) => {
  res.json(memoryStore);
});

// Memory - Add
app.post('/memory', (req, res) => {
  const { text } = req.body;
  const item = { id: uuidv4(), text };
  memoryStore.push(item);
  saveMemoryToFile(memoryStore); // 🔥 Add this
  res.json({ success: true, item });
});


// Memory - Delete by ID
app.delete('/memory/:id', (req, res) => {
  const id = req.params.id;
  memoryStore = memoryStore.filter(item => item.id !== id);
  saveMemoryToFile(memoryStore); // 🔥 Add this
  res.json({ success: true });
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
