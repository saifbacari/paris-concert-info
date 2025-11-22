import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Scrape concerts from Last.fm for a specific city
 * @param {string} city - City name (e.g., "Paris")
 * @param {number} limit - Maximum number of concerts to scrape
 * @returns {Promise<Array>} - Array of concert objects
 */
export async function scrapeLastfmConcerts(city = 'Paris', limit = 20) {
  let browser;
  
  try {
    console.log('🎵 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`🌐 Navigating to Last.fm events for ${city}...`);
    const url = `https://www.last.fm/events?location=${encodeURIComponent(city)}`;
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for events to load
    console.log('⏳ Waiting for events to load...');
    await page.waitForSelector('.events-list, .event-list-item, [class*="event"]', {
      timeout: 10000
    }).catch(() => {
      console.log('⚠️  Event list not found with standard selectors');
    });
    
    // Wait a bit more for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📊 Extracting concert data...');
    
    // Extract concert data
    const concerts = await page.evaluate((maxConcerts) => {
      const results = [];
      
      // Try multiple selectors to find event items
      const selectors = [
        '.events-list-item',
        '.event-list-item',
        '[class*="EventListItem"]',
        'article[class*="event"]',
        '.event'
      ];
      
      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);
          break;
        }
      }
      
      if (eventElements.length === 0) {
        console.log('No events found, trying alternative approach...');
        // Try to find any links to event pages
        const eventLinks = document.querySelectorAll('a[href*="/event/"]');
        console.log(`Found ${eventLinks.length} event links`);
        
        if (eventLinks.length === 0) {
          return results;
        }
      }
      
      // Extract data from each event
      for (let i = 0; i < Math.min(eventElements.length, maxConcerts); i++) {
        const element = eventElements[i];
        
        try {
          // Try to extract artist name
          const artistElement = element.querySelector('.event-name, h3, h2, [class*="artist"], [class*="name"]');
          const artist = artistElement?.textContent?.trim() || 'Unknown Artist';
          
          // Try to extract venue
          const venueElement = element.querySelector('.event-venue, [class*="venue"], [class*="location"]');
          const venue = venueElement?.textContent?.trim() || city;
          
          // Try to extract date
          const dateElement = element.querySelector('time, .event-date, [class*="date"]');
          let date = new Date().toISOString().split('T')[0];
          let time = '20:00';
          
          if (dateElement) {
            const dateStr = dateElement.getAttribute('datetime') || dateElement.textContent;
            if (dateStr) {
              try {
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                  date = parsedDate.toISOString().split('T')[0];
                  time = parsedDate.toTimeString().substring(0, 5);
                }
              } catch (e) {
                console.log('Error parsing date:', e);
              }
            }
          }
          
          // Try to extract link
          const linkElement = element.querySelector('a[href*="/event/"]');
          const eventUrl = linkElement ? `https://www.last.fm${linkElement.getAttribute('href')}` : '';
          
          results.push({
            artist,
            date,
            time,
            location: venue,
            genre: 'Concert',
            comments: eventUrl ? `🎵 Last.fm: ${eventUrl}` : 'Via Last.fm'
          });
        } catch (error) {
          console.log('Error extracting event data:', error);
        }
      }
      
      return results;
    }, limit);
    
    console.log(`✅ Scraped ${concerts.length} concerts from Last.fm`);
    
    return concerts;
    
  } catch (error) {
    console.error('❌ Error scraping Last.fm:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Import scraped concerts to Supabase
 */
export async function importLastfmConcertsToSupabase(concerts) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const concert of concerts) {
    try {
      const { data, error } = await supabase
        .from('concerts')
        .insert([concert])
        .select();

      if (error) {
        results.failed++;
        results.errors.push({ concert: concert.artist, error: error.message });
      } else {
        results.success++;
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ concert: concert.artist, error: err.message });
    }
  }

  return results;
}

// Test function
async function test() {
  try {
    console.log('\n🎵 Testing Last.fm scraper for Paris...\n');
    const concerts = await scrapeLastfmConcerts('Paris', 10);
    
    console.log('\n📋 Scraped concerts:');
    concerts.forEach((concert, i) => {
      console.log(`\n${i + 1}. ${concert.artist}`);
      console.log(`   Venue: ${concert.location}`);
      console.log(`   Date: ${concert.date} at ${concert.time}`);
      console.log(`   Link: ${concert.comments}`);
    });
    
    if (concerts.length > 0) {
      console.log('\n💾 Importing to Supabase...');
      const results = await importLastfmConcertsToSupabase(concerts);
      console.log(`\n✅ Import complete:`);
      console.log(`   Success: ${results.success}`);
      console.log(`   Failed: ${results.failed}`);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  test();
}

export default scrapeLastfmConcerts;
