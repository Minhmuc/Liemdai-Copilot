// Liemdai Copilot - Main Script

// Không cần window controls vì dùng native buttons
console.log('✅ Using native Windows titlebar controls');

const API_URL = 'http://localhost:8000';
let currentMode = 'ask'; // 'ask' or 'agent'
let currentWebSocket = null; // Store current WebSocket connection
let isResponding = false; // Track if AI is responding

const homeScreen = document.getElementById('homeScreen');
const chatContainer = document.getElementById('chatContainer');
const chatMessages = document.getElementById('chatMessages');
const homeInput = document.getElementById('homeInput');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const modeIndicator = document.getElementById('modeIndicator');
const modeDropdown = document.getElementById('modeDropdown');
const modeText = document.getElementById('modeText');
const chatModeIndicator = document.getElementById('chatModeIndicator');
const chatModeDropdown = document.getElementById('chatModeDropdown');
const chatModeText = document.getElementById('chatModeText');
const welcomeTitle = document.getElementById('welcomeTitle');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');

// Set greeting based on time
function setGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Chào buổi sáng';
    if (hour >= 12 && hour < 18) greeting = 'Chào buổi chiều';
    else if (hour >= 18) greeting = 'Chào buổi tối';
    welcomeTitle.textContent = greeting;
}
setGreeting();

// Initialize mode text
modeText.textContent = 'Trò chuyện';
chatModeText.textContent = 'Trò chuyện';

// Sidebar toggle
hamburgerBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Mode dropdown toggle (Home)
modeIndicator.addEventListener('click', (e) => {
    e.stopPropagation();
    modeDropdown.classList.toggle('show');
});

// Mode dropdown toggle (Chat)
chatModeIndicator.addEventListener('click', (e) => {
    e.stopPropagation();
    chatModeDropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    modeDropdown.classList.remove('show');
    chatModeDropdown.classList.remove('show');
});

// Mode selection (Home dropdown)
const modeOptions = modeDropdown.querySelectorAll('.mode-option');
modeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Update selected state
        modeOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Get mode
        currentMode = option.dataset.mode;
        const modeName = option.querySelector('h4').textContent.trim();
        
        // Update both indicators
        modeText.textContent = modeName;
        chatModeText.textContent = modeName;
        
        // Sync chat dropdown
        const chatOption = chatModeDropdown.querySelector(`[data-mode="${currentMode}"]`);
        chatModeDropdown.querySelectorAll('.mode-option').forEach(opt => opt.classList.remove('selected'));
        if (chatOption) chatOption.classList.add('selected');
        
        // Close dropdown
        modeDropdown.classList.remove('show');
    });
});

// Mode selection (Chat dropdown)
const chatModeOptions = chatModeDropdown.querySelectorAll('.mode-option');
chatModeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Update selected state
        chatModeOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Get mode
        currentMode = option.dataset.mode;
        const modeName = option.querySelector('h4').textContent.trim();
        
        // Update both indicators
        modeText.textContent = modeName;
        chatModeText.textContent = modeName;
        
        // Sync home dropdown
        const homeOption = modeDropdown.querySelector(`[data-mode="${currentMode}"]`);
        modeDropdown.querySelectorAll('.mode-option').forEach(opt => opt.classList.remove('selected'));
        if (homeOption) homeOption.classList.add('selected');
        
        // Close dropdown
        chatModeDropdown.classList.remove('show');
    });
});

// Switch to chat mode
function switchToChatMode() {
    document.body.classList.remove('home-mode');
    document.body.classList.add('chat-mode');
    sidebar.classList.add('open');

    if (window.electronAPI?.setOverlayMode) {
        window.electronAPI.setOverlayMode('chat');
    }
}

function switchToHomeMode() {
    document.body.classList.remove('chat-mode');
    document.body.classList.add('home-mode');

    if (window.electronAPI?.setOverlayMode) {
        window.electronAPI.setOverlayMode('home');
    }
}

if (window.electronAPI?.setOverlayMode) {
    window.electronAPI.setOverlayMode('home');
}

// Send message from home
homeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && homeInput.value.trim()) {
        switchToChatMode();
        sendMessage(homeInput.value.trim());
        homeInput.value = '';
    }
});

// Send message from chat (or stop if responding)
sendBtn.addEventListener('click', () => {
    if (isResponding) {
        // Stop current response
        stopResponse();
    } else {
        // Send message
        if (chatInput.value.trim()) {
            sendMessage(chatInput.value.trim());
            chatInput.value = '';
        }
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isResponding && chatInput.value.trim()) {
        sendMessage(chatInput.value.trim());
        chatInput.value = '';
    }
});

// Use suggestion
function useSuggestion(text) {
    switchToChatMode();
    sendMessage(text);
}

// Stop current response
function stopResponse() {
    if (currentWebSocket) {
        currentWebSocket.close();
        currentWebSocket = null;
        addMessage('⏹️ Đã dừng', 'bot');
    }
    // Reset UI
    isResponding = false;
    typingIndicator.classList.remove('show');
    sendBtn.classList.remove('stop');
    sendBtn.textContent = '➤';
}

