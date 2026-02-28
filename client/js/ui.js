/**
 * UI Module: Pure DOM manipulation.
 * Zero logic regarding encryption or networking.
 */
export const UI = {

    unreadCounts: {},

    els: {
        panels: document.querySelectorAll('.tab-panel'),
        msgContainer: document.getElementById('messages'),
        contactList: document.getElementById('active-chats'),
        reqList: document.getElementById('incoming-requests'),
        currentChatTitle: document.getElementById('chatting-with'),
        handshakeView: document.getElementById('handshake-init-view'),
        chatView: document.getElementById('active-chat-view')
    },

    notify(text) {
        const toast = document.createElement('div');
        toast.className = 'toast-success';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    showTab(tabId) {
        // Hide all panels
        ['inbox-panel', 'requests-panel', 'chat-panel'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Show selected panel
        const panel = document.getElementById(`${tabId}-panel`);
        if (panel) panel.style.display = 'flex';

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById(`tab-${tabId}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            // Clear notification dot when switching to that tab
            activeBtn.classList.remove('has-notification');
        }
    },

    renderRequest(from, onAccept) {
        const list = document.getElementById('incoming-requests');
        if (!list) return console.error("❌ Element #incoming-requests not found!");

        // Remove empty state if present
        const emptyState = list.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        // Avoid duplicate requests
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
            // Re-add empty state if list is now empty
            if (list.children.length === 0) {
                const empty = document.createElement('li');
                empty.className = 'empty-state';
                empty.innerHTML = `
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>No pending requests.</span>`;
                list.appendChild(empty);
            }
        };

        li.appendChild(label);
        li.appendChild(btn);
        list.appendChild(li);

        // Badge the requests nav item
        const reqTab = document.getElementById('tab-requests');
        if (reqTab) reqTab.classList.add('has-notification');

        // Show badge on requests tab button
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
        if (totalUnread > 0) {
            badge.textContent = totalUnread;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    },

    renderContactBadge(contactId, count) {
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
    },

    clearMessages() {
        if (this.els.msgContainer) this.els.msgContainer.innerHTML = '';
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
        textEl.textContent = text; // XSS-safe

        div.appendChild(senderEl);
        div.appendChild(textEl);
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    // Legacy compat
    renderUnreadBadge(contactId, count) {
        this.renderContactBadge(contactId, count);
    }
};