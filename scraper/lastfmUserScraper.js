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
 * Scrape concerts from a Last.fm user's events page
 * @param {string} username - Last.fm username
 * @returns {Promise<Array>} - Array of concert objects
 */
export async function scrapeLastfmUserEvents(username) {
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
    
    const url = `https://www.last.fm/fr/user/${username}/events`;
    console.log(`🌐 Navigating to ${url}...`);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for events to load
    console.log('⏳ Waiting for events to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('📊 Extracting concert data...');
    
    // Extract concert data
    const concerts = await page.evaluate(() => {
      const results = [];
      
      // Try to find event cards
      const eventCards = document.querySelectorAll('.events-list-item, .event-list-item, [class*="EventListItem"], .chartlist-row');
      
      console.log(`Found ${eventCards.length} event cards`);
      
      eventCards.forEach((card) => {
        try {
          // Extract artist name
          let artist = 'Unknown Artist';
          const artistElement = card.querySelector('.event-name a, h3 a, .link-block-target, [class*="artist"] a, .chartlist-name a');
          if (artistElement) {
            artist = artistElement.textContent.trim();
          }
          
          // Extract venue/location
          let location = 'Paris';
          const venueElement = card.querySelector('.event-venue, [class*="venue"], .chartlist-venue');
          if (venueElement) {
            location = venueElement.textContent.trim().split('\n')[0].trim();
          }
          
          // Extract date and time
          let date = new Date().toISOString().split('T')[0];
          let time = '20:00';
          
          const dateElement = card.querySelector('time, .event-date, [class*="date"], .chartlist-timestamp');
          if (dateElement) {
            const datetime = dateElement.getAttribute('datetime');
            if (datetime) {
              const parsedDate = new Date(datetime);
              if (!isNaN(parsedDate.getTime())) {
                date = parsedDate.toISOString().split('T')[0];
                const hours = parsedDate.getHours().toString().padStart(2, '0');
                const minutes = parsedDate.getMinutes().toString().padStart(2, '0');
                time = `${hours}:${minutes}`;
              }
            } else {
              // Try to parse text content
              const dateText = dateElement.textContent.trim();
              // Format might be like "22 nov. 2025"
              const match = dateText.match(/(\d{1,2})\s+(\w+)\.?\s+(\d{4})/);
              if (match) {
                const months = {
                  'jan': '01', 'fév': '02', 'mar': '03', 'avr': '04',
                  'mai': '05', 'juin': '06', 'juil': '07', 'août': '08',
                  'sep': '09', 'oct': '10', 'nov': '11', 'déc': '12'
                };
                const day = match[1].padStart(2, '0');
                const month = months[match[2].toLowerCase()] || '01';
                const year = match[3];
                date = `${year}-${month}-${day}`;
              }
            }
          }
          
          // Extract event URL
          let eventUrl = '';
          const linkElement = card.querySelector('a[href*="/event/"]');
          if (linkElement) {
            const href = linkElement.getAttribute('href');
            eventUrl = href.startsWith('http') ? href : `https://www.last.fm${href}`;
          }
          
          // Only add if we have at least an artist name
          if (artist !== 'Unknown Artist') {
            results.push({
              artist,
              date,
              time,
              location,
              genre: 'Concert',
              comments: eventUrl ? `🎵 Last.fm: ${eventUrl}` : ''
            });
          }
        } catch (error) {
          console.log('Error extracting event:', error);
        }
      });
      
      return results;
    });
    
    console.log(`✅ Scraped ${concerts.length} concerts from user events`);
    
    return concerts;
    
  } catch (error) {
    console.error('❌ Error scraping Last.fm user events:', error.message);
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
export async function importConcertsToSupabase(concerts) {
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
    const username = 'saiff'; // Your Last.fm username
    console.log(`\n🎵 Scraping Last.fm events for user: ${username}\n`);
    
    const concerts = await scrapeLastfmUserEvents(username);
    
    console.log('\n📋 Scraped concerts:');
    concerts.forEach((concert, i) => {
      console.log(`\n${i + 1}. ${concert.artist}`);
      console.log(`   Venue: ${concert.location}`);
      console.log(`   Date: ${concert.date} at ${concert.time}`);
      console.log(`   Link: ${concert.comments}`);
    });
    
    if (concerts.length > 0) {
      console.log('\n💾 Importing to Supabase...');
      const results = await importConcertsToSupabase(concerts);
      console.log(`\n✅ Import complete:`);
      console.log(`   Success: ${results.success}`);
      console.log(`   Failed: ${results.failed}`);
      if (results.errors.length > 0) {
        console.log(`\n❌ Errors:`);
        results.errors.forEach(err => {
          console.log(`   - ${err.concert}: ${err.error}`);
        });
      }
    } else {
      console.log('\n⚠️  No concerts found. Make sure you have events in your Last.fm profile.');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  test();
}

export default scrapeLastfmUserEvents;
