/**
 * UI Module: Pure DOM manipulation.
 * Zero logic regarding encryption or networking.
 */
export const UI = {
	
	unreadCounts: {}, // { 'bob#1234': 5 }
    // Selectors
    els: {
        panels: document.querySelectorAll('.tab-panel'),
        msgContainer: document.getElementById('messages'),
        contactList: document.getElementById('active-chats'),
        reqList: document.getElementById('incoming-requests'),
        currentChatTitle: document.getElementById('chatting-with'),
        handshakeView: document.getElementById('handshake-init-view'),
        chatView: document.getElementById('active-chat-view')
    },
	
	// Displays the red dot on contacts
    renderUnreadBadge(contactId, count) {
        const item = document.querySelector(`.contact-item[data-id="${contactId}"]`);
        if (!item) return;

        let badge = item.querySelector('.unread-dot');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-dot';
                item.appendChild(badge);
            }
            badge.textContent = count;
        } else if (badge) {
            badge.remove();
        }
    },

    notify(text) {
        const toast = document.createElement('div');
        toast.className = 'toast-success';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
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
        const list = document.getElementById('incoming-requests');
        if (!list) return console.error("❌ Element #incoming-requests not found!");

        // Avoid duplicate requests
        if (document.getElementById(`req-${from}`)) return;

        const li = document.createElement('li');
        li.id = `req-${from}`;
        li.className = 'request-item';
        li.innerHTML = `
            <span>Invite from <strong>${from}</strong></span>
            <button class="accept-btn">Accept</button>
        `;

        li.querySelector('.accept-btn').onclick = () => {
            onAccept(from);
            li.remove();
        };

        list.appendChild(li);
        
        // Notify user if they are on a different tab
        if (!document.getElementById('requests-panel').offsetParent) {
            document.getElementById('tab-requests').classList.add('has-notification');
        }
    },
    
    showTab(tabId) {
        document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
        document.getElementById(`${tabId}-panel`).style.display = 'block';
        
        document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById(`tab-${tabId}`);
        activeBtn.classList.add('active');
        activeBtn.style.borderTop = "none"; // Clear notification
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
    },

    updateBadge(contactId, increment = true) {
        if (increment) {
            this.unreadCounts[contactId] = (this.unreadCounts[contactId] || 0) + 1;
        } else {
            this.unreadCounts[contactId] = 0;
        }
        this.renderContactBadges();
    },

    updateInboxBadge(totalUnread) {
        const badge = document.getElementById('inbox-badge');
        if (totalUnread > 0) {
            badge.textContent = totalUnread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    },

    renderContactBadge(contactId, count) {
        // Find the specific LI for this contact
        const contactEl = document.querySelector(`.contact-item[data-id="${contactId}"]`);
        if (!contactEl) return;

        let badge = contactEl.querySelector('.unread-dot');
        
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-dot';
                contactEl.appendChild(badge);
            }
            badge.textContent = count;
        } else if (badge) {
            badge.remove();
        }
    }
};