const path = require('path');
const fs = require('fs');

const DOMAIN = 'https://www.mansarafoods.com';
const API_BASE = process.env.VITE_API_URL || 'https://mansara-backend.onrender.com/api';

const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'daily', lastmod: '2026-08-12' },
  { url: '/products', priority: '0.9', changefreq: 'daily', lastmod: '2026-08-12' },
  { url: '/combos', priority: '0.9', changefreq: 'weekly', lastmod: '2026-08-12' },
  { url: '/offers', priority: '0.8', changefreq: 'weekly', lastmod: '2026-08-12' },
  { url: '/new-arrivals', priority: '0.8', changefreq: 'weekly', lastmod: '2026-08-12' },
  { url: '/about', priority: '0.7', changefreq: 'monthly', lastmod: '2026-08-12' },
  { url: '/contact', priority: '0.7', changefreq: 'monthly', lastmod: '2026-08-12' },
  { url: '/blog', priority: '0.7', changefreq: 'weekly', lastmod: '2026-08-12' },
  { url: '/press', priority: '0.6', changefreq: 'monthly', lastmod: '2026-08-12' },
  { url: '/careers', priority: '0.5', changefreq: 'monthly', lastmod: '2026-08-12' },
  { url: '/terms-and-conditions', priority: '0.3', changefreq: 'yearly', lastmod: '2026-08-12' },
  { url: '/privacy-policy', priority: '0.3', changefreq: 'yearly', lastmod: '2026-08-12' },
  { url: '/delivery-shipping-policy', priority: '0.3', changefreq: 'yearly', lastmod: '2026-08-12' },
  { url: '/refund-return-policy', priority: '0.3', changefreq: 'yearly', lastmod: '2026-08-12' },
];

async function fetchFromApi(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : (json.items || []);
  } catch (err) {
    return [];
  }
}

function parseProductsFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const items = [];
  const productsSection = content.includes('export const products')
    ? content.slice(content.indexOf('export const products'))
    : content;

  const slugRegex = /"slug":\s*"([^"]+)"/g;
  let match;
  while ((match = slugRegex.exec(productsSection)) !== null) {
    const slug = match[1];
    // Exclude category slugs if present
    if (slug && !['urad-porridge-mix', 'black-rice-mix', 'millet-fusion-mix', 'combos', 'idly-podi', 'rice-mixes'].includes(slug)) {
      if (!items.some(i => i.slug === slug)) {
        items.push({ slug, lastmod: '2026-08-12' });
      }
    }
  }
  return items;
}

function parseBlogPostsFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const posts = [];
  const postRegex = /_id:\s*["'][^"']+["'][\s\S]*?slug:\s*["']([^"']+)["'][\s\S]*?createdAt:\s*["']([^"']+)["']/g;
  let match;
  while ((match = postRegex.exec(content)) !== null) {
    const slug = match[1];
    const dateStr = match[2].split('T')[0];
    if (slug && !posts.some(p => p.slug === slug)) {
      posts.push({ slug, lastmod: dateStr });
    }
  }
  return posts;
}

async function generateSitemap() {
  console.log('🌐 Generating sitemap.xml …');

  // 1. Resolve Products
  let products = [];
  const apiProducts = await fetchFromApi('/products');
  if (apiProducts.length > 0) {
    products = apiProducts
      .filter(p => p.slug && !['urad-porridge-mix', 'black-rice-mix', 'millet-fusion-mix', 'combos', 'idly-podi', 'rice-mixes'].includes(p.slug))
      .map(p => ({
        slug: p.slug,
        lastmod: (p.updatedAt || p.createdAt || '2026-08-12').split('T')[0]
      }));
  }
  if (products.length === 0) {
    const productsPath = path.join(__dirname, '../../mansara-nourish-hub/src/data/products.ts');
    products = parseProductsFile(productsPath);
  }

  // 2. Resolve Blog Posts
  let blogPosts = [];
  const apiBlogs = await fetchFromApi('/blog');
  if (apiBlogs.length > 0) {
    blogPosts = apiBlogs
      .filter(b => b.slug && b.title)
      .map(b => ({
        slug: b.slug || b._id,
        lastmod: (b.updatedAt || b.createdAt || b.publishedAt || '2026-08-10').split('T')[0]
      }));
  }
  if (blogPosts.length === 0) {
    const blogPath = path.join(__dirname, '../../mansara-nourish-hub/src/data/blogPosts.ts');
    blogPosts = parseBlogPostsFile(blogPath);
  }

  console.log(`📦 Sitemap source data: ${staticPages.length} static pages, ${products.length} products, ${blogPosts.length} blog posts`);

  // 3. Build XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Static Pages
  staticPages.forEach(page => {
    xml += `  <url>\n    <loc>${DOMAIN}${page.url}</loc>\n    <lastmod>${page.lastmod}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
  });

  // Blog Posts
  blogPosts.forEach(post => {
    xml += `  <url>\n    <loc>${DOMAIN}/blog/${post.slug}</loc>\n    <lastmod>${post.lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  // Products
  products.forEach(prod => {
    xml += `  <url>\n    <loc>${DOMAIN}/product/${prod.slug}</loc>\n    <lastmod>${prod.lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  xml += `</urlset>\n`;

  const sitemapPath = path.join(__dirname, '../../mansara-nourish-hub/public/sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf-8');
  console.log(`✅ Successfully generated sitemap.xml with ${staticPages.length + blogPosts.length + products.length} URLs at: ${sitemapPath}`);
}

generateSitemap();

