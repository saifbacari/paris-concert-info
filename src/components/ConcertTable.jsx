import React from 'react';
import './ConcertTable.css';

const ConcertTable = ({ concerts, onEditConcert, onDeleteConcert }) => {
    // Helper function to format time (remove seconds)
    const formatTime = (time) => {
        if (!time) return '';
        // If time is in HH:MM:SS format, extract only HH:MM
        return time.substring(0, 5);
    };

    // Helper function to detect and render URLs as clickable links
    const renderCommentWithLinks = (text) => {
        if (!text) return null;

        // Regex to detect URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="comment-link"
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div className="concert-table-container">
            <div className="table-header">
                <h2>Concerts à Venir</h2>
                <p>Les meilleurs événements musicaux de Paris</p>
            </div>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Artiste</th>
                            <th>Date</th>
                            <th>Lieu</th>
                            <th>Genre</th>
                            <th>Heure</th>
                            <th>Commentaires</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {concerts.map((concert) => (
                            <tr key={concert.id}>
                                <td className="artist-cell">{concert.artist}</td>
                                <td>{new Date(concert.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                                <td>{concert.location}</td>
                                <td><span className="genre-tag">{concert.genre}</span></td>
                                <td>{formatTime(concert.time)}</td>
                                <td className="comment-cell">{renderCommentWithLinks(concert.comments)}</td>
                                <td className="actions-cell">
                                    <button
                                        className="edit-btn"
                                        onClick={() => onEditConcert(concert)}
                                        title="Modifier"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button
                                        className="delete-btn"
                                        onClick={() => onDeleteConcert(concert.id)}
                                        title="Supprimer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {concerts.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    Aucun concert prévu pour le moment.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ConcertTable;
