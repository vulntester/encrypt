import { Storage } from './storage.js';
import { Crypto } from './crypto.js';
import { Network } from './network.js';
import { UI } from './ui.js';

let net = null;
let currentChat = null;
let unreadMessages = {}; // Format: { "alice#1234": 2, "bob#5678": 0 }
let expiryCountdownInterval = null;

// --- Initialization & TTL Enforcement ---
document.addEventListener('DOMContentLoaded', () => {
    // Start the 10-second TTL enforcement loop
    setInterval(() => Storage.enforceTTL(), 10000);
    
    // Check if identity already exists in this session
    if (Storage.get('identity')) {
        initChatView();
    }
});

// --- Identity Generation ---
document.getElementById('generate-btn').addEventListener('click', async () => {
    const username = document.getElementById('username-input').value.trim().toLowerCase();
    const statusEl = document.getElementById('setup-status');
    
    if (!username || !/^[a-z0-9]{3,20}$/.test(username)) {
        statusEl.textContent = "Invalid username. Use 3-20 alphanumeric characters.";
        return;
    }

    statusEl.textContent = "Generating cryptographic identity... this may take a moment.";
    
    // Generate secure discriminator (0000-9999) using Web Crypto API
    const array = new Uint16Array(1);
    window.crypto.getRandomValues(array);
    const discriminator = (array[0] % 10000).toString().padStart(4, '0');
    const identity = `${username}#${discriminator}`;

    try {
        const { privateKey, publicKey } = await Crypto.generateKeys(identity);
        Storage.init(identity, privateKey, publicKey);
        initChatView();
    } catch (err) {
        statusEl.textContent = "Key generation failed. Check console.";
        console.error(err);
    }
});

// --- View Orchestration ---
function initChatView() {
    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('chat-view').style.display = 'block';
    
    const myId = Storage.get('identity');
    document.getElementById('my-identity').textContent = `Your ID: ${myId}`;
    
    // Initialize Network WebSocket
    net = new Network(myId, handleNetworkMessage);
    
    // Bind UI Tabs
    document.getElementById('tab-inbox').onclick = () => UI.showTab('inbox');
    document.getElementById('tab-requests').onclick = () => UI.showTab('requests');
	document.getElementById('tab-chat').onclick = () => {
    currentChat = null; // Reset selection
    UI.showTab('chat');
    // Force show the Handshake view, hide the message view
    document.getElementById('handshake-init-view').style.display = 'block';
    document.getElementById('active-chat-view').style.display = 'none';
};
    
    renderContacts();
    startExpiryCountdown();
}

function startExpiryCountdown() {
    if (expiryCountdownInterval) clearInterval(expiryCountdownInterval);

    const tick = () => {
        const expiryRaw = Storage.get('session_expiry');
        const timerEl = document.getElementById('timer-val');
        if (!timerEl || !expiryRaw) return;

        const expiryTs = parseInt(expiryRaw, 10);
        const remainingMs = Math.max(0, expiryTs - Date.now());
        const totalSeconds = Math.floor(remainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    tick();
    expiryCountdownInterval = setInterval(tick, 1000);
}

function updateNotificationUI(contactId) {
    // 1. Update the individual contact dot
    UI.renderContactBadge(contactId, unreadMessages[contactId]);
    
    // 2. Calculate and update the Global Inbox Tab badge
    const total = Object.values(unreadMessages).reduce((a, b) => a + b, 0);
    UI.updateInboxBadge(total);
}

async function openChat(contactId) {
    currentChat = contactId;
    
    UI.showTab('chat');
    // Flip views: hide Handshake, show Messages
    document.getElementById('handshake-init-view').style.display = 'none';
    document.getElementById('active-chat-view').style.display = 'block';
    
    UI.els.currentChatTitle.textContent = `Chat: ${contactId}`;
    
    // Clear red dots for this contact
    unreadMessages[contactId] = 0;
    updateNotificationUI(contactId);
    
    renderMessages(contactId);
}


// Submit handshake request with Enter in the + tab input
const targetIdInput = document.getElementById('target-id');
targetIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('send-req-btn').click();
    }
});

// Ensure "Enter" key works for sending messages
document.getElementById('msg-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('send-msg-btn').click();
});

document.getElementById('generate-btn').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('generate-btn').click();
});

