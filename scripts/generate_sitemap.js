const path = require('path');
const fs = require('fs');

async function generateSitemap() {
  const DOMAIN = 'https://www.mansarafoods.com';
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/products', priority: '0.9', changefreq: 'daily' },
    { url: '/combos', priority: '0.9', changefreq: 'weekly' },
    { url: '/offers', priority: '0.8', changefreq: 'weekly' },
    { url: '/new-arrivals', priority: '0.8', changefreq: 'weekly' },
    { url: '/about', priority: '0.7', changefreq: 'monthly' },
    { url: '/contact', priority: '0.7', changefreq: 'monthly' },
    { url: '/blog', priority: '0.7', changefreq: 'weekly' },
    { url: '/blog/health-mix-for-babies-and-kids', priority: '0.8', changefreq: 'weekly' },
    { url: '/blog/health-mix-for-weight-loss', priority: '0.8', changefreq: 'weekly' },
    { url: '/blog/millet-mix-for-diabetics', priority: '0.8', changefreq: 'weekly' },
    { url: '/blog/international-shipping-south-indian-food', priority: '0.8', changefreq: 'weekly' },
    { url: '/press', priority: '0.6', changefreq: 'monthly' },
    { url: '/careers', priority: '0.5', changefreq: 'monthly' },
    { url: '/terms-and-conditions', priority: '0.3', changefreq: 'yearly' },
    { url: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
    { url: '/delivery-shipping-policy', priority: '0.3', changefreq: 'yearly' },
    { url: '/refund-return-policy', priority: '0.3', changefreq: 'yearly' },
  ];

  let productSlugs = [];

  // Read fallback products data to extract all live product slugs
  try {
    const fallbackPath = path.join(__dirname, '../../mansara-nourish-hub/src/data/fallbackProducts.ts');
    if (fs.existsSync(fallbackPath)) {
      const content = fs.readFileSync(fallbackPath, 'utf-8');
      const match = content.match(/export const fallbackProducts: Product\[\] = (\[[\s\S]*\]);/);
      if (match) {
        const products = JSON.parse(match[1]);
        productSlugs = products.map(p => p.slug).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn('[SITEMAP] Could not parse fallbackProducts.ts:', err.message);
  }

  // Fallback list of known slugs if file reading fails
  if (productSlugs.length === 0) {
    productSlugs = [
      'urad-porridge-mix-classic',
      'urad-porridge-mix-salt-pepper',
      'urad-porridge-mix-millet-magic',
      'urad-porridge-mix-premium',
      'black-rice-delight-porridge-mix',
      'nutrimix-super-health-mix',
      'ragi-choco-malt',
      'millet-fusion-idly-podi',
      'curry-leaf-podi-mix',
      'kotha-malli-aroma',
      'murungai-vital',
      'pirandai-power'
    ];
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Static Pages
  staticPages.forEach(page => {
    xml += `  <url>
    <loc>${DOMAIN}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });

  // Dynamic Product Pages
  productSlugs.forEach(slug => {
    xml += `  <url>
    <loc>${DOMAIN}/product/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  });

  xml += `</urlset>\n`;

  const sitemapPath = path.join(__dirname, '../../mansara-nourish-hub/public/sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf-8');
  console.log(`✅ Successfully generated sitemap.xml with ${staticPages.length + productSlugs.length} URLs at: ${sitemapPath}`);
}

generateSitemap();
