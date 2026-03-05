const axios = require('axios');

async function testProdApi() {
    try {
        const url = 'https://api.mansarafoods.com/api/products?limit=1000&_t=' + Date.now();
        console.log(`Testing Production API: ${url}`);
        const response = await axios.get(url);
        const products = response.data.products || response.data;

        products.forEach(p => {
            if (p.slug === 'urad-porridge-mix-classic') {
                console.log(`- ${p.name} (${p.slug}):`);
                console.log(`  Price: ${p.price}, OfferPrice: ${p.offerPrice}, OriginalPrice: ${p.originalPrice}`);
                console.log(`  isOffer: ${p.isOffer}`);
            }
        });
    } catch (error) {
        console.error('API Error:', error.message);
    }
}

testProdApi();
