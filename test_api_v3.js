const axios = require('axios');

async function testApi() {
    const urls = [
        'https://api.mansarafoods.com/api/products?limit=1000&_t=' + Date.now(),
        'http://localhost:5000/api/products?limit=1000&_t=' + Date.now()
    ];

    for (const url of urls) {
        try {
            console.log(`Testing URL: ${url}`);
            const response = await axios.get(url, { timeout: 5000 });
            const products = response.data.products || response.data;
            console.log(`✓ Success! Products Count: ${products.length}`);

            const p = products.find(p => p.slug === 'ragi-choco-malt');
            if (p) {
                console.log(`- ${p.name}: Price=${p.price}, Offer=${p.offerPrice}, Stock=${p.stock}, isActive=${p.isActive}`);
                console.log(`  Variants: ${JSON.stringify(p.variants)}`);
            }
            break; // Stop after first success
        } catch (error) {
            console.log(`✗ Failed: ${error.message}`);
        }
    }
}

testApi();
