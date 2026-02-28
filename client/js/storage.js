export const Storage = {
    init(identity, privKey, pubKey) {
        localStorage.setItem('identity', identity);
        localStorage.setItem('privKey', privKey);
        localStorage.setItem('pubKey', pubKey);
        localStorage.setItem('contacts', JSON.stringify({}));
        localStorage.setItem('messages', JSON.stringify({}));
        localStorage.setItem('session_expiry', Date.now() + 3600000); // 1 hour
    },

    get(key) { return localStorage.getItem(key); },

    getJson(key) { return JSON.parse(localStorage.getItem(key) || '{}'); },

    setJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); },

    saveSentMessage(contactId, plaintext) {
        const msgs = this.getJson('messages');
        if (!msgs[contactId]) msgs[contactId] = [];
        msgs[contactId].push({ text: plaintext, isMine: true, timestamp: Date.now() });
        this.setJson('messages', msgs);
    },

    saveEncryptedMessage(contactId, ciphertext, isMine) {
        const msgs = this.getJson('messages');
        if (!msgs[contactId]) msgs[contactId] = [];
        msgs[contactId].push({ text: ciphertext, isMine, timestamp: Date.now() });
        this.setJson('messages', msgs);
    },

    wipe() {
        localStorage.clear();
        window.location.reload();
    },

    enforceTTL() {
        const expiry = localStorage.getItem('session_expiry');
        if (expiry && Date.now() > parseInt(expiry)) this.wipe();
    }
};