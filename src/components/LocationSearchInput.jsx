import React, { useState, useEffect, useRef } from 'react';
import './LocationSearchInput.css';

const LocationSearchInput = ({ value, onChange, placeholder, required, autoFocus }) => {
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

        if (inputValue.length < 3) {
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
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&limit=5&addressdetails=1`,
                    {
                        headers: {
                            'User-Agent': 'Paris-Concert-Info/1.0' // Good practice for Nominatim
                        }
                    }
                );
                const data = await response.json();
                setSuggestions(data);
                setIsOpen(true);
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching location suggestions:", error);
                setIsLoading(false);
            }
        }, 500); // 500ms debounce delay
    };

    const handleSelect = (suggestion) => {
        // Extract only the first part (venue name) instead of full address
        const venueName = suggestion.display_name.split(',')[0].trim();
        setQuery(venueName);
        setSuggestions([]);
        setIsOpen(false);

        // Create a synthetic event to match the parent's expected interface
        onChange({ target: { name: 'location', value: venueName } });
    };

    return (
        <div className="location-search-wrapper" ref={wrapperRef}>
            <input
                type="text"
                id="location"
                name="location"
                value={query}
                onChange={handleInputChange}
                placeholder={placeholder}
                required={required}
                autoFocus={autoFocus}
                autoComplete="off"
                className="location-input"
            />

            {isLoading && (
                <div className="loading-indicator">
                    Recherche en cours...
                </div>
            )}

            {isOpen && suggestions.length > 0 && !isLoading && (
                <ul className="suggestions-list">
                    {suggestions.map((suggestion) => (
                        <li
                            key={suggestion.place_id}
                            onClick={() => handleSelect(suggestion)}
                        >
                            <span className="suggestion-main">{suggestion.display_name.split(',')[0]}</span>
                            <span className="suggestion-detail">{suggestion.display_name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationSearchInput;
