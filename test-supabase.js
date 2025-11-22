import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n')
  console.log('URL:', supabaseUrl)
  console.log('Key:', supabaseAnonKey.substring(0, 20) + '...\n')
  
  try {
    // Test 1: Check if we can connect
    console.log('1️⃣ Testing connection...')
    const { data, error } = await supabase.from('concerts').select('count')
    
    if (error) {
      console.error('❌ Connection error:', error.message)
      console.error('Error code:', error.code)
      console.error('Details:', error.details)
      console.error('Hint:', error.hint)
      return
    }
    
    console.log('✅ Connection successful!\n')
    
    // Test 2: Check if table exists and get current data
    console.log('2️⃣ Fetching existing concerts...')
    const { data: concerts, error: fetchError } = await supabase
      .from('concerts')
      .select('*')
    
    if (fetchError) {
      console.error('❌ Fetch error:', fetchError.message)
      console.error('Error code:', fetchError.code)
      console.error('Details:', fetchError.details)
      return
    }
    
    console.log(`✅ Found ${concerts.length} concert(s)`)
    if (concerts.length > 0) {
      console.log('Concerts:', concerts)
    }
    console.log('')
    
    // Test 3: Insert sample data if table is empty
    if (concerts.length === 0) {
      console.log('3️⃣ Inserting sample concerts...')
      const sampleConcerts = [
        {
          artist: "The Weeknd",
          date: "2024-07-12",
          location: "Stade de France",
          genre: "R&B / Pop",
          time: "20:00",
          comments: "Tournée After Hours til Dawn"
        },
        {
          artist: "Dua Lipa",
          date: "2024-05-28",
          location: "Accor Arena",
          genre: "Pop / Disco",
          time: "19:30",
          comments: "Radical Optimism Tour"
        },
        {
          artist: "Justice",
          date: "2024-06-15",
          location: "We Love Green",
          genre: "Electronic",
          time: "21:45",
          comments: "Tête d'affiche festival"
        }
      ]
      
      const { data: inserted, error: insertError } = await supabase
        .from('concerts')
        .insert(sampleConcerts)
        .select()
      
      if (insertError) {
        console.error('❌ Insert error:', insertError.message)
        console.error('Error code:', insertError.code)
        console.error('Details:', insertError.details)
        return
      }
      
      console.log(`✅ Inserted ${inserted.length} sample concerts!`)
      console.log('')
    }
    
    console.log('🎉 All tests passed! Supabase is configured correctly.')
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    console.error(err)
  }
}

testSupabaseConnection()
