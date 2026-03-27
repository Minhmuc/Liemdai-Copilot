// Liemdai Copilot - Main Script

// Không cần window controls vì dùng native buttons
console.log('✅ Using native Windows titlebar controls');

const API_URL = 'http://localhost:8000';
const BACKEND_RETRY_DELAY_MS = 1200;
const BACKEND_MAX_RETRIES = 60;
let currentMode = 'ask'; // 'ask' or 'agent'
let currentWebSocket = null; // Store current WebSocket connection
let isResponding = false; // Track if AI is responding
let currentSessionId = null;
let activeLiveStatusMessage = null;
let activeLiveStatusBody = null;
let activeLiveStatusCursor = null;
let activeLiveStatusTyping = Promise.resolve();

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
const pastSessionsList = document.getElementById('pastSessionsList');
const newSessionBtn = document.getElementById('newSessionBtn');
const clearAllDataBtn = document.getElementById('clearAllDataBtn');
const chatTitle = document.getElementById('chatTitle');
const homeInputContainer = document.querySelector('.home-input-container');
const chatInputWrapper = document.querySelector('.input-wrapper');

function setHeaderTitle(title) {
    const nextTitle = (title || 'Trò chuyện mới').trim() || 'Trò chuyện mới';
    chatTitle.textContent = nextTitle;
    document.title = `${nextTitle} - Liemdai Copilot`;
}

function setSidebarOpen(isOpen) {
    sidebar.classList.toggle('open', isOpen);
    document.body.classList.toggle('sidebar-open', isOpen);
}

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
    setSidebarOpen(!sidebar.classList.contains('open'));
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
    closeSessionMenus();
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
    setSidebarOpen(true);

    resetComposerState();
    setTimeout(() => {
        chatInput?.focus();
    }, 0);

    if (window.electronAPI?.setOverlayMode) {
        window.electronAPI.setOverlayMode('chat');
    }
}

function switchToHomeMode(options = {}) {
    const { keepSidebarState = false } = options;
    document.body.classList.remove('chat-mode');
    document.body.classList.add('home-mode');

    if (!keepSidebarState) {
        setSidebarOpen(false);
    }

    resetComposerState();
    setTimeout(() => {
        homeInput?.focus();
    }, 0);

    if (window.electronAPI?.setOverlayMode) {
        window.electronAPI.setOverlayMode('home');
    }
}

function resetComposerState() {
    isResponding = false;
    typingIndicator.classList.remove('show');
    sendBtn.classList.remove('stop');
    sendBtn.textContent = '➤';

    // Ensure text inputs are always editable after mode/session transitions.
    homeInput.disabled = false;
    homeInput.readOnly = false;
    chatInput.disabled = false;
    chatInput.readOnly = false;
}

function ensureInputReady(prefer = 'auto') {
    resetComposerState();

    const wantChat = prefer === 'chat' || (prefer === 'auto' && document.body.classList.contains('chat-mode'));
    const target = wantChat ? chatInput : homeInput;

    if (!target) return;

    window.electronAPI?.focusWindow?.();

    // Focus after DOM settles (sidebar/session list rerender can steal focus).
    setTimeout(() => {
        window.electronAPI?.focusWindow?.();
        target.disabled = false;
        target.readOnly = false;
        target.focus();
    }, 30);

    setTimeout(() => {
        target.focus();
    }, 120);

    setTimeout(() => {
        target.focus();
    }, 260);
}

function forceRestoreComposerFocus(prefer = 'auto') {
    ensureInputReady(prefer);

    // Extra retries protect against focus loss after sidebar/session rerender.
    setTimeout(() => {
        ensureInputReady(prefer);
    }, 180);

    setTimeout(() => {
        ensureInputReady(prefer);
    }, 420);
}

