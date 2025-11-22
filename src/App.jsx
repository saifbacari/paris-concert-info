import React, { useState, useEffect } from 'react'
import ConcertTable from './components/ConcertTable'
import ConcertForm from './components/ConcertForm'
import { concertService } from './services/concertService'
import './App.css'

function App() {
  const [concerts, setConcerts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConcert, setEditingConcert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch concerts on mount
  useEffect(() => {
    loadConcerts();
  }, []);

  const loadConcerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await concertService.fetchConcerts();
      setConcerts(data || []);
    } catch (err) {
      console.error('Error loading concerts:', err);
      setError('Impossible de charger les concerts. Vérifiez votre configuration Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConcert = async (newConcert) => {
    try {
      const created = await concertService.createConcert(newConcert);
      setConcerts(prev => [...prev, created]);
    } catch (err) {
      console.error('Error adding concert:', err);
      setError('Impossible d\'ajouter le concert.');
    }
  };

  const handleEditConcert = (concert) => {
    setEditingConcert(concert);
    setIsModalOpen(true);
  };

  const handleUpdateConcert = async (updatedConcert) => {
    try {
      const updated = await concertService.updateConcert(updatedConcert.id, updatedConcert);
      setConcerts(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      console.error('Error updating concert:', err);
      setError('Impossible de mettre à jour le concert.');
    }
  };

  const handleDeleteConcert = async (concertId) => {
    // Confirmation before deleting
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce concert ?')) {
      return;
    }

    try {
      await concertService.deleteConcert(concertId);
      setConcerts(prev => prev.filter(c => c.id !== concertId));
    } catch (err) {
      console.error('Error deleting concert:', err);
      setError('Impossible de supprimer le concert.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConcert(null);
  };

  if (loading) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>PARIS CONCERT INFO</h1>
        </header>
        <main>
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            Chargement des concerts...
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>PARIS CONCERT INFO</h1>
        </header>
        <main>
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p style={{ color: 'var(--accent-secondary)', marginBottom: '1rem' }}>{error}</p>
            <button className="add-concert-btn" onClick={loadConcerts}>
              Réessayer
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>PARIS CONCERT INFO</h1>
      </header>
      <main>
        <div className="actions-bar">
          <button className="add-concert-btn" onClick={() => setIsModalOpen(true)}>
            + Ajouter un concert
          </button>
        </div>

        {isModalOpen && (
          <ConcertForm
            concert={editingConcert}
            onAddConcert={handleAddConcert}
            onUpdateConcert={handleUpdateConcert}
            onClose={handleCloseModal}
          />
        )}

        <ConcertTable
          concerts={concerts}
          onEditConcert={handleEditConcert}
          onDeleteConcert={handleDeleteConcert}
        />
      </main>
    </div>
  )
}

export default App
