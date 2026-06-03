require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, systemPrompt } = req.body;

        const messages = [
            {
                role: 'system',
                content: systemPrompt || `You are the FileVault AI assistant. Only answer questions about the current FileVault application, including the public library page, admin login, manager portal, folder selection, file upload, file list, file search, sorting, and sync status. Do not describe signup, third-party providers, profile pages, or any features that are not part of this version of FileVault. If the user asks about unavailable functionality, say "That feature is not available in this version of FileVault." Keep responses concise, factual, and aligned with the site."`
            },
            ...(history || []).map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.parts[0].text
            })),
            { role: 'user', content: message }
        ];

        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            max_tokens: 1024,
            messages
        });

        res.json({ text: response.choices[0].message.content });
    } catch (error) {
        console.error('SERVER ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));