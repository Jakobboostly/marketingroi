import React, { useState, useCallback } from 'react';
import { placesAPI, PlaceSearchResult, RestaurantIntelligence } from '../services/placesAPI';

interface RestaurantSearchProps {
  onRestaurantSelected: (intelligence: RestaurantIntelligence) => void;
  onSkip: () => void;
}

const RestaurantSearch: React.FC<RestaurantSearchProps> = ({ onRestaurantSelected, onSkip }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await placesAPI.searchRestaurants(searchQuery);
      setSearchResults(results.slice(0, 5)); // Limit to top 5 results
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleRestaurantSelect = async (place: PlaceSearchResult) => {
    setSelectedPlaceId(place.place_id);
    setIsLoadingDetails(true);
    
    try {
      const placeDetails = await placesAPI.getPlaceDetails(place.place_id);
      if (placeDetails) {
        const intelligence = placesAPI.estimateRestaurantMetrics(placeDetails);
        onRestaurantSelected(intelligence);
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    } finally {
      setIsLoadingDetails(false);
      setSelectedPlaceId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #8b9cf4 0%, #a97fc4 100%)',
      padding: '40px 20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '60px' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            color: 'white',
            marginBottom: '20px',
            textShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            Find Your Restaurant
          </h1>
          <p style={{
            fontSize: '1.3rem',
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '40px',
            lineHeight: '1.6'
          }}>
            Let's identify your restaurant so we can provide personalized insights with real data
          </p>
        </div>

        {/* Search Interface */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.2)',
          marginBottom: '40px'
        }}>
          <div style={{
            display: 'flex',
            gap: '15px',
            marginBottom: '30px'
          }}>
            <input
              type="text"
              placeholder="Enter restaurant name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                flex: 1,
                padding: '18px 24px',
                fontSize: '1.1rem',
                border: '3px solid #f0f0f0',
                borderRadius: '15px',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8b9cf4';
                e.target.style.boxShadow = '0 0 0 4px rgba(139,156,244,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#f0f0f0';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              style={{
                padding: '18px 30px',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'white',
                background: isSearching ? '#ccc' : 'linear-gradient(135deg, #8b9cf4 0%, #a97fc4 100%)',
                border: 'none',
                borderRadius: '15px',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '120px'
              }}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{ textAlign: 'left' }}>
              <h3 style={{
                fontSize: '1.3rem',
                fontWeight: '700',
                color: '#333',
                marginBottom: '20px'
              }}>
                Select Your Restaurant:
              </h3>
              
              <div style={{ display: 'grid', gap: '15px' }}>
                {searchResults.map((place) => (
                  <div
                    key={place.place_id}
                    onClick={() => handleRestaurantSelect(place)}
                    style={{
                      padding: '20px',
                      border: '2px solid #f0f0f0',
                      borderRadius: '12px',
                      cursor: isLoadingDetails ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      background: selectedPlaceId === place.place_id ? '#f8f9ff' : 'white',
                      opacity: isLoadingDetails && selectedPlaceId !== place.place_id ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoadingDetails) {
                        e.currentTarget.style.borderColor = '#8b9cf4';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(139,156,244,0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoadingDetails) {
                        e.currentTarget.style.borderColor = '#f0f0f0';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          fontSize: '1.2rem',
                          fontWeight: '700',
                          color: '#333',
                          margin: '0 0 8px 0'
                        }}>
                          {place.name}
                        </h4>
                        <p style={{
                          fontSize: '1rem',
                          color: '#666',
                          margin: '0 0 8px 0'
                        }}>
                          {place.formatted_address}
                        </p>
                        {place.rating && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.9rem',
                            color: '#888'
                          }}>
                            <span>⭐ {place.rating}</span>
                            {place.user_ratings_total && (
                              <span>({place.user_ratings_total} reviews)</span>
                            )}
                            {place.price_level && (
                              <span>{'$'.repeat(place.price_level)}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {selectedPlaceId === place.place_id && isLoadingDetails && (
                        <div style={{
                          width: '24px',
                          height: '24px',
                          border: '3px solid #f3f3f3',
                          borderTop: '3px solid #8b9cf4',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results Message */}
          {searchResults.length === 0 && searchQuery && !isSearching && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#666'
            }}>
              <p style={{ fontSize: '1.1rem' }}>
                No restaurants found. Try a different search term or check the spelling.
              </p>
            </div>
          )}
        </div>

        {/* Skip Option */}
        <div style={{
          textAlign: 'center',
          marginTop: '30px'
        }}>
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: '2px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '15px 30px',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
          >
            Skip & Enter Data Manually
          </button>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RestaurantSearch;