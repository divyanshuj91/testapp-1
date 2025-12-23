// Chatbot Logic

const chatbotStyles = document.createElement('link');
chatbotStyles.rel = 'stylesheet';
chatbotStyles.href = 'chatbot.css';
document.head.appendChild(chatbotStyles);

const chatbotHTML = `
    <div class="chatbot-trigger" id="chatbotTrigger">
        <i class="material-icons-round">chat</i>
    </div>
    
    <div class="chatbot-container" id="chatbotContainer">
        <div class="chat-header">
            <h3>Civic Helper</h3>
            <button class="close-chat" id="closeChat">
                <i class="material-icons-round">close</i>
            </button>
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="message bot-message">
                Hi! I can help you with app features. Ask me about reporting issues, credits, or profile settings.
            </div>
        </div>
        <div class="chat-input-area">
            <input type="text" id="chatInput" placeholder="Type a message...">
            <button class="send-btn" id="sendBtn">
                <i class="material-icons-round">send</i>
            </button>
        </div>
    </div>
`;

// Inject Chatbot UI
const appContainer = document.querySelector('.app-container') || document.body;
// We append to body to ensure it's overlaying correctly if app-container has specific constraints
document.body.insertAdjacentHTML('beforeend', chatbotHTML);

// Elements
const trigger = document.getElementById('chatbotTrigger');
const container = document.getElementById('chatbotContainer');
const closeBtn = document.getElementById('closeChat');
const sendBtn = document.getElementById('sendBtn');
const input = document.getElementById('chatInput');
const messagesArea = document.getElementById('chatMessages');

// Toggle Chat
function toggleChat() {
    container.classList.toggle('active');
    if (container.classList.contains('active')) {
        input.focus();
    }
}

trigger.addEventListener('click', toggleChat);
closeBtn.addEventListener('click', toggleChat);

// Bot Logic
const knowledgeBase = {
    'report': "To report an issue, go to the 'Home' tab and look for the 'Report' button or use the Camera tab to snap a photo instantly.",
    'camera': "The Camera tab allows you to take geotagged photos of civic issues. Make sure to allow camera permissions!",
    'credits': "You earn credits for every verified report. These credits can be redeemed for rewards in the Redeem section.",
    'points': "You earn points/credits for every verified report. These credits can be redeemed for rewards in the Redeem section.",
    'redeem': "Go to the 'Redeem' page to exchange your hard-earned credits for vouchers and other rewards.",
    'profile': "The Profile page shows your user details, total credits, and report history.",
    'contact': "You can contact support at support@civicloop.com.",
    'hello': "Hello! How can I assist you today?",
    'hi': "Hi there! needing help with something?",
    'default': "I'm not sure about that. Try asking about 'reporting', 'credits', or 'using the camera'."
};

function getBotResponse(userText) {
    const text = userText.toLowerCase();

    // Check for keywords
    for (const key in knowledgeBase) {
        if (text.includes(key)) {
            return knowledgeBase[key];
        }
    }

    return knowledgeBase['default'];
}

function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(isUser ? 'user-message' : 'bot-message');
    msgDiv.textContent = text;
    messagesArea.appendChild(msgDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, true);
    input.value = '';

    // Simulate thinking/delay
    setTimeout(() => {
        const response = getBotResponse(text);
        addMessage(response, false);
    }, 500);
}

sendBtn.addEventListener('click', handleSend);
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});
