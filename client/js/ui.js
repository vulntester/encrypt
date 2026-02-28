/**
 * UI Module: Pure DOM manipulation.
 * Zero logic regarding encryption or networking.
 */
export const UI = {
    // Selectors
    els: {
        panels: document.querySelectorAll('.tab-panel'),
        tabChatBtn: document.getElementById('tab-chat'),
        msgContainer: document.getElementById('messages'),
        contactList: document.getElementById('active-chats'),
        reqList: document.getElementById('incoming-requests'),
        currentChatTitle: document.getElementById('chatting-with'),
        timer: document.getElementById('timer-val')
    },

    showTab(tabId) {
        // Hide all panels
        this.els.panels.forEach(p => p.style.display = 'none');
        // Show selected panel
        document.getElementById(`${tabId}-panel`).style.display = 'block';
        
        // Update tab styling (optional enhancement)
        document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');
    },

    enableChatTab(contactId) {
        this.els.tabChatBtn.disabled = false;
        this.els.tabChatBtn.textContent = `Chat (${contactId.split('#')[0]})`;
        this.els.currentChatTitle.textContent = `Secure Session: ${contactId}`;
    },

    showView(viewName) {
        this.els.setup.style.display = viewName === 'setup' ? 'block' : 'none';
        this.els.chat.style.display = viewName === 'chat' ? 'block' : 'none';
    },

    renderContacts(contacts, onSelect) {
        this.els.contactList.innerHTML = ''; 
        Object.keys(contacts).forEach(id => {
            const li = document.createElement('li');
            li.textContent = id; // XSS Safe
            li.className = 'contact-item';
            li.onclick = () => onSelect(id);
            this.els.contactList.appendChild(li);
        });
    },

    renderRequest(from, onAccept) {
        const li = document.createElement('li');
        li.className = 'request-item';
        li.textContent = `Request from: ${from} `;
        
        const btn = document.createElement('button');
        btn.textContent = 'Accept';
        btn.onclick = () => {
            onAccept(from);
            li.remove();
        };
        li.appendChild(btn);
        this.els.reqList.appendChild(li);
    },

    clearMessages() {
        this.els.msgContainer.innerHTML = '';
    },

    addMessage(sender, text, isMine) {
        const div = document.createElement('div');
        div.className = `msg ${isMine ? 'mine' : 'theirs'}`;
        // CRITICAL SECURITY: textContent prevents script injection
        div.textContent = `${sender}: ${text}`; 
        this.els.msgContainer.appendChild(div);
        this.els.msgContainer.scrollTop = this.els.msgContainer.scrollHeight;
    }
};