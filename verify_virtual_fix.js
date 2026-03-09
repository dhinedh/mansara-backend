const mongoose = require('mongoose');
const { Product } = require('./models/Product');

async function verifyFix() {
    console.log('--- Verifying ratingDisplay Virtual Fix ---');

    // Create a mock product document without saving to DB
    const mockProduct = new Product({
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        image: 'test.jpg',
        category: new mongoose.Types.ObjectId(),
        stock: 10
    });

    // Case 1: rating is undefined (as reported in crash)
    mockProduct.rating = undefined;
    console.log(`Rating: ${mockProduct.rating}, ratingDisplay: "${mockProduct.ratingDisplay}"`);
    if (mockProduct.ratingDisplay === '0.0') {
        console.log('✅ Case 1 Passed: Undefined rating handled correctly.');
    } else {
        console.error('❌ Case 1 Failed: Expected "0.0"');
    }

    // Case 2: rating is 0
    mockProduct.rating = 0;
    console.log(`Rating: ${mockProduct.rating}, ratingDisplay: "${mockProduct.ratingDisplay}"`);
    if (mockProduct.ratingDisplay === '0.0') {
        console.log('✅ Case 2 Passed: 0 rating handled correctly.');
    } else {
        console.error('❌ Case 2 Failed: Expected "0.0"');
    }

    // Case 3: rating is 4.5
    mockProduct.rating = 4.5;
    console.log(`Rating: ${mockProduct.rating}, ratingDisplay: "${mockProduct.ratingDisplay}"`);
    if (mockProduct.ratingDisplay === '4.5') {
        console.log('✅ Case 3 Passed: Normal rating handled correctly.');
    } else {
        console.error('❌ Case 3 Failed: Expected "4.5"');
    }

    process.exit(0);
}

verifyFix().catch(err => {
    console.error('Verification failed with error:', err);
    process.exit(1);
});
