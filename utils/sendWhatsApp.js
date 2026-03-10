const whatsappService = require('./WhatsAppService');

/**
 * PROXIED TO BOTBIZ WHATSAPP SERVICE
 * This file is kept for backward compatibility during migration.
 */

const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
};

const sendWhatsApp = async (destination, message) => {
    try {
        return await whatsappService.sendMessage(destination, message);
    } catch (error) {
        console.error('[PROXIED WHATSAPP] Error:', error.message);
        return null;
    }
};

const sendWhatsAppPost = async (destination, message) => {
    return sendWhatsApp(destination, message);
};

const sendWhatsAppTemplate = async (destination, templateName, components = []) => {
    // Botbiz currently handles templates via the main sendMessage or specific endpoints if needed.
    // For now, we'll log and return null as we migrate to direct Botbiz calls.
    console.warn('[PROXIED WHATSAPP] Template sending via proxy is not implemented. Use WhatsAppService directly.');
    return null;
};

const sendBulkWhatsApp = async (messagesList, delayBetween = 500) => {
    return await whatsappService.sendBulkWhatsApp(messagesList, delayBetween);
};

const getMessageStatus = async (messageId) => {
    return null;
};

const testConnection = async (testPhone) => {
    try {
        const testMessage = `🧪 *Botbiz Connection Test (via Proxy)*\n\nTime: ${new Date().toLocaleString('en-IN')}\n\nSuccess! ✅`;
        return await whatsappService.sendMessage(testPhone, testMessage);
    } catch (error) {
        return false;
    }
};

module.exports = sendWhatsApp;
module.exports.sendWhatsAppTemplate = sendWhatsAppTemplate;
module.exports.sendWhatsAppPost = sendWhatsAppPost;
module.exports.sendBulkWhatsApp = sendBulkWhatsApp;
module.exports.formatPhoneNumber = formatPhoneNumber;
module.exports.getMessageStatus = getMessageStatus;
module.exports.testConnection = testConnection;