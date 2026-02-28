import { Storage } from './storage.js';
import { Crypto } from './crypto.js';
import { Network } from './network.js';
import { UI } from './ui.js';

let net = null;
let currentChat = null;
let unreadMessages = {};
let expiryCountdownInterval = null;

// --- Initialization & TTL Enforcement ---
document.addEventListener('DOMContentLoaded', () => {
    setInterval(() => Storage.enforceTTL(), 10000);
    if (Storage.get('identity')) {
        initChatView();
    }
});

// --- Identity Generation ---
document.getElementById('generate-btn').addEventListener('click', async () => {
    const username = document.getElementById('username-input').value.trim().toLowerCase();
    const statusEl = document.getElementById('setup-status');

    if (!username || !/^[a-z0-9]{3,20}$/.test(username)) {
        statusEl.textContent = "Invalid username. Use 3–20 alphanumeric characters.";
        return;
    }

    statusEl.textContent = "Generating cryptographic identity…";

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

// Enter key on username field
document.getElementById('username-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('generate-btn').click();
});

// --- View Orchestration ---
function initChatView() {
    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('chat-view').style.display = 'flex';

    const myId = Storage.get('identity');
    document.getElementById('my-identity').textContent = myId;

    net = new Network(myId, handleNetworkMessage);

    // Tab bindings
    document.getElementById('tab-inbox').onclick = () => UI.showTab('inbox');
    document.getElementById('tab-requests').onclick = () => UI.showTab('requests');
    document.getElementById('tab-chat').onclick = () => {
        currentChat = null;
        UI.showTab('chat');
        document.getElementById('handshake-init-view').style.display = 'flex';
        document.getElementById('active-chat-view').style.display = 'none';
    };

    // Show inbox by default
    UI.showTab('inbox');

    renderContacts();
    startExpiryCountdown();
}

function startExpiryCountdown() {
    if (expiryCountdownInterval) clearInterval(expiryCountdownInterval);
    const tick = () => {
        const expiryRaw = Storage.get('session_expiry');
        const timerEl = document.getElementById('timer-val');
        if (!timerEl || !expiryRaw) return;
        const remainingMs = Math.max(0, parseInt(expiryRaw, 10) - Date.now());
        const totalSeconds = Math.floor(remainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    tick();
    expiryCountdownInterval = setInterval(tick, 1000);
}

function updateNotificationUI(contactId) {
    UI.renderContactBadge(contactId, unreadMessages[contactId]);
    const total = Object.values(unreadMessages).reduce((a, b) => a + b, 0);
    UI.updateInboxBadge(total);
}

async function openChat(contactId) {
    currentChat = contactId;
    UI.showTab('chat');

    document.getElementById('handshake-init-view').style.display = 'none';
    document.getElementById('active-chat-view').style.display = 'flex';

    UI.els.currentChatTitle.textContent = contactId;

    unreadMessages[contactId] = 0;
    updateNotificationUI(contactId);
    renderMessages(contactId);
}

// Enter key for target-id and msg-input
document.getElementById('target-id').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('send-req-btn').click(); }
});
document.getElementById('msg-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('send-msg-btn').click();
});

// --- Network Message Handler ---
async function handleNetworkMessage(data) {
    if (data.type === 'request') {
        UI.renderRequest(data.from, (senderId) => {
            net.acceptChat(senderId, Storage.get('pubKey'));
        });
    }
    else if (data.type === 'accept') {
        const contacts = Storage.getJson('contacts');
        contacts[data.from] = data.pubKey;
        Storage.setJson('contacts', contacts);
        net.finalizeHandshake(data.from, Storage.get('pubKey'));
        UI.notify(`${data.from} accepted your invitation.`);
        renderContacts();
    }
    else if (data.type === 'pubkey') {
        const contacts = Storage.getJson('contacts');
        contacts[data.from] = data.pubKey;
        Storage.setJson('contacts', contacts);
        renderContacts();
    }
    else if (data.type === 'message') {
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
        UI.notify('Invitation sent.');
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
        const ciphertext = await Crypto.encrypt(plaintext, recipientPubKey);
        net.sendMessage(currentChat, ciphertext);
        Storage.saveSentMessage(currentChat, plaintext);
        input.value = '';
        renderMessages(currentChat);
    } catch (err) {
        console.error('Encryption failed', err);
    }
};

document.getElementById('burn-btn').onclick = () => {
    if (confirm('Burn this session? All keys and messages will be permanently deleted.')) {
        Storage.wipe();
    }
};

// --- Rendering ---
function renderContacts() {
    const list = document.getElementById('active-chats');

    // Remove existing contact items (keep empty-state if present)
    list.querySelectorAll('.contact-item').forEach(el => el.remove());

    const contacts = Object.keys(Storage.getJson('contacts'));

    // Show/hide empty state
    let emptyState = list.querySelector('.empty-state');
    if (contacts.length === 0) {
        if (!emptyState) {
            emptyState = document.createElement('li');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>No active chats yet.<br>Send an invitation to start.</span>`;
            list.appendChild(emptyState);
        }
        return;
    } else {
        emptyState?.remove();
    }

    contacts.forEach(contactId => {
        const li = document.createElement('li');
        li.className = 'contact-item';
        li.dataset.id = contactId;

        const name = document.createElement('span');
        name.className = 'contact-name';
        name.textContent = contactId;

        li.appendChild(name);
        li.onclick = () => openChat(contactId);
        list.appendChild(li);

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
            displayBody = msg.text;
        } else {
            try {
                displayBody = await Crypto.decrypt(msg.text, myPrivKey);
            } catch (e) {
                displayBody = '[Decryption Error]';
            }
        }
        UI.addMessage(msg.isMine ? 'You' : contactId.split('#')[0], displayBody, msg.isMine);
    }
}