const axios = require('axios');

async function checkApi() {
    try {
        // Try both with and without cache-busting
        console.log('--- API CHECK (No Cache Busting) ---');
        const res1 = await axios.get('http://localhost:5000/api/products?limit=1000');
        const products1 = res1.data.products || res1.data;
        products1.forEach(p => {
            console.log(`Slug: ${p.slug}, Price: ${p.price}, OfferPrice: ${p.offerPrice}, isOffer: ${p.isOffer}`);
        });

        console.log('\n--- API CHECK (With Cache Busting) ---');
        const res2 = await axios.get(`http://localhost:5000/api/products?limit=1000&_t=${Date.now()}`);
        const products2 = res2.data.products || res2.data;
        products2.forEach(p => {
            console.log(`Slug: ${p.slug}, Price: ${p.price}, OfferPrice: ${p.offerPrice}, isOffer: ${p.isOffer}`);
        });

    } catch (error) {
        console.error('API NOT ACCESSIBLE:', error.message);
    }
}

checkApi();