function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(20, 26, 38, 0.38)';
        overlay.style.backdropFilter = 'blur(6px)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';

        const panel = document.createElement('div');
        panel.style.width = 'min(420px, calc(100vw - 28px))';
        panel.style.background = 'var(--surface-color, #ffffff)';
        panel.style.border = '1px solid var(--border-color, rgba(0, 0, 0, 0.12))';
        panel.style.borderRadius = '14px';
        panel.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.22)';
        panel.style.padding = '18px';

        const text = document.createElement('p');
        text.textContent = message;
        text.style.margin = '0 0 16px';
        text.style.lineHeight = '1.45';
        text.style.color = 'var(--text-color, #111)';

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.justifyContent = 'flex-end';
        actions.style.gap = '10px';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Hủy';
        cancelBtn.style.padding = '8px 14px';
        cancelBtn.style.borderRadius = '8px';
        cancelBtn.style.border = '1px solid var(--border-color, rgba(0, 0, 0, 0.18))';
        cancelBtn.style.background = 'transparent';
        cancelBtn.style.cursor = 'pointer';

        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.textContent = 'Xóa';
        confirmBtn.style.padding = '8px 14px';
        confirmBtn.style.borderRadius = '8px';
        confirmBtn.style.border = 'none';
        confirmBtn.style.background = '#c62828';
        confirmBtn.style.color = '#fff';
        confirmBtn.style.cursor = 'pointer';

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        panel.appendChild(text);
        panel.appendChild(actions);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        const cleanup = () => {
            document.removeEventListener('keydown', onKeyDown, true);
            overlay.remove();
        };

        const finish = (value) => {
            cleanup();
            resolve(value);
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                finish(false);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                finish(true);
            }
        };

        document.addEventListener('keydown', onKeyDown, true);
        cancelBtn.addEventListener('click', () => finish(false));
        confirmBtn.addEventListener('click', () => finish(true));
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                finish(false);
            }
        });

        confirmBtn.focus();
    });
}

if (window.electronAPI?.setOverlayMode) {
    window.electronAPI.setOverlayMode('home');
}

setSidebarOpen(false);

if (newSessionBtn) {
    newSessionBtn.addEventListener('click', async () => {
        const keepSidebarState = sidebar.classList.contains('open');
        await startNewSession(false, keepSidebarState);
    });
}

if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', async () => {
        await clearAllData();
    });
}

if (homeInputContainer) {
    homeInputContainer.addEventListener('click', () => {
        homeInput?.focus();
    });
}

if (chatInputWrapper) {
    chatInputWrapper.addEventListener('click', () => {
        chatInput?.focus();
    });
}

initSessionsUI();

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
        if (currentWebSocket.readyState === WebSocket.OPEN) {
            try {
                currentWebSocket.send(JSON.stringify({ type: 'stop' }));
            } catch (_err) {
                // Best-effort stop signal.
            }
        }
        currentWebSocket.close();
        currentWebSocket = null;
        endLiveStatusMessage();
        addMessage('⏹️ Đã dừng', 'bot', { stream: true });
    }
    resetComposerState();
}

async function typeTextByChunks(target, text, delayMs = 10) {
    if (!target || !text) return;

    const size = 1;
    for (let i = 0; i < text.length; i += size) {
        target.textContent += text.slice(i, i + size);
        scrollToBottom();
        await sleep(delayMs);
    }
}

function normalizeAssistantTone(text) {
    if (!text) return text;

    return text
        .replace(/\b[Mm]ình\b/g, (m) => (m === 'Mình' ? 'Tôi' : 'tôi'))
        .replace(/\b[Mm]ình\s+sẽ\b/g, (m) => (m.startsWith('M') ? 'Tôi sẽ' : 'tôi sẽ'))
        .replace(/\b[Mm]ình\s+đang\b/g, (m) => (m.startsWith('M') ? 'Tôi đang' : 'tôi đang'));
}

function startLiveStatusMessage(initialText = '') {
    endLiveStatusMessage();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const plain = document.createElement('div');
    plain.className = 'bot-plain-text';

    const body = document.createElement('span');
    body.className = 'bot-plain-body';

    const cursor = document.createElement('span');
    cursor.className = 'agent-stream-cursor';
    cursor.textContent = '▍';

    plain.appendChild(body);
    plain.appendChild(cursor);
    contentDiv.appendChild(plain);
    messageDiv.appendChild(contentDiv);

    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    activeLiveStatusMessage = messageDiv;
    activeLiveStatusBody = body;
    activeLiveStatusCursor = cursor;
    activeLiveStatusTyping = Promise.resolve();

    if (initialText) {
        appendLiveStatusMessage(initialText);
    }
}

