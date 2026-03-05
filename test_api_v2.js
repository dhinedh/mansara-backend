const axios = require('axios');

async function testApi() {
    try {
        const response = await axios.get('http://localhost:5000/api/products?limit=1000&_t=' + Date.now());
        const products = response.data.products || response.data;
        console.log('API Products Count:', products.length);

        products.forEach(p => {
            if (p.slug === 'ragi-choco-malt' || p.slug === 'urad-porridge-mix-classic') {
                console.log(`- ${p.name} (${p.slug}):`);
                console.log(`  Price: ${p.price}, OfferPrice: ${p.offerPrice}, Stock: ${p.stock}`);
                console.log(`  IsOffer: ${p.isOffer}, IsActive: ${p.isActive}`);
                console.log(`  Variants: ${JSON.stringify(p.variants)}`);
            }
        });
    } catch (error) {
        console.error('API Error:', error.message);
    }
}

testApi();
