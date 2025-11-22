import React, { useState, useEffect, useRef } from 'react';
import './ArtistSearchInput.css';

const ArtistSearchInput = ({ value, onChange, placeholder, required, autoFocus }) => {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef(null);
    const debounceTimer = useRef(null);

    // Update internal query if external value changes
    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleInputChange = (e) => {
        const inputValue = e.target.value;
        setQuery(inputValue);
        onChange(e); // Propagate change to parent immediately

        // Clear previous timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        if (inputValue.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            setIsLoading(false);
            return;
        }

        // Show loading state
        setIsLoading(true);

        // Debounce: wait 500ms before making API call
        debounceTimer.current = setTimeout(async () => {
            try {
                // MusicBrainz API - Free, no auth required!
                const response = await fetch(
                    `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(inputValue)}&fmt=json&limit=5`,
                    {
                        headers: {
                            'User-Agent': 'ParisConcertInfo/1.0 (contact@example.com)'
                        }
                    }
                );
                const data = await response.json();
                setSuggestions(data.artists || []);
                setIsOpen(true);
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching artist suggestions:", error);
                setIsLoading(false);
            }
        }, 500); // 500ms debounce delay
    };

    const handleSelect = (artist) => {
        const artistName = artist.name;
        setQuery(artistName);
        setSuggestions([]);
        setIsOpen(false);

        // Create a synthetic event to match the parent's expected interface
        onChange({ target: { name: 'artist', value: artistName } });
    };

    const getArtistType = (artist) => {
        if (artist.type) {
            const types = {
                'Person': '👤 Solo',
                'Group': '👥 Groupe',
                'Orchestra': '🎻 Orchestre',
                'Choir': '🎤 Chorale'
            };
            return types[artist.type] || artist.type;
        }
        return '';
    };

    const getArtistCountry = (artist) => {
        if (artist.country) {
            return `🌍 ${artist.country}`;
        }
        if (artist.area?.name) {
            return `📍 ${artist.area.name}`;
        }
        return '';
    };

    return (
        <div className="artist-search-wrapper" ref={wrapperRef}>
            <input
                type="text"
                id="artist"
                name="artist"
                value={query}
                onChange={handleInputChange}
                placeholder={placeholder}
                required={required}
                autoFocus={autoFocus}
                autoComplete="off"
                className="artist-input"
            />

            {isLoading && (
                <div className="loading-indicator">
                    Recherche d'artistes...
                </div>
            )}

            {isOpen && suggestions.length > 0 && !isLoading && (
                <ul className="suggestions-list">
                    {suggestions.map((artist) => (
                        <li
                            key={artist.id}
                            onClick={() => handleSelect(artist)}
                            className="artist-suggestion"
                        >
                            <div className="artist-info">
                                <span className="artist-name">{artist.name}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ArtistSearchInput;
