export const Storage = {
    init(identity, privKey, pubKey) {
        const expiry = Date.now() + (60 * 60 * 1000); // 1 Hour TTL
        localStorage.setItem('session_expiry', expiry);
        localStorage.setItem('identity', identity);
        localStorage.setItem('privKey', privKey);
        localStorage.setItem('pubKey', pubKey);
        localStorage.setItem('contacts', JSON.stringify({})); // { 'bob#1234': 'bob_pub_key' }
        localStorage.setItem('messages', JSON.stringify({})); // { 'bob#1234': ['ciphertext1', ...] }
    },

    get(key) { return localStorage.getItem(key); },
    
    getJson(key) { return JSON.parse(localStorage.getItem(key) || '{}'); },
    
    setJson(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

    saveEncryptedMessage(contactId, ciphertext, isMine) {
        const msgs = this.getJson('messages');
        if (!msgs[contactId]) msgs[contactId] = [];
        msgs[contactId].push({ text: ciphertext, isMine, timestamp: Date.now() });
        this.setJson('messages', msgs);
    },

    enforceTTL() {
        const expiry = localStorage.getItem('session_expiry');
        if (expiry && Date.now() > parseInt(expiry, 10)) {
            this.wipe();
        }
    },

    wipe() {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    }
};