// Send message to API
async function sendMessage(message) {
    // Add user message
    addMessage(message, 'user');

    // Show typing indicator and change send button to stop
    isResponding = true;
    typingIndicator.classList.add('show');
    sendBtn.classList.add('stop');
    sendBtn.textContent = '⏹️'; // Stop icon
    scrollToBottom();

    try {
        if (currentMode === 'ask') {
            // Ask mode - use REST API
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, mode: 'ask' })
            });
            const data = await response.json();
            addMessage(data.response, 'bot');
            
            // Reset UI for ask mode
            isResponding = false;
            typingIndicator.classList.remove('show');
            sendBtn.classList.remove('stop');
            sendBtn.textContent = '➤';
        } else {
            // Agent mode - use WebSocket (UI reset handled in WebSocket callbacks)
            await executeAgentTask(message);
        }
    } catch (error) {
        addMessage('❌ Không thể kết nối backend. Đảm bảo server đang chạy tại http://localhost:8000', 'bot');
        // Reset UI on error
        isResponding = false;
        typingIndicator.classList.remove('show');
        sendBtn.classList.remove('stop');
        sendBtn.textContent = '➤';
    }
}

// Execute agent task via WebSocket
async function executeAgentTask(task) {
    const ws = new WebSocket('ws://localhost:8000/ws/chat');
    currentWebSocket = ws; // Store reference for stop button
    
    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'chat',
            message: task,
            mode: 'agent'
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'status') {
            // Show status message
            addMessage(data.content, 'bot');
        } else if (data.type === 'warning') {
            // Show warning message (dangerous operations skipped)
            addMessage(data.content, 'bot');
        } else if (data.type === 'confirmation_request') {
            // Show confirmation UI with buttons
            addConfirmationMessage(data.code, data.content, ws);
        } else if (data.type === 'response') {
            // Final response
            addMessage(data.content, 'bot');
            if (data.done) {
                ws.close();
                currentWebSocket = null;
            }
        } else if (data.type === 'error') {
            addMessage(data.content, 'bot');
            ws.close();
            currentWebSocket = null;
        }
    };
    
    ws.onerror = (error) => {
        addMessage('❌ WebSocket error. Đảm bảo server đang chạy.', 'bot');
        ws.close();
        currentWebSocket = null;
        // Reset UI
        isResponding = false;
        typingIndicator.classList.remove('show');
        sendBtn.classList.remove('stop');
        sendBtn.textContent = '➤';
    };
    
    ws.onclose = () => {
        currentWebSocket = null;
        // Reset UI
        isResponding = false;
        typingIndicator.classList.remove('show');
        sendBtn.classList.remove('stop');
        sendBtn.textContent = '➤';
    };
}

// Add confirmation message with action buttons
function addConfirmationMessage(code, message, ws) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = `
        <div style="margin-bottom: 12px;">${message}</div>
        <pre style="background: #f5f5f5; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; margin: 8px 0;">${code}</pre>
    `;

    contentDiv.appendChild(bubble);

    // Add confirmation buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    actionsDiv.innerHTML = `
        <button class="action-btn confirm-btn" style="background: #4caf50; color: white; font-weight: 600;">✓ Xác nhận</button>
        <button class="action-btn skip-btn" style="background: #ff9800; color: white; font-weight: 600;">⏭️ Bỏ qua</button>
    `;
    contentDiv.appendChild(actionsDiv);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    // Add click handlers
    const confirmBtn = actionsDiv.querySelector('.confirm-btn');
    const skipBtn = actionsDiv.querySelector('.skip-btn');

    confirmBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'confirm', confirmed: true }));
        confirmBtn.disabled = true;
        skipBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
        skipBtn.style.opacity = '0.5';
    });

    skipBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'confirm', confirmed: false }));
        confirmBtn.disabled = true;
        skipBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
        skipBtn.style.opacity = '0.5';
    });
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    contentDiv.appendChild(bubble);

    // Add action buttons for bot messages
    if (sender === 'bot') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        actionsDiv.innerHTML = `
            <button class="action-btn" onclick="likeMessage(this)">👍</button>
            <button class="action-btn" onclick="dislikeMessage(this)">👎</button>
            <button class="action-btn" onclick="copyMessage(this)">📋 Sao chép</button>
        `;
        contentDiv.appendChild(actionsDiv);
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Action functions
function likeMessage(btn) {
    btn.style.background = '#e8f5e9';
    btn.style.borderColor = '#4caf50';
}

function dislikeMessage(btn) {
    btn.style.background = '#ffebee';
    btn.style.borderColor = '#f44336';
}

function copyMessage(btn) {
    const bubble = btn.closest('.message-content').querySelector('.message-bubble');
    navigator.clipboard.writeText(bubble.textContent);
    btn.textContent = '✓ Đã sao chép';
    setTimeout(() => {
        btn.innerHTML = '📋 Sao chép';
    }, 2000);
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