function showTab(tab) {
    document.getElementById('inbox-panel').style.display = tab === 'inbox' ? 'block' : 'none';
    document.getElementById('requests-panel').style.display = tab === 'requests' ? 'block' : 'none';
}

// --- Network Message Handler ---
async function handleNetworkMessage(data) {
    if (data.type === 'request') {
        // This is what was missing/broken:
        UI.renderRequest(data.from, (senderId) => {
            net.acceptChat(senderId, Storage.get('pubKey'));
        });
    } 
    else if (data.type === 'accept') {
        // Sender receives the acceptance + Recipient's PubKey
        const contacts = Storage.getJson('contacts');
        contacts[data.from] = data.pubKey;
        Storage.setJson('contacts', contacts);
        
        // Finalize: Send Sender's PubKey to Recipient
        net.finalizeHandshake(data.from, Storage.get('pubKey'));
        UI.notify(`${data.from} accepted! Check Inbox.`);
        renderContacts();
    }
    else if (data.type === 'pubkey') {
        // Recipient receives Sender's PubKey
        const contacts = Storage.getJson('contacts');
        contacts[data.from] = data.pubKey;
        Storage.setJson('contacts', contacts);
        renderContacts();
    }
    else if (data.type === 'message') {
        // Standard message decryption...
        Storage.saveEncryptedMessage(data.from, data.ciphertext, false);
        if (currentChat !== data.from) {
            unreadMessages[data.from] = (unreadMessages[data.from] || 0) + 1;
            updateNotificationUI(data.from);
        }
        
        if (currentChat === data.from) {
            renderMessages(data.from);
        }
    }
}

// --- Action Bindings ---
document.getElementById('send-req-btn').onclick = () => {
    const target = document.getElementById('target-id').value.trim();
    if (target && net) {
        net.requestChat(target);
        document.getElementById('target-id').value = '';
        UI.notify("Invitation Sent!");
    }
};

document.getElementById('send-msg-btn').onclick = async () => {
    if (!currentChat) return;
    
    const input = document.getElementById('msg-input');
    const plaintext = input.value.trim();
    if (!plaintext) return;

    const contacts = Storage.getJson('contacts');
    const recipientPubKey = contacts[currentChat];
    
    try {
        // 1. Encrypt for the other person
        const ciphertext = await Crypto.encrypt(plaintext, recipientPubKey);
        
        // 2. Send via WebSocket
        net.sendMessage(currentChat, ciphertext);
        
        // 3. Save locally as plaintext so YOU can read it
        Storage.saveSentMessage(currentChat, plaintext);
        
        input.value = '';
        renderMessages(currentChat);
    } catch (err) {
        console.error("Encryption failed", err);
    }
};

// Bind the Burn button
document.getElementById('burn-btn').onclick = () => {
    if (confirm("Burn this session? All keys and messages will be permanently deleted.")) {
        Storage.wipe();
    }
};


// --- Rendering Logic (XSS Safe) ---
function renderContacts() {
    const list = document.getElementById('active-chats');
    list.innerHTML = ''; // Safe here, no user input
    
    const contacts = Object.keys(Storage.getJson('contacts'));
    contacts.forEach(contactId => {
        const li = document.createElement('li');
        li.className = 'contact-item';
        const name = document.createElement('span');
        name.className = 'contact-name';
        name.textContent = contactId;
        li.appendChild(name);
        li.dataset.id = contactId;
        li.style.cursor = 'pointer';
        li.onclick = () => openChat(contactId);
        list.appendChild(li);

        // Re-apply any unread badge when the contact list is re-rendered.
        UI.renderContactBadge(contactId, unreadMessages[contactId] || 0);
    });
}

async function renderMessages(contactId) {
    UI.clearMessages();
    const msgs = Storage.getJson('messages')[contactId] || [];
    const myPrivKey = Storage.get('privKey');
    
    for (const msg of msgs) {
        let displayBody;
        if (msg.isMine) {
            displayBody = msg.text; // Already plaintext
        } else {
            try {
                displayBody = await Crypto.decrypt(msg.text, myPrivKey);
            } catch (e) {
                displayBody = "[Decryption Error]";
            }
        }
        UI.addMessage(msg.isMine ? 'You' : contactId.split('#')[0], displayBody, msg.isMine);
    }
}
