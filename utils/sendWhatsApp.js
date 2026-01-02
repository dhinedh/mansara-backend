const axios = require('axios');

// ========================================
// OPTIMIZED WHATSAPP SERVICE
// ========================================

/**
 * Format phone number to WhatsApp format
 * @param {string} phone - Phone number in any format
 * @returns {string} Formatted phone number (e.g., "919876543210@c.us")
 */
const formatPhoneNumber = (phone) => {
    if (!phone) throw new Error('Phone number is required');

    // Remove all non-numeric characters
    let cleaned = String(phone).replace(/[\s+\-()]/g, '');
    
    // If number doesn't start with country code, assume India (91)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }

    // Validate length (should be 12 digits for India: 91 + 10 digits)
    if (cleaned.length < 10 || cleaned.length > 15) {
        throw new Error(`Invalid phone number length: ${cleaned}`);
    }

    // Return in WhatsApp format
    return `${cleaned}@c.us`;
};

/**
 * Send WhatsApp message via Whapi.Cloud
 * @param {string} destination - Phone number (will be auto-formatted)
 * @param {string} message - Message text
 * @param {number} retries - Number of retry attempts (default: 2)
 */
const sendWhatsApp = async (destination, message, retries = 2) => {
    const token = process.env.WHAPI_TOKEN;

    // Validation
    if (!token) {
        console.error('[WHATSAPP] CRITICAL: WHAPI_TOKEN not configured');
        throw new Error('WhatsApp service not configured');
    }

    if (!destination) {
        throw new Error('Destination phone number is required');
    }

    if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
    }

    // Format destination
    let waDestination;
    try {
        waDestination = formatPhoneNumber(destination);
    } catch (error) {
        console.error('[WHATSAPP] Invalid phone number:', error.message);
        throw error;
    }

    // Prepare payload
    const payload = {
        to: waDestination,
        body: message.trim()
    };

    const url = 'https://gate.whapi.cloud/messages/text';

    // Retry logic
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            console.log(`[WHATSAPP] Sending to ${waDestination} (attempt ${attempt}/${retries + 1})`);
            console.log(`[WHATSAPP] Message preview: ${message.substring(0, 100)}...`);

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 15000 // 15 seconds
            });

            // Check if message was sent successfully
            if (response.data && response.data.sent) {
                console.log(`[WHATSAPP] ✓ Sent successfully. MessageID: ${response.data.message?.id}`);
                return response.data;
            } else {
                throw new Error(response.data?.error || 'Message not sent');
            }

        } catch (error) {
            const isLastAttempt = attempt === retries + 1;

            // Log detailed error
            if (error.response) {
                const errorData = error.response.data;
                console.error(`[WHATSAPP] ✗ API Error (${error.response.status}):`, 
                    errorData?.error || errorData?.message || errorData
                );
                
                // Don't retry on certain errors
                if (error.response.status === 400 || error.response.status === 401) {
                    throw new Error(errorData?.error || errorData?.message || 'Invalid request');
                }
            } else if (error.request) {
                console.error('[WHATSAPP] ✗ No response from server:', error.message);
            } else {
                console.error('[WHATSAPP] ✗ Error:', error.message);
            }

            // If last attempt, throw error
            if (isLastAttempt) {
                throw new Error(`Failed to send WhatsApp after ${retries + 1} attempts: ${error.message}`);
            }

            // Wait before retrying (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`[WHATSAPP] Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
};

/**
 * Send bulk WhatsApp messages (with rate limiting)
 * @param {Array} messagesList - Array of {phone, message} objects
 * @param {number} delayBetween - Delay between messages in ms (default: 1000ms)
 */
const sendBulkWhatsApp = async (messagesList, delayBetween = 1000) => {
    console.log(`[WHATSAPP] Sending ${messagesList.length} messages with ${delayBetween}ms delay`);
    
    const results = {
        success: [],
        failed: []
    };

    for (let i = 0; i < messagesList.length; i++) {
        const { phone, message } = messagesList[i];
        
        try {
            await sendWhatsApp(phone, message);
            results.success.push(phone);
        } catch (error) {
            results.failed.push({
                phone,
                error: error.message
            });
        }

        // Wait between messages to avoid rate limiting
        if (i < messagesList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
    }

    console.log(`[WHATSAPP] Bulk send complete: ${results.success.length} sent, ${results.failed.length} failed`);
    return results;
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
const isValidPhoneNumber = (phone) => {
    try {
        formatPhoneNumber(phone);
        return true;
    } catch {
        return false;
    }
};

module.exports = sendWhatsApp;
module.exports.sendBulkWhatsApp = sendBulkWhatsApp;
module.exports.isValidPhoneNumber = isValidPhoneNumber;
module.exports.formatPhoneNumber = formatPhoneNumber;