#!/usr/bin/env node

import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Scrape concerts from a Last.fm user's events page
 */
async function scrapeLastfmUserEvents(username) {
  let browser;
  
  try {
    console.log('\n🎵 Lancement du navigateur...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    const url = `https://www.last.fm/fr/user/${username}/events`;
    console.log(`🌐 Navigation vers ${url}...`);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('⏳ Chargement des événements...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('📊 Extraction des données...');
    
    const concerts = await page.evaluate(() => {
      const results = [];
      const eventCards = document.querySelectorAll('.events-list-item, .event-list-item, [class*="EventListItem"], .chartlist-row');
      
      eventCards.forEach((card) => {
        try {
          let artist = 'Unknown Artist';
          const artistElement = card.querySelector('.event-name a, h3 a, .link-block-target, [class*="artist"] a, .chartlist-name a');
          if (artistElement) {
            artist = artistElement.textContent.trim();
          }
          
          let location = 'Paris';
          const venueElement = card.querySelector('.event-venue, [class*="venue"], .chartlist-venue');
          if (venueElement) {
            location = venueElement.textContent.trim().split('\n')[0].trim();
          }
          
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
              const dateText = dateElement.textContent.trim();
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
          
          let eventUrl = '';
          const linkElement = card.querySelector('a[href*="/event/"]');
          if (linkElement) {
            const href = linkElement.getAttribute('href');
            eventUrl = href.startsWith('http') ? href : `https://www.last.fm${href}`;
          }
          
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
          // Skip errors
        }
      });
      
      return results;
    });
    
    return concerts;
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Import concerts to Supabase
 */
async function importConcertsToSupabase(concerts) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const concert of concerts) {
    try {
      const { error } = await supabase
        .from('concerts')
        .insert([concert]);

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

/**
 * Main function
 */
async function main() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  Import Last.fm → Paris Concert Info  ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const username = await question('👤 Nom d\'utilisateur Last.fm (défaut: saiff): ');
    const finalUsername = username.trim() || 'saiff';
    
    console.log(`\n🎵 Récupération des concerts de ${finalUsername}...\n`);
    
    const concerts = await scrapeLastfmUserEvents(finalUsername);
    
    if (concerts.length === 0) {
      console.log('⚠️  Aucun concert trouvé sur cette page Last.fm.');
      rl.close();
      return;
    }
    
    console.log(`\n✅ ${concerts.length} concerts trouvés :\n`);
    concerts.forEach((concert, i) => {
      console.log(`${i + 1}. ${concert.artist}`);
      console.log(`   📍 ${concert.location}`);
      console.log(`   📅 ${concert.date} à ${concert.time}\n`);
    });
    
    const confirm = await question('💾 Importer ces concerts dans Supabase ? (o/N): ');
    
    if (confirm.toLowerCase() !== 'o') {
      console.log('\n❌ Import annulé.');
      rl.close();
      return;
    }
    
    console.log('\n💾 Import en cours...\n');
    const results = await importConcertsToSupabase(concerts);
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║         Résultat de l\'import          ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log(`✅ Succès : ${results.success}`);
    console.log(`❌ Échecs : ${results.failed}\n`);
    
    if (results.errors.length > 0) {
      console.log('Détails des erreurs :');
      results.errors.forEach(err => {
        console.log(`  - ${err.concert}: ${err.error}`);
      });
    }
    
    rl.close();
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();
