import { Storage } from './storage.js';
import { Crypto } from './crypto.js';
import { Network } from './network.js';
import { UI } from './ui.js';

let net = null;
let currentChat = null;

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
    document.getElementById('tab-inbox').onclick = () => showTab('inbox');
    document.getElementById('tab-requests').onclick = () => showTab('requests');
	document.getElementById('tab-chat').onclick = () => showTab('chat');
    
    renderContacts();
}

async function openChat(contactId) {
    currentChat = contactId;
    
    // UI Transitions
    UI.enableChatTab(contactId);
    UI.showTab('chat');
    
    // Load existing history
    UI.clearMessages();
    await renderMessages(contactId);
}

// Ensure "Enter" key works for sending messages
document.getElementById('msg-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('send-msg-btn').click();
});

function showTab(tab) {
    document.getElementById('inbox-panel').style.display = tab === 'inbox' ? 'block' : 'none';
    document.getElementById('requests-panel').style.display = tab === 'requests' ? 'block' : 'none';
}

// --- Network Message Handler ---
async function handleNetworkMessage(data) {
    if (data.type === 'request') {
        const reqList = document.getElementById('incoming-requests');
        const li = document.createElement('li');
        li.textContent = `${data.from} wants to chat. `;
        
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept';
        acceptBtn.onclick = () => {
            net.acceptRequest(data.from, Storage.get('pubKey'));
            li.remove();
        };
        li.appendChild(acceptBtn);
        reqList.appendChild(li);
    } 
    else if (data.type === 'accept') {
        // Step 2 of Handshake: Save recipient's key, send ours back
        const contacts = Storage.getJson('contacts');
        contacts[data.from] = data.pubKey;
        Storage.setJson('contacts', contacts);
        net.completeHandshake(data.from, Storage.get('pubKey'));
        renderContacts();
    }
    else if (data.type === 'pubkey') {
        // Step 3 of Handshake: Save their key, connection is fully open
        const contacts = Storage.getJson('contacts');
        contacts[data.from] = data.pubKey;
        Storage.setJson('contacts', contacts);
        renderContacts();
    }
    else if (data.type === 'message') {
        // Decrypt incoming message
        try {
            const plaintext = await Crypto.decrypt(data.ciphertext, Storage.get('privKey'));
            Storage.saveEncryptedMessage(data.from, data.ciphertext, false);
            if (currentChat === data.from) {
                renderMessages(data.from);
            }
        } catch (err) {
            console.error("Failed to decrypt message from", data.from);
        }
    }
}

// --- Action Bindings ---
document.getElementById('send-req-btn').addEventListener('click', () => {
    const target = document.getElementById('target-id').value.trim();
    if (target && target !== Storage.get('identity')) {
        net.sendRequest(target);
        document.getElementById('target-id').value = '';
        alert(`Request sent to ${target}`);
    }
});

document.getElementById('send-msg-btn').addEventListener('click', async () => {
    if (!currentChat) return;
    
    const input = document.getElementById('msg-input');
    const plaintext = input.value.trim();
    if (!plaintext) return;

    input.value = ''; // clear immediately
    
    const contacts = Storage.getJson('contacts');
    const recipientPubKey = contacts[currentChat];
    
    try {
        const ciphertext = await Crypto.encrypt(plaintext, recipientPubKey);
        net.sendMessage(currentChat, ciphertext);
        Storage.saveEncryptedMessage(currentChat, ciphertext, true);
        renderMessages(currentChat);
    } catch (err) {
        console.error("Encryption failed", err);
    }
});

// --- Rendering Logic (XSS Safe) ---
function renderContacts() {
    const list = document.getElementById('active-chats');
    list.innerHTML = ''; // Safe here, no user input
    
    const contacts = Object.keys(Storage.getJson('contacts'));
    contacts.forEach(contactId => {
        const li = document.createElement('li');
        li.textContent = contactId;
        li.style.cursor = 'pointer';
        li.onclick = () => openChat(contactId);
        list.appendChild(li);
    });
}

async function renderMessages(contactId) {
    const container = document.getElementById('messages');
    container.innerHTML = ''; // Clear container safely
    
    const msgs = Storage.getJson('messages')[contactId] || [];
    const myPrivKey = Storage.get('privKey');
    
    for (const msg of msgs) {
        const div = document.createElement('div');
        div.style.color = msg.isMine ? 'blue' : 'green';
        
        try {
            // Re-decrypt for display (since we only store ciphertext)
            const plaintext = await Crypto.decrypt(msg.text, myPrivKey);
            // STRICT DOM INJECTION: textContent only
            div.textContent = `${msg.isMine ? 'You' : contactId}: ${plaintext}`; 
        } catch (err) {
            div.textContent = "[Undecryptable Message]";
            div.style.color = 'red';
        }
        container.appendChild(div);
    }
}