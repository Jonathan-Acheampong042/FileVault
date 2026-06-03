// AI Chat Widget Configuration
const AI_CONFIG = {
    apiKey: '', // Keep this empty for security
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    systemPrompt: `You are the FileVault AI assistant. Help users with the FileVault admin dashboard, manager portal, folder and file organization, file upload workflow, search/filter features, sync status, and admin-only access.
Keep responses concise, use the user-facing labels from the site, and do not mention signup or third-party login providers.`
};

const CHAT_API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api/chat'
    : 'https://project-one-187u.onrender.com/api/chat';

// Chat State
let chatOpen = false;
let chatMessages = [];

// Initialize chat widget
function initChatWidget() {
    // Create chat button and window
    const chatHTML = `
        <div id="aiChatWidget" class="fixed bottom-6 right-6 z-50">
            <!-- Chat Window -->
            <div id="chatWindow" class="hidden mb-4 w-80 h-96 glass-card rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                <div class="p-4 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <span class="material-symbols-outlined text-white text-sm">smart_toy</span>
                        </div>
                        <div>
                            <h4 class="text-white font-bold text-sm">AI Assistant</h4>
                            <p class="text-white/70 text-xs">Online</p>
                        </div>
                    </div>
                    <button onclick="toggleChat()" class="text-white/80 hover:text-white">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3">
                    <div class="bg-white/5 rounded-xl p-3">
                        <p class="text-white/80 text-sm">👋 Hi! I'm your AI assistant. Ask me anything about your files or how to use FileVault!</p>
                    </div>
                </div>
                <div class="p-3 border-t border-white/10">
                    <div class="flex gap-2">
                        <input type="text" id="chatInput" placeholder="Type your message..." 
                            class="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50"
                            onkeypress="if(event.key==='Enter')sendMessage()">
                        <button onclick="sendMessage()" class="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-3 py-2 transition-all">
                            <span class="material-symbols-outlined text-sm">send</span>
                        </button>
                    </div>
                </div>
            </div>
            <!-- Chat Button -->
            <button onclick="toggleChat()" id="chatButton" class="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-110 transition-all">
                <span class="material-symbols-outlined text-white text-2xl">smart_toy</span>
            </button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatHTML);
}

// Toggle chat window
function toggleChat() {
    chatOpen = !chatOpen;
    const window = document.getElementById('chatWindow');
    const button = document.getElementById('chatButton');
    
    if (chatOpen) {
        window.classList.remove('hidden');
        button.classList.add('hidden');
    } else {
        window.classList.add('hidden');
        button.classList.remove('hidden');
    }
}

// Send message to AI
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const messagesContainer = document.getElementById('chatMessages');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addMessage(message, 'user');
    input.value = '';
    
    // Show typing indicator
    const typingId = addTypingIndicator();
    
    try {
        const response = await getAIResponse(message);
        removeTypingIndicator(typingId);
        addMessage(response, 'ai');
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessage('Sorry, I encountered an error. Please check your API key configuration.', 'ai');
    }
}

// Add message to chat
function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = sender === 'user' ? 'text-right' : 'bg-white/5 rounded-xl p-3';
    div.innerHTML = sender === 'user' 
        ? `<span class="inline-block bg-blue-500/20 text-blue-300 rounded-xl px-3 py-2 text-sm">${escapeHtml(text)}</span>`
        : `<p class="text-white/80 text-sm">${escapeHtml(text)}</p>`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add typing indicator
function addTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.className = 'bg-white/5 rounded-xl p-3';
    div.innerHTML = '<div class="flex gap-1"><span class="w-2 h-2 bg-white/40 rounded-full animate-bounce"></span><span class="w-2 h-2 bg-white/40 rounded-full animate-bounce" style="animation-delay:0.1s"></span><span class="w-2 h-2 bg-white/40 rounded-full animate-bounce" style="animation-delay:0.2s"></span></div>';
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return div;
}

// Remove typing indicator
function removeTypingIndicator(id) {
    if (id && id.parentNode) {
        id.parentNode.removeChild(id);
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get AI response
// Updated Get AI response for Node.js Backend
async function getAIResponse(userMessage) {
    // 1. Prepare chat history for the backend
    const messages = chatMessages.map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));
    
    // Save current message to local history
    chatMessages.push({ role: 'user', content: userMessage });
    
    try {
        // 2. Fetch from YOUR server, not the external API
        const response = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                history: messages
            })
        });

        if (!response.ok) {
            throw new Error('Backend server is not responding');
        }

        const data = await response.json();
        
        // 3. Return the text generated by Gemini through your server
        return data.text; 

    } catch (error) {
        console.error('Fetch error:', error);
        return '⚠️ Connection Error: Please make sure your Node.js server (server.js) is running in the VS Code terminal.';
    }
}
// Initialize on load
document.addEventListener('DOMContentLoaded', initChatWidget);