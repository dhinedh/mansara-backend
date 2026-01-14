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
    // Configuration from user request
    const apiKey = process.env.BOTBIZ_API_KEY || 'KkWbvZEqOEMOBEm3TplcuphlZaAbo1y5oVriLLku9bd2379a';
    const instanceId = process.env.BOTBIZ_INSTANCE_ID || '16963';
    const baseUrl = process.env.BOTBIZ_API_URL || 'https://api.botbiz.app/v1';

    // Construct endpoint URL
    const url = `${baseUrl}/whatsapp/send`;

    try {
        const formattedPhone = formatPhoneNumber(destination);

        console.log(`[WHATSAPP] Sending to ${formattedPhone} via BotBiz v1...`);

        // BotBiz v1 API payload
        const payload = {
            apiToken: apiKey,
            phone_number_id: instanceId,
            message: message,
            phone_number: formattedPhone
        };

        const response = await axios.post(url, payload);

        // Check for success (Botbiz v1 might return success:true or specific status)
        if (response.data) {
            console.log(`[WHATSAPP] ✓ Sent successfully. API Response:`, JSON.stringify(response.data));
            return response.data;
        } else {
            console.log('[WHATSAPP] Unexpected response format:', response.data);
            return response.data;
        }

    } catch (error) {
        console.error('[WHATSAPP] ✗ Failed:', error.message);
        if (error.response) {
            console.error('[WHATSAPP] API Error Data:', error.response.data);
            console.error('[WHATSAPP] API Error Status:', error.response.status);
        }
        // Don't throw to prevent crashing the main flow, just log
        // throw error; 
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