function appendLiveStatusMessage(text) {
    if (!text || !activeLiveStatusBody) return activeLiveStatusTyping;

    const normalized = normalizeAssistantTone(`${text}`.trim());
    if (!normalized) return activeLiveStatusTyping;

    activeLiveStatusTyping = activeLiveStatusTyping.then(
        () => typeTextByChunks(activeLiveStatusBody, `${normalized}\n`, 14)
    );

    return activeLiveStatusTyping;
}

function endLiveStatusMessage() {
    if (!activeLiveStatusMessage) return;

    activeLiveStatusTyping = activeLiveStatusTyping.then(() => {
        if (activeLiveStatusCursor) {
            activeLiveStatusCursor.remove();
        }
        activeLiveStatusMessage.classList.add('finished');
        activeLiveStatusMessage = null;
        activeLiveStatusBody = null;
        activeLiveStatusCursor = null;
    });
}

// Send message to API
async function sendMessage(message) {
    // Add user message
    await addMessage(message, 'user');

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
                body: JSON.stringify({ message, mode: 'ask', session_id: currentSessionId })
            });
            const data = await response.json();
            if (data.session_id) {
                currentSessionId = data.session_id;
            }
            await addMessage(data.response, 'bot', { stream: true });
            await loadPastSessions();
            
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
        await addMessage('❌ Không thể kết nối backend. Đảm bảo server đang chạy tại http://localhost:8000', 'bot', { stream: true });
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
        startLiveStatusMessage(`🧠 Tôi đang xử lý yêu cầu: ${task}`);
        appendLiveStatusMessage('🔌 Đã kết nối, tôi bắt đầu thực hiện ngay.');

        ws.send(JSON.stringify({
            type: 'chat',
            message: task,
            mode: 'agent',
            session_id: currentSessionId
        }));
    };

    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.session_id) {
            currentSessionId = data.session_id;
        }

        if (data.type === 'status') {
            await appendLiveStatusMessage(data.content);
        } else if (data.type === 'warning') {
            await appendLiveStatusMessage(`⚠️ ${data.content || 'Tôi có một lưu ý nhỏ về an toàn khi xử lý yêu cầu này.'}`);
        } else if (data.type === 'confirmation_request') {
            await appendLiveStatusMessage('🛡️ Tôi cần bạn xác nhận trước khi tiếp tục.');
            addConfirmationMessage(data.code, data.content, ws, data.request_id);
        } else if (data.type === 'response') {
            await appendLiveStatusMessage('✅ Hoàn tất bước xử lý, tôi gửi bạn phần tóm tắt ngay dưới đây.');
            endLiveStatusMessage();
            await addMessage(data.content, 'bot', { stream: true });
            await loadPastSessions();
            if (data.done) {
                ws.close();
                currentWebSocket = null;
            }
        } else if (data.type === 'error') {
            await appendLiveStatusMessage('❌ Trong lúc xử lý có lỗi xảy ra.');
            endLiveStatusMessage();
            await addMessage(data.content, 'bot', { stream: true });
            await loadPastSessions();
            ws.close();
            currentWebSocket = null;
        }
    };

    ws.onerror = async (_error) => {
        await appendLiveStatusMessage('❌ Mất kết nối realtime với backend.');
        endLiveStatusMessage();
        await addMessage('❌ WebSocket error. Đảm bảo server đang chạy.', 'bot', { stream: true });
        ws.close();
        currentWebSocket = null;
        // Reset UI
        isResponding = false;
        typingIndicator.classList.remove('show');
        sendBtn.classList.remove('stop');
        sendBtn.textContent = '➤';
    };

    ws.onclose = () => {
        endLiveStatusMessage();
        currentWebSocket = null;
        // Reset UI
        isResponding = false;
        typingIndicator.classList.remove('show');
        sendBtn.classList.remove('stop');
        sendBtn.textContent = '➤';
    };
}

// Add confirmation message with action buttons
function addConfirmationMessage(code, message, ws, requestId = null) {
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

    let resolved = false;
    const resolveAndRemove = (confirmed) => {
        if (resolved) return;
        resolved = true;

        appendLiveStatusMessage(
            confirmed ? 'Bạn đã xác nhận thao tác nhạy cảm.' : 'Bạn đã bỏ qua thao tác nhạy cảm.',
        );

        messageDiv.remove();
        ws.send(JSON.stringify({
            type: 'confirm',
            confirmed,
            request_id: requestId
        }));
    };

    confirmBtn.addEventListener('click', () => {
        resolveAndRemove(true);
    });

    skipBtn.addEventListener('click', () => {
        resolveAndRemove(false);
    });
}

