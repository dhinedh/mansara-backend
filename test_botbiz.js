const sendWhatsApp = require('./utils/sendWhatsApp');

async function test() {
    console.log('--- STARTING TEST ---');
    try {
        // Use the number from previous logs or a safe dummy
        // 919342400879 is from the user logs
        const targetNumber = '919342400879';
        const message = 'Test message from Mansara Botbiz Integration test script.';

        console.log(`Attempting to send to ${targetNumber}`);
        const result = await sendWhatsApp(targetNumber, message);
        console.log('Result:', result);
    } catch (err) {
        console.error('Test Failed:', err);
    }
    console.log('--- TEST COMPLETE ---');
}

test();
