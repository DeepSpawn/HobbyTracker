/**
 * Scrape Army Painter SKUs from official website
 *
 * Extracts product SKUs from Army Painter's product pages for:
 * - Warpaints Fanatic (WP3###P)
 * - Speedpaint 2.0 (WP2###)
 * - Warpaints Air (AW####)
 *
 * Usage:
 *   npm run ean:scrape:army-painter
 *   npm run ean:scrape:army-painter -- --collection=fanatic
 *   npm run ean:scrape:army-painter -- --collection=speedpaint
 *   npm run ean:scrape:army-painter -- --collection=air
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  collections: {
    fanatic: {
      name: 'Warpaints Fanatic',
      url: 'https://thearmypainter.com/collections/warpaints-fanatic',
      skuPattern: /WP3\d{3}P?/g,
    },
    speedpaint: {
      name: 'Speedpaint 2.0',
      url: 'https://thearmypainter.com/collections/speedpaint',
      skuPattern: /WP2\d{3}/g,
    },
    air: {
      name: 'Warpaints Air',
      url: 'https://thearmypainter.com/collections/warpaints-air',
      skuPattern: /AW[134]\d{3}/g,
    },
  },
  // Delay between requests to be polite
  requestDelay: 1000,
  // User agent to avoid being blocked
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

interface ScrapedProduct {
  name: string;
  sku: string;
  url: string;
  collection: string;
}

interface ScrapeResult {
  collection: string;
  collectionUrl: string;
  scrapedAt: string;
  totalProducts: number;
  products: ScrapedProduct[];
}

/**
 * Fetch a URL with retries
 */
async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': CONFIG.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`  Attempt ${attempt}/${retries} failed:`, error);
      if (attempt === retries) throw error;
      await delay(CONFIG.requestDelay * attempt);
    }
  }
  throw new Error('All retries failed');
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract products from collection page HTML
 */
function extractProductsFromHtml(
  html: string,
  collectionKey: string
): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const collection = CONFIG.collections[collectionKey as keyof typeof CONFIG.collections];

  // Look for product links and titles in the HTML
  // Army Painter uses Shopify, which typically has product data in JSON-LD or data attributes

  // Try to find JSON-LD product data
  const jsonLdMatches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  );

  for (const match of jsonLdMatches) {
    try {
      const jsonData = JSON.parse(match[1]);
      if (jsonData['@type'] === 'ItemList' && jsonData.itemListElement) {
        for (const item of jsonData.itemListElement) {
          if (item.item?.name && item.item?.url) {
            const name = item.item.name;
            const url = item.item.url;

            // Extract SKU from URL or name
            const skuMatch = url.match(collection.skuPattern) || name.match(collection.skuPattern);
            if (skuMatch) {
              products.push({
                name,
                sku: skuMatch[0].replace(/P$/, ''), // Remove trailing P
                url,
                collection: collection.name,
              });
            }
          }
        }
      }
    } catch {
      // JSON parse error, continue
    }
  }

  // Also try to extract from product links with data attributes
  const productLinkPattern =
    /<a[^>]*href="([^"]*\/products\/[^"]*)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/g;
  let productMatch;

  while ((productMatch = productLinkPattern.exec(html)) !== null) {
    const url = productMatch[1];
    const name = productMatch[2].trim();

    // Look for SKU in URL
    const urlSkuMatch = url.match(collection.skuPattern);
    if (urlSkuMatch) {
      // Avoid duplicates
      if (!products.some((p) => p.sku === urlSkuMatch[0].replace(/P$/, ''))) {
        products.push({
          name,
          sku: urlSkuMatch[0].replace(/P$/, ''),
          url: url.startsWith('http') ? url : `https://thearmypainter.com${url}`,
          collection: collection.name,
        });
      }
    }
  }

  // Also scan for SKU patterns anywhere in the HTML
  const allSkuMatches = html.matchAll(collection.skuPattern);
  for (const match of allSkuMatches) {
    const sku = match[0].replace(/P$/, '');
    if (!products.some((p) => p.sku === sku)) {
      // Try to find associated product name
      const skuIndex = match.index || 0;
      const contextStart = Math.max(0, skuIndex - 200);
      const contextEnd = Math.min(html.length, skuIndex + 200);
      const context = html.slice(contextStart, contextEnd);

      // Look for a product name in the context
      const titleMatch = context.match(/"title":\s*"([^"]+)"/);
      const nameMatch = context.match(/"name":\s*"([^"]+)"/);
      const name = titleMatch?.[1] || nameMatch?.[1] || `Unknown (${sku})`;

      products.push({
        name: name.replace(/\\u[\dA-Fa-f]{4}/g, ''), // Clean unicode escapes
        sku,
        url: '',
        collection: collection.name,
      });
    }
  }

  return products;
}

