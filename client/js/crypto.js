// Import OpenPGP directly as a module
import * as openpgp from 'https://cdn.jsdelivr.net/npm/openpgp@6.3.0/+esm';

export const Crypto = {
    async generateKeys(name) {
        // Now 'openpgp' is explicitly defined in this scope
        const { privateKey, publicKey } = await openpgp.generateKey({
            type: 'ecc',
            curve: 'curve25519',
            userIDs: [{ name }]
        });
        return { privateKey, publicKey };
    },
    async generateKeys(name) {
        const { privateKey, publicKey } = await openpgp.generateKey({
            type: 'ecc',
            curve: 'curve25519',
            userIDs: [{ name }]
        });
        return { privateKey, publicKey };
    },

    async encrypt(plaintext, recipientPubKeyArmored) {
        const publicKey = await openpgp.readKey({ armoredKey: recipientPubKeyArmored });
        const message = await openpgp.createMessage({ text: plaintext });
        return await openpgp.encrypt({
            message,
            encryptionKeys: publicKey
        });
    },

    async decrypt(ciphertext, myPrivKeyArmored) {
        const privateKey = await openpgp.readPrivateKey({ armoredKey: myPrivKeyArmored });
        const message = await openpgp.readMessage({ armoredMessage: ciphertext });
        const { data: plaintext } = await openpgp.decrypt({
            message,
            decryptionKeys: privateKey
        });
        return plaintext;
    }
};