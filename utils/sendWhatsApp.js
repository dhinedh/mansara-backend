const axios = require('axios');

// ========================================
// BOTBIZ WHATSAPP SERVICE (dash.botbiz.io)
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
 * Send WhatsApp message via BotBiz (dash.botbiz.io)
 * @param {string} destination - Phone number
 * @param {string} message - Message text
 * @returns {Promise<Object>} Response data
 */
const sendWhatsApp = async (destination, message) => {
    const apiToken = process.env.BOTBIZ_API_KEY || 'KkWbvZEqOEMOBEm3TplcuphlZaAbo1y5oVriLLku9bd2379a';
    const phoneNumberId = process.env.BOTBIZ_INSTANCE_ID || '16963';
    const baseUrl = process.env.BOTBIZ_API_URL || 'https://dash.botbiz.io/api/v1/whatsapp/send';

    try {
        const formattedPhone = formatPhoneNumber(destination);

        console.log(`[BOTBIZ] Sending to ${formattedPhone}...`);

        // BotBiz supports both GET and POST
        // Using GET method as per documentation
        const url = `${baseUrl}?apiToken=${apiToken}&phone_number_id=${phoneNumberId}&message=${encodeURIComponent(message)}&phone_number=${formattedPhone}`;

        const response = await axios.get(url, {
            timeout: 30000, // 30 second timeout
            headers: {
                'Accept': 'application/json'
            }
        });

        // Check response
        if (response.data) {
            console.log(`[BOTBIZ] ✓ Response:`, JSON.stringify(response.data));
            
            // Common success indicators in BotBiz responses
            if (response.data.status === 'success' || 
                response.data.success === true || 
                response.status === 200) {
                console.log(`[BOTBIZ] ✓ Message sent successfully`);
                return response.data;
            } else {
                console.log(`[BOTBIZ] ⚠️  Unexpected response format`);
                return response.data;
            }
        } else {
            console.log('[BOTBIZ] ⚠️  Empty response');
            return null;
        }

    } catch (error) {
        console.error('[BOTBIZ] ✗ Send failed:', error.message);
        
        if (error.response) {
            console.error('[BOTBIZ] Status:', error.response.status);
            console.error('[BOTBIZ] Error Data:', JSON.stringify(error.response.data));
            
            // Common error messages
            if (error.response.status === 401 || error.response.status === 403) {
                console.error('[BOTBIZ] ❌ Authentication failed - Check your API token');
            } else if (error.response.status === 404) {
                console.error('[BOTBIZ] ❌ Instance not found - Check your phone_number_id');
            } else if (error.response.status === 400) {
                console.error('[BOTBIZ] ❌ Bad request - Check phone number format or message');
            } else if (error.response.status === 429) {
                console.error('[BOTBIZ] ❌ Rate limit exceeded - Too many requests');
            }
        } else if (error.code === 'ENOTFOUND') {
            console.error('[BOTBIZ] ❌ Domain not found - Check BOTBIZ_API_URL in .env');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('[BOTBIZ] ❌ Request timeout - BotBiz server not responding');
        }
        
        // Don't throw to prevent crashing the main flow
        return null;
    }
};

/**
 * Send WhatsApp message via POST method (alternative)
 * @param {string} destination - Phone number
 * @param {string} message - Message text
 * @returns {Promise<Object>} Response data
 */
const sendWhatsAppPost = async (destination, message) => {
    const apiToken = process.env.BOTBIZ_API_KEY || 'KkWbvZEqOEMOBEm3TplcuphlZaAbo1y5oVriLLku9bd2379a';
    const phoneNumberId = process.env.BOTBIZ_INSTANCE_ID || '16963';
    const baseUrl = process.env.BOTBIZ_API_URL || 'https://dash.botbiz.io/api/v1/whatsapp/send';

    try {
        const formattedPhone = formatPhoneNumber(destination);

        console.log(`[BOTBIZ POST] Sending to ${formattedPhone}...`);

        // POST method with form data
        const response = await axios.post(baseUrl, null, {
            params: {
                apiToken: apiToken,
                phone_number_id: phoneNumberId,
                message: message,
                phone_number: formattedPhone
            },
            timeout: 30000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        });

        if (response.data) {
            console.log(`[BOTBIZ POST] ✓ Message sent successfully`);
            return response.data;
        }

        return null;

    } catch (error) {
        console.error('[BOTBIZ POST] ✗ Send failed:', error.message);
        return null;
    }
};

