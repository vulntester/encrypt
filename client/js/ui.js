/**
 * UI Module: Pure DOM manipulation.
 * Zero logic regarding encryption or networking.
 */
export const UI = {

    unreadCounts: {},

    els: {
        get msgContainer()    { return document.getElementById('messages'); },
        get contactList()     { return document.getElementById('active-chats'); },
        get reqList()         { return document.getElementById('incoming-requests'); },
        get currentChatTitle(){ return document.getElementById('chatting-with'); },
        get handshakeView()   { return document.getElementById('handshake-init-view'); },
        get chatView()        { return document.getElementById('active-chat-view'); },
    },

    notify(text) {
        const toast = document.createElement('div');
        toast.className = 'toast-success';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    showTab(tabId) {
        // Toggle panels via class (CSS handles display:flex vs display:none)
        ['inbox-panel', 'requests-panel', 'chat-panel'].forEach(id => {
            document.getElementById(id)?.classList.remove('panel-visible');
        });
        document.getElementById(`${tabId}-panel`)?.classList.add('panel-visible');

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById(`tab-${tabId}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.classList.remove('has-notification');
        }

        // Clear requests badge when viewing requests
        if (tabId === 'requests') {
            const badge = document.getElementById('req-badge');
            if (badge) badge.style.display = 'none';
        }
    },

    renderRequest(from, onAccept) {
        const list = document.getElementById('incoming-requests');
        if (!list) return console.error('❌ #incoming-requests not found');

        // Remove empty state
        list.querySelector('.empty-state')?.remove();

        // Avoid duplicates
        if (document.getElementById(`req-${from}`)) return;

        const li = document.createElement('li');
        li.id = `req-${from}`;
        li.className = 'request-item';

        const label = document.createElement('span');
        label.innerHTML = `Invite from <strong>${from}</strong>`;

        const btn = document.createElement('button');
        btn.className = 'accept-btn';
        btn.textContent = 'Accept';
        btn.onclick = () => {
            onAccept(from);
            li.remove();
            if (list.children.length === 0) {
                const empty = document.createElement('li');
                empty.className = 'empty-state';
                empty.innerHTML = `
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>No pending requests.</span>`;
                list.appendChild(empty);
            }
        };

        li.appendChild(label);
        li.appendChild(btn);
        list.appendChild(li);

        // Badge the requests tab
        const badge = document.getElementById('req-badge');
        if (badge) {
            const current = parseInt(badge.textContent || '0', 10);
            badge.textContent = current + 1;
            badge.style.display = 'inline-flex';
        }
    },

    updateInboxBadge(totalUnread) {
        const badge = document.getElementById('inbox-badge');
        if (!badge) return;
        badge.textContent = totalUnread;
        badge.style.display = totalUnread > 0 ? 'inline-flex' : 'none';
    },

    renderContactBadge(contactId, count) {
        const el = document.querySelector(`.contact-item[data-id="${contactId}"]`);
        if (!el) return;
        let badge = el.querySelector('.unread-dot');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-dot';
                el.appendChild(badge);
            }
            badge.textContent = count;
        } else if (badge) {
            badge.remove();
        }
    },

    clearMessages() {
        const c = this.els.msgContainer;
        if (c) c.innerHTML = '';
    },

    addMessage(sender, text, isMine) {
        const container = this.els.msgContainer;
        if (!container) return;

        const div = document.createElement('div');
        div.className = `msg ${isMine ? 'mine' : 'theirs'}`;

        const senderEl = document.createElement('span');
        senderEl.className = 'msg-sender';
        senderEl.textContent = isMine ? 'You' : sender;

        const textEl = document.createElement('span');
        textEl.textContent = text; // XSS-safe: textContent, not innerHTML

        div.appendChild(senderEl);
        div.appendChild(textEl);
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    // Compat alias
    renderUnreadBadge(contactId, count) {
        this.renderContactBadge(contactId, count);
    }
};