// Add message to chat
async function addMessage(text, sender, options = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const messageText = sender === 'bot' ? normalizeAssistantTone(text) : text;

    if (sender === 'user') {
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = messageText;
        contentDiv.appendChild(bubble);
    } else {
        const plain = document.createElement('div');
        plain.className = 'bot-plain-text';
        const plainBody = document.createElement('span');
        plainBody.className = 'bot-plain-body';
        plain.appendChild(plainBody);
        contentDiv.appendChild(plain);

        if (options.stream) {
            const cursor = document.createElement('span');
            cursor.className = 'agent-stream-cursor';
            cursor.textContent = '▍';
            plain.appendChild(cursor);
            await typeTextByChunks(plainBody, messageText, 9);
            cursor.remove();
        } else {
            plainBody.textContent = messageText;
        }
    }

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
    const content = btn.closest('.message-content').querySelector('.message-bubble, .bot-plain-body, .agent-stream-text');
    navigator.clipboard.writeText(content ? content.textContent : '');
    btn.textContent = '✓ Đã sao chép';
    setTimeout(() => {
        btn.innerHTML = '📋 Sao chép';
    }, 2000);
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function initSessionsUI() {
    if (pastSessionsList) {
        pastSessionsList.innerHTML = '<div class="conversation-item">Đang khởi động backend...</div>';
    }

    const isReady = await waitForBackendReady();
    if (!isReady) {
        if (pastSessionsList) {
            pastSessionsList.innerHTML = '<div class="conversation-item">Backend chưa sẵn sàng. Vui lòng đợi...</div>';
        }
        return;
    }

    await startNewSession(false);
    await loadPastSessions();
}

async function waitForBackendReady() {
    for (let attempt = 1; attempt <= BACKEND_MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);
            const response = await fetch(`${API_URL}/`, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                return true;
            }
        } catch (_error) {
            // Backend still starting, continue retry loop.
        }

        await sleep(BACKEND_RETRY_DELAY_MS);
    }

    return false;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startNewSession(switchToChat = true, keepSidebarState = false) {
    try {
        stopResponse();

        const response = await fetch(`${API_URL}/new-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        currentSessionId = data.session_id;
        chatMessages.innerHTML = '';
        setHeaderTitle('Trò chuyện mới');

        if (switchToChat) {
            switchToChatMode();
        } else {
            switchToHomeMode({ keepSidebarState });
        }

        await loadPastSessions();
        ensureInputReady(switchToChat ? 'chat' : 'home');
    } catch (error) {
        console.error('Cannot create new session:', error);
    }
}

async function loadPastSessions() {
    if (!pastSessionsList) return;

    try {
        const response = await fetch(`${API_URL}/sessions`);
        const data = await response.json();
        const sessions = data.sessions || [];

        if (sessions.length === 0) {
            pastSessionsList.innerHTML = '<div class="conversation-item">Chưa có phiên nào</div>';
            return;
        }

        pastSessionsList.innerHTML = sessions.map((session) => {
            const title = (session.title || session.first_message || 'Trò chuyện mới').trim();
            const safeTitle = escapeHtml(title);
            const meta = `${session.message_count || 0} tin nhắn`;
            const isActive = session.session_id === currentSessionId;

            return `
                <div class="conversation-item ${isActive ? 'active' : ''}" data-session-id="${session.session_id}">
                    <div class="session-row">
                        <div class="session-main" data-session-id="${session.session_id}">
                            <span class="session-title">${safeTitle}</span>
                            <span class="session-meta">${meta}</span>
                        </div>
                        <button class="session-more-btn" data-session-id="${session.session_id}" title="Tùy chọn">⋯</button>
                        <div class="session-menu" data-session-id="${session.session_id}">
                            <button class="session-menu-item" data-action="rename" data-session-id="${session.session_id}">Đổi tên</button>
                                <button class="session-menu-item" data-action="duplicate" data-session-id="${session.session_id}">Nhân bản</button>
                            <button class="session-menu-item" data-action="export" data-session-id="${session.session_id}">Xuất Word</button>
                            <button class="session-menu-item danger" data-action="delete" data-session-id="${session.session_id}">Xóa</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        pastSessionsList.querySelectorAll('.session-main[data-session-id]').forEach((item) => {
            item.addEventListener('click', async () => {
                if (item.closest('.conversation-item')?.classList.contains('editing')) return;
                const sessionId = item.dataset.sessionId;
                const selectedTitle = item.querySelector('.session-title')?.textContent?.trim() || 'Trò chuyện cũ';
                if (!sessionId) return;
                await openSession(sessionId, selectedTitle);
            });
        });

        pastSessionsList.querySelectorAll('.session-more-btn[data-session-id]').forEach((btn) => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                const sessionId = btn.dataset.sessionId;
                if (!sessionId) return;
                const menu = pastSessionsList.querySelector(`.session-menu[data-session-id="${sessionId}"]`);
                if (!menu) return;

                const isOpen = menu.classList.contains('open');
                closeSessionMenus();
                if (!isOpen) {
                    menu.classList.add('open');
                }
            });
        });

        pastSessionsList.querySelectorAll('.session-menu-item[data-action]').forEach((btn) => {
            btn.addEventListener('click', async (event) => {
                event.stopPropagation();
                const action = btn.dataset.action;
                const sessionId = btn.dataset.sessionId;
                closeSessionMenus();
                if (!sessionId || !action) return;

                if (action === 'rename') {
                    await renameSession(sessionId);
                } else if (action === 'duplicate') {
                    await duplicateSession(sessionId);
                } else if (action === 'export') {
                    await exportSessionToWord(sessionId);
                } else if (action === 'delete') {
                    await deleteSession(sessionId);
                }
            });
        });
    } catch (error) {
        pastSessionsList.innerHTML = '<div class="conversation-item">Không tải được phiên</div>';
    }
}