/**
 * Send bulk WhatsApp messages with delay
 * @param {Array} messagesList - Array of {phone, message} objects
 * @param {number} delayBetween - Delay in milliseconds between messages (default: 1000ms)
 * @returns {Promise<Object>} Results object with success and failed arrays
 */
const sendBulkWhatsApp = async (messagesList, delayBetween = 1000) => {
    const results = { success: [], failed: [] };

    console.log(`[BOTBIZ BULK] Starting bulk send: ${messagesList.length} messages`);

    for (let i = 0; i < messagesList.length; i++) {
        const item = messagesList[i];
        
        try {
            console.log(`[BOTBIZ BULK] Sending ${i + 1}/${messagesList.length} to ${item.phone}...`);
            const result = await sendWhatsApp(item.phone, item.message);
            
            if (result) {
                results.success.push(item.phone);
                console.log(`[BOTBIZ BULK] ✓ ${i + 1}/${messagesList.length} sent`);
            } else {
                results.failed.push({ phone: item.phone, error: 'Send failed' });
                console.log(`[BOTBIZ BULK] ✗ ${i + 1}/${messagesList.length} failed`);
            }
            
            // Add delay between messages to avoid rate limiting
            if (i < messagesList.length - 1) {
                await new Promise(r => setTimeout(r, delayBetween));
            }
        } catch (err) {
            results.failed.push({ phone: item.phone, error: err.message });
            console.error(`[BOTBIZ BULK] ✗ Error sending to ${item.phone}:`, err.message);
        }
    }

    console.log(`[BOTBIZ BULK] Complete: ${results.success.length} success, ${results.failed.length} failed`);
    return results;
};

/**
 * Get message delivery status
 * @param {string} messageId - Message ID from send response
 * @returns {Promise<Object>} Message status
 */
const getMessageStatus = async (messageId) => {
    const apiToken = process.env.BOTBIZ_API_KEY;
    const phoneNumberId = process.env.BOTBIZ_INSTANCE_ID;
    const url = `https://dash.botbiz.io/api/v1/whatsapp/get/message-status?apiToken=${apiToken}&phone_number_id=${phoneNumberId}&message_id=${messageId}`;

    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('[BOTBIZ] Get status failed:', error.message);
        return null;
    }
};

/**
 * Test BotBiz connection
 * @param {string} testPhone - Phone number to test (default: from env or 919876543210)
 * @returns {Promise<boolean>} True if connection successful
 */
const testConnection = async (testPhone) => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           BOTBIZ CONNECTION TEST                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('Configuration:');
    console.log(`  API Token: ${process.env.BOTBIZ_API_KEY ? '✓ Set' : '✗ Not set'}`);
    console.log(`  Instance ID: ${process.env.BOTBIZ_INSTANCE_ID || '16963'}`);
    console.log(`  API URL: ${process.env.BOTBIZ_API_URL || 'https://dash.botbiz.io/api/v1/whatsapp/send'}`);
    console.log(`  Test Phone: ${testPhone || 'Not provided'}\n`);
    
    if (!testPhone) {
        console.log('❌ No test phone number provided');
        console.log('Usage: testConnection("919876543210")\n');
        return false;
    }
    
    try {
        const testMessage = `🧪 *BotBiz Connection Test*\n\nTime: ${new Date().toLocaleString('en-IN')}\n\nIf you receive this, your BotBiz integration is working! ✅\n\n- Mansara Foods`;
        
        console.log('📤 Sending test message...\n');
        const result = await sendWhatsApp(testPhone, testMessage);
        
        if (result) {
            console.log('\n╔════════════════════════════════════════════════════════╗');
            console.log('║  ✅ CONNECTION TEST PASSED!                           ║');
            console.log('╚════════════════════════════════════════════════════════╝\n');
            console.log('✓ Check WhatsApp on', testPhone, 'for the test message\n');
            return true;
        } else {
            console.log('\n╔════════════════════════════════════════════════════════╗');
            console.log('║  ❌ CONNECTION TEST FAILED                            ║');
            console.log('╚════════════════════════════════════════════════════════╝\n');
            console.log('Check the error messages above for details\n');
            return false;
        }
    } catch (error) {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║  ❌ CONNECTION TEST ERROR                             ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        console.error('Error:', error.message, '\n');
        return false;
    }
};

module.exports = sendWhatsApp;
module.exports.sendWhatsAppPost = sendWhatsAppPost;
module.exports.sendBulkWhatsApp = sendBulkWhatsApp;
module.exports.formatPhoneNumber = formatPhoneNumber;
module.exports.getMessageStatus = getMessageStatus;
module.exports.testConnection = testConnection;