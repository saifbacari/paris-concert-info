import React, { useState } from 'react';
import LocationSearchInput from './LocationSearchInput';
import ArtistSearchInput from './ArtistSearchInput';
import './ConcertForm.css';

const ConcertForm = ({ concert, onAddConcert, onUpdateConcert, onClose }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        artist: concert?.artist || '',
        date: concert?.date || '',
        location: concert?.location || '',
        genre: concert?.genre || '',
        time: concert?.time || '',
        comments: concert?.comments || ''
    });

    const isEditing = !!concert;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleNext = (e) => {
        e.preventDefault();
        if (step < 3) setStep(step + 1);
    };

    const handlePrev = (e) => {
        e.preventDefault();
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted with data:', formData);

        if (!formData.artist || !formData.date || !formData.location) {
            console.log('Validation failed:', {
                artist: formData.artist,
                date: formData.date,
                location: formData.location
            });
            return;
        }

        console.log('Validation passed, saving...');

        if (isEditing) {
            onUpdateConcert({
                ...formData,
                id: concert.id
            });
        } else {
            // Don't send id - Supabase will auto-generate UUID
            onAddConcert(formData);
        }
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="concert-form-container modal-content">
                <button className="close-btn" onClick={onClose}>&times;</button>

                <div className="stepper">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>1. L'Essentiel</div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Détails</div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Infos</div>
                </div>

                <h3>{isEditing ? 'Modifier le Concert' : 'Ajouter un Concert'}</h3>

                <form onSubmit={handleSubmit} className="concert-form">
                    {step === 1 && (
                        <div className="form-step fade-in">
                            <div className="form-group">
                                <label htmlFor="artist">Artiste *</label>
                                <ArtistSearchInput
                                    value={formData.artist}
                                    onChange={handleChange}
                                    placeholder="Rechercher un artiste..."
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="date">Date *</label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="form-step fade-in">
                            <div className="form-group">
                                <label htmlFor="location">Lieu *</label>
                                <LocationSearchInput
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="Rechercher une salle ou une ville..."
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="time">Heure</label>
                                <input
                                    type="time"
                                    id="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="form-step fade-in">
                            <div className="form-group">
                                <label htmlFor="genre">Genre</label>
                                <input
                                    type="text"
                                    id="genre"
                                    name="genre"
                                    value={formData.genre}
                                    onChange={handleChange}
                                    placeholder="Pop, Rock, Rap..."
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="comments">Commentaires</label>
                                <textarea
                                    id="comments"
                                    name="comments"
                                    value={formData.comments}
                                    onChange={handleChange}
                                    placeholder="Notes supplémentaires..."
                                    rows="3"
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        {step > 1 && (
                            <button type="button" className="nav-btn prev" onClick={handlePrev}>
                                Précédent
                            </button>
                        )}

                        {step < 3 ? (
                            <button type="button" className="nav-btn next" onClick={handleNext}>
                                Suivant
                            </button>
                        ) : (
                            <button type="submit" className="submit-btn">
                                {isEditing ? 'Mettre à jour' : 'Terminer'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConcertForm;