async function openSession(sessionId, sessionTitle = null) {
    try {
        stopResponse();

        const response = await fetch(`${API_URL}/session/${sessionId}`);
        const data = await response.json();
        const messages = data.messages || [];

        currentSessionId = sessionId;
        chatMessages.innerHTML = '';

        messages.forEach((msg) => {
            const sender = msg.role === 'user' ? 'user' : 'bot';
            addMessage(msg.text || '', sender);
        });

        const fallbackTitle = messages.find((m) => m.role === 'user')?.text || 'Trò chuyện cũ';
        setHeaderTitle((sessionTitle || fallbackTitle).slice(0, 120));

        switchToChatMode();
        await loadPastSessions();
        ensureInputReady('chat');
    } catch (error) {
        addMessage('❌ Không thể tải phiên chat cũ.', 'bot');
    }
}

function escapeHtml(text) {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function closeSessionMenus() {
    if (!pastSessionsList) return;
    pastSessionsList.querySelectorAll('.session-menu.open').forEach((menu) => {
        menu.classList.remove('open');
    });
}

async function renameSession(sessionId) {
    const item = pastSessionsList.querySelector(`.conversation-item[data-session-id="${sessionId}"]`);
    const titleEl = item?.querySelector('.session-title');
    if (!item || !titleEl) return;

    const originalTitle = titleEl.textContent?.trim() || '';
    item.classList.add('editing');
    titleEl.setAttribute('contenteditable', 'true');
    titleEl.setAttribute('spellcheck', 'false');
    titleEl.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    selection.removeAllRanges();
    selection.addRange(range);

    const cleanup = () => {
        titleEl.removeAttribute('contenteditable');
        titleEl.removeAttribute('spellcheck');
        item.classList.remove('editing');
        titleEl.removeEventListener('keydown', onKeyDown);
        titleEl.removeEventListener('blur', onBlur);
    };

    const saveRename = async () => {
        const nextTitle = (titleEl.textContent || '').trim();
        if (!nextTitle) {
            titleEl.textContent = originalTitle;
            cleanup();
            return;
        }
        if (nextTitle === originalTitle) {
            cleanup();
            return;
        }

        try {
            const response = await fetch(`${API_URL}/session/${sessionId}/title`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: nextTitle })
            });

            if (!response.ok) {
                throw new Error('Rename failed');
            }

            if (sessionId === currentSessionId) {
                setHeaderTitle(nextTitle.slice(0, 120));
            }
            cleanup();
            await loadPastSessions();
        } catch (error) {
            titleEl.textContent = originalTitle;
            cleanup();
            window.alert('Không thể đổi tên đoạn chat.');
        }
    };

    const cancelRename = () => {
        titleEl.textContent = originalTitle;
        cleanup();
    };

    const onKeyDown = async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            await saveRename();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancelRename();
        }
    };

    const onBlur = async () => {
        await saveRename();
    };

    titleEl.addEventListener('keydown', onKeyDown);
    titleEl.addEventListener('blur', onBlur);
}

