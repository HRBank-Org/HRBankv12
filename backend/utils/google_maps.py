import googlemaps
from config.settings import settings
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class GoogleMapsService:
    def __init__(self):
        if settings.GOOGLE_MAPS_API_KEY:
            self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)
        else:
            self.gmaps = None
            logger.warning("Google Maps API key not configured")
    
    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """
        Convert address to lat/long coordinates
        Returns: (latitude, longitude) or None if failed
        """
        try:
            geocode_result = self.gmaps.geocode(address)
            if geocode_result:
                location = geocode_result[0]['geometry']['location']
                return (location['lat'], location['lng'])
            return None
        except Exception as e:
            logger.error(f"Geocoding failed for address '{address}': {str(e)}")
            return None
    
    def reverse_geocode(self, lat: float, lng: float) -> Optional[str]:
        """
        Convert lat/long to address
        Returns: formatted address string or None
        """
        try:
            reverse_result = self.gmaps.reverse_geocode((lat, lng))
            if reverse_result:
                return reverse_result[0]['formatted_address']
            return None
        except Exception as e:
            logger.error(f"Reverse geocoding failed for ({lat}, {lng}): {str(e)}")
            return None
    
    def get_distance_matrix(self, origins: list, destinations: list, mode: str = 'driving'):
        """
        Get distance and duration between multiple origin/destination pairs
        origins: List of addresses or (lat, lng) tuples
        destinations: List of addresses or (lat, lng) tuples
        Returns: Distance matrix data
        """
        try:
            result = self.gmaps.distance_matrix(origins, destinations, mode=mode)
            return result
        except Exception as e:
            logger.error(f"Distance matrix failed: {str(e)}")
            return None
    
    def autocomplete_address(self, input_text: str, components: str = 'country:ca'):
        """
        Get address autocomplete suggestions
        components: Restrict to specific country (default: Canada)
        Returns: List of predictions
        """
        try:
            result = self.gmaps.places_autocomplete(input_text, components=components)
            return result
        except Exception as e:
            logger.error(f"Autocomplete failed for '{input_text}': {str(e)}")
            return []

# Singleton instance
google_maps_service = GoogleMapsService()
