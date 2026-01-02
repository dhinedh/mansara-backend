const axios = require('axios');

// ========================================
// OPTIMIZED EMAIL SERVICE WITH RETRY
// ========================================

/**
 * Send email via Brevo (Sendinblue) API
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.name - Recipient name (optional)
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Plain text message (fallback)
 * @param {string} options.html - HTML message (preferred)
 * @param {number} retries - Number of retry attempts (default: 2)
 */
const sendEmail = async (options, retries = 2) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.EMAIL_FROM;

    // Validation
    if (!apiKey || !senderEmail) {
        console.error('[EMAIL] CRITICAL: Missing BREVO_API_KEY or EMAIL_FROM');
        throw new Error('Email service not configured');
    }

    if (!options.email) {
        throw new Error('Recipient email is required');
    }

    // Prepare payload
    const payload = {
        sender: {
            name: 'Mansara Foods',
            email: senderEmail,
        },
        to: [
            {
                email: options.email,
                name: options.name || options.email.split('@')[0],
            },
        ],
        subject: options.subject || 'Message from Mansara Foods',
        textContent: options.message || 'Please view this email in HTML mode.',
        htmlContent: options.html || options.message || '',
    };

    // Retry logic
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            console.log(`[EMAIL] Sending to ${options.email} (attempt ${attempt}/${retries + 1})`);

            const response = await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                payload,
                {
                    headers: {
                        'api-key': apiKey,
                        'Content-Type': 'application/json',
                        'accept': 'application/json',
                    },
                    timeout: 10000, // 10 seconds timeout
                }
            );

            if (response.data && response.data.messageId) {
                console.log(`[EMAIL] ✓ Sent successfully. MessageID: ${response.data.messageId}`);
                return response.data;
            } else {
                throw new Error('No messageId in response');
            }

        } catch (error) {
            const isLastAttempt = attempt === retries + 1;
            
            // Log error details
            if (error.response) {
                console.error(`[EMAIL] ✗ API Error (${error.response.status}):`, 
                    error.response.data?.message || error.response.data
                );
            } else if (error.request) {
                console.error('[EMAIL] ✗ No response from server:', error.message);
            } else {
                console.error('[EMAIL] ✗ Error:', error.message);
            }

            // If this is the last attempt, throw the error
            if (isLastAttempt) {
                throw new Error(`Failed to send email after ${retries + 1} attempts: ${error.message}`);
            }

            // Wait before retrying (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`[EMAIL] Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
};

/**
 * Send bulk emails (with rate limiting)
 * @param {Array} emailsList - Array of email options objects
 * @param {number} delayBetween - Delay between emails in ms (default: 100ms)
 */
const sendBulkEmails = async (emailsList, delayBetween = 100) => {
    console.log(`[EMAIL] Sending ${emailsList.length} emails with ${delayBetween}ms delay`);
    
    const results = {
        success: [],
        failed: []
    };

    for (let i = 0; i < emailsList.length; i++) {
        try {
            await sendEmail(emailsList[i]);
            results.success.push(emailsList[i].email);
        } catch (error) {
            results.failed.push({
                email: emailsList[i].email,
                error: error.message
            });
        }

        // Wait between emails to avoid rate limiting
        if (i < emailsList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
    }

    console.log(`[EMAIL] Bulk send complete: ${results.success.length} sent, ${results.failed.length} failed`);
    return results;
};

module.exports = sendEmail;
module.exports.sendBulkEmails = sendBulkEmails;