/**
 * Scrape a single collection
 */
async function scrapeCollection(collectionKey: string): Promise<ScrapeResult> {
  const collection = CONFIG.collections[collectionKey as keyof typeof CONFIG.collections];
  console.log(`\nScraping ${collection.name}...`);
  console.log(`  URL: ${collection.url}`);

  const allProducts: ScrapedProduct[] = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const url = page === 1 ? collection.url : `${collection.url}?page=${page}`;
    console.log(`  Fetching page ${page}...`);

    try {
      const html = await fetchWithRetry(url);
      const products = extractProductsFromHtml(html, collectionKey);

      if (products.length === 0) {
        hasMorePages = false;
      } else {
        // Deduplicate by SKU
        for (const product of products) {
          if (!allProducts.some((p) => p.sku === product.sku)) {
            allProducts.push(product);
          }
        }
        console.log(`    Found ${products.length} products (${allProducts.length} total unique)`);

        // Check if there are more pages
        hasMorePages = html.includes(`page=${page + 1}`) || html.includes('Next page');
        page++;

        if (hasMorePages) {
          await delay(CONFIG.requestDelay);
        }
      }
    } catch (error) {
      console.error(`  Error fetching page ${page}:`, error);
      hasMorePages = false;
    }
  }

  return {
    collection: collection.name,
    collectionUrl: collection.url,
    scrapedAt: new Date().toISOString(),
    totalProducts: allProducts.length,
    products: allProducts,
  };
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const collectionArg = args.find((a) => a.startsWith('--collection='));
  const collectionKey = collectionArg?.split('=')[1];

  console.log('Army Painter SKU Scraper');
  console.log('========================');

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const results: ScrapeResult[] = [];

  if (collectionKey) {
    // Scrape single collection
    if (!(collectionKey in CONFIG.collections)) {
      console.error(`Unknown collection: ${collectionKey}`);
      console.error(`Available: ${Object.keys(CONFIG.collections).join(', ')}`);
      process.exit(1);
    }
    const result = await scrapeCollection(collectionKey);
    results.push(result);
  } else {
    // Scrape all collections
    for (const key of Object.keys(CONFIG.collections)) {
      const result = await scrapeCollection(key);
      results.push(result);
      await delay(CONFIG.requestDelay * 2);
    }
  }

  // Combine all products
  const allProducts: ScrapedProduct[] = [];
  for (const result of results) {
    for (const product of result.products) {
      if (!allProducts.some((p) => p.sku === product.sku)) {
        allProducts.push(product);
      }
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  for (const result of results) {
    console.log(`${result.collection}: ${result.totalProducts} products`);
  }
  console.log(`Total unique SKUs: ${allProducts.length}`);

  // Save results
  const outputData = {
    scrapedAt: new Date().toISOString(),
    collections: results,
    allProducts,
    stats: {
      fanatic: allProducts.filter((p) => p.sku.startsWith('WP3')).length,
      speedpaint: allProducts.filter((p) => p.sku.startsWith('WP2')).length,
      air: allProducts.filter((p) => p.sku.startsWith('AW')).length,
    },
  };

  const outputPath = path.join(
    CONFIG.outputDir,
    `army-painter-skus-scraped-${new Date().toISOString().split('T')[0]}.json`
  );
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  // Show sample SKUs
  console.log('\nSample SKUs found:');
  const fanatic = allProducts.filter((p) => p.sku.startsWith('WP3')).slice(0, 5);
  const speedpaint = allProducts.filter((p) => p.sku.startsWith('WP2')).slice(0, 5);
  const air = allProducts.filter((p) => p.sku.startsWith('AW')).slice(0, 5);

  if (fanatic.length > 0) {
    console.log('  Warpaints Fanatic:');
    fanatic.forEach((p) => console.log(`    ${p.sku} - ${p.name}`));
  }
  if (speedpaint.length > 0) {
    console.log('  Speedpaint 2.0:');
    speedpaint.forEach((p) => console.log(`    ${p.sku} - ${p.name}`));
  }
  if (air.length > 0) {
    console.log('  Warpaints Air:');
    air.forEach((p) => console.log(`    ${p.sku} - ${p.name}`));
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
