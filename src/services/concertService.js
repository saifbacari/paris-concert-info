import { supabase } from '../lib/supabase'

export const concertService = {
  // Fetch all concerts
  async fetchConcerts() {
    const { data, error } = await supabase
      .from('concerts')
      .select('*')
      .order('date', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Create a new concert
  async createConcert(concert) {
    const { data, error } = await supabase
      .from('concerts')
      .insert([concert])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update an existing concert
  async updateConcert(id, concert) {
    const { data, error } = await supabase
      .from('concerts')
      .update(concert)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete a concert
  async deleteConcert(id) {
    const { error } = await supabase
      .from('concerts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}
