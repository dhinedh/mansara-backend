const axios = require('axios');

// ========================================
// BOTBIZ WHATSAPP SERVICE
// ========================================

/**
 * Format phone number to WhatsApp format (International format without +)
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number (e.g., "919876543210")
 */
const formatPhoneNumber = (phone) => {
    if (!phone) throw new Error('Phone number is required');

    // Remove all non-numeric characters
    let cleaned = String(phone).replace(/\D/g, '');

    // If number doesn't start with country code, assume India (91)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }

    return cleaned;
};

/**
 * Send WhatsApp message via BotBiz
 * @param {string} destination - Phone number
 * @param {string} message - Message text
 */
const sendWhatsApp = async (destination, message) => {
    // Fallback to hardcoded key if env var not set (Temporary override as per user request)
    const apiKey = process.env.BOTBIZ_API_KEY || '16916|cO3ILIcXEkhqv8v3GAdivnGtzMBvb6CcQVRHTPJb77e9a058';

    // BotBiz typically uses this endpoint for text messages
    const url = 'https://botbiz.app/api/v2/send-text';

    try {
        const formattedPhone = formatPhoneNumber(destination);

        console.log(`[WHATSAPP] Sending to ${formattedPhone} via BotBiz...`);

        const response = await axios.post(url, {
            phone: formattedPhone,
            message: message,
            api_key: apiKey
        });

        if (response.data && response.data.status === 'success') {
            console.log(`[WHATSAPP] ✓ Sent successfully. ID: ${response.data.message_id}`);
            return response.data;
        } else {
            // Note: BotBiz might return success: true or status: success
            console.log('[WHATSAPP] Response:', response.data);
            return response.data;
        }

    } catch (error) {
        console.error('[WHATSAPP] ✗ Failed:', error.message);
        if (error.response) {
            console.error('[WHATSAPP] API Error:', error.response.data);
        }
        throw error;
    }
};

/**
 * Send bulk WhatsApp messages
 */
const sendBulkWhatsApp = async (messagesList, delayBetween = 1000) => {
    const results = { success: [], failed: [] };

    for (const item of messagesList) {
        try {
            await sendWhatsApp(item.phone, item.message);
            results.success.push(item.phone);
            await new Promise(r => setTimeout(r, delayBetween));
        } catch (err) {
            results.failed.push({ phone: item.phone, error: err.message });
        }
    }

    return results;
};

module.exports = sendWhatsApp;
module.exports.sendBulkWhatsApp = sendBulkWhatsApp;
module.exports.formatPhoneNumber = formatPhoneNumber;