async function exportSessionToWord(sessionId) {
    try {
        const response = await fetch(`${API_URL}/session/${sessionId}`);
        if (!response.ok) {
            throw new Error('Fetch session failed');
        }
        const data = await response.json();
        const messages = data.messages || [];

        const title = pastSessionsList
            .querySelector(`.conversation-item[data-session-id="${sessionId}"] .session-title`)
            ?.textContent?.trim() || 'Doan-chat';

        const bodyRows = messages.map((msg) => {
            const role = msg.role === 'user' ? 'Nguoi dung' : 'Liemdai Copilot';
            const text = escapeHtml(msg.text || '');
            const time = escapeHtml((msg.timestamp || '').replace('T', ' ').slice(0, 19));
            return `<p><strong>${role}</strong> <em>${time}</em><br/>${text}</p>`;
        }).join('\n');

        const htmlDoc = `
            <html>
                <head><meta charset="utf-8"></head>
                <body>
                    <h2>${escapeHtml(title)}</h2>
                    ${bodyRows || '<p>Khong co noi dung.</p>'}
                </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', htmlDoc], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitizeFileName(title)}.doc`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        window.alert('Không thể xuất đoạn chat ra Word.');
    }
}

async function deleteSession(sessionId) {
    const confirmDelete = await showConfirmDialog('Bạn có chắc muốn xóa đoạn chat này không?');
    if (!confirmDelete) return;

    try {
        stopResponse();
        window.electronAPI?.focusWindow?.();

        const keepSidebarState = sidebar.classList.contains('open');
        const response = await fetch(`${API_URL}/session/${sessionId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Delete failed');
        }
        const payload = await response.json();

        const wasCurrent = currentSessionId === sessionId;
        await loadPastSessions();

        if (wasCurrent) {
            await startNewSession(false, keepSidebarState);
        } else if (document.body.classList.contains('chat-mode')) {
            forceRestoreComposerFocus('chat');
        } else {
            forceRestoreComposerFocus('home');
        }

        const removedRows = payload?.removed_rows;
        if (typeof removedRows === 'number') {
            await addMessage(`🗑️ Đã xóa đoạn chat (${removedRows} tin nhắn).`, 'bot', { stream: true });
        }
    } catch (error) {
        window.alert('Không thể xóa đoạn chat.');
        forceRestoreComposerFocus(document.body.classList.contains('chat-mode') ? 'chat' : 'home');
    }
}

async function duplicateSession(sessionId) {
    try {
        stopResponse();
        const response = await fetch(`${API_URL}/session/${sessionId}/duplicate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Duplicate failed');
        }

        const data = await response.json();
        const newSessionId = data.session_id;
        if (!newSessionId) {
            throw new Error('Missing duplicated session id');
        }

        const nextTitle = (data.title || 'Bản sao').trim();
        await openSession(newSessionId, nextTitle);
        await loadPastSessions();
        forceRestoreComposerFocus('chat');
    } catch (error) {
        window.alert('Không thể nhân bản đoạn chat.');
        forceRestoreComposerFocus(document.body.classList.contains('chat-mode') ? 'chat' : 'home');
    }
}

async function clearAllData() {
    const confirmDelete = await showConfirmDialog('Bạn có chắc muốn xóa sạch toàn bộ dữ liệu chat không? Hành động này không thể hoàn tác.');
    if (!confirmDelete) return;

    try {
        stopResponse();
        const keepSidebarState = sidebar.classList.contains('open');

        const response = await fetch(`${API_URL}/sessions`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Clear all data failed');
        }

        currentSessionId = null;
        chatMessages.innerHTML = '';
        setHeaderTitle('Trò chuyện mới');

        await startNewSession(false, keepSidebarState);
        await loadPastSessions();
        forceRestoreComposerFocus(document.body.classList.contains('chat-mode') ? 'chat' : 'home');
    } catch (error) {
        window.alert('Không thể xóa sạch dữ liệu. Vui lòng thử lại.');
    }
}

function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Doan-chat';
}
