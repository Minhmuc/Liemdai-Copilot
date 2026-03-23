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
const chatTitle = document.getElementById('chatTitle');

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

    if (window.electronAPI?.setOverlayMode) {
        window.electronAPI.setOverlayMode('home');
    }
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
                body: JSON.stringify({ message, mode: 'ask', session_id: currentSessionId })
            });
            const data = await response.json();
            if (data.session_id) {
                currentSessionId = data.session_id;
            }
            addMessage(data.response, 'bot');
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
    const confirmDelete = window.confirm('Bạn có chắc muốn xóa đoạn chat này không?');
    if (!confirmDelete) return;

    try {
        const keepSidebarState = sidebar.classList.contains('open');
        const response = await fetch(`${API_URL}/session/${sessionId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Delete failed');
        }

        const wasCurrent = currentSessionId === sessionId;
        await loadPastSessions();

        if (wasCurrent) {
            await startNewSession(false, keepSidebarState);
        }
    } catch (error) {
        window.alert('Không thể xóa đoạn chat.');
    }
}

function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Doan-chat';
}
