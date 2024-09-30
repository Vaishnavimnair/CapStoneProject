import { Component, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { OverpassPlace } from '../interfaces/overpass-place';
import { SafetyService } from '../safety.service';
//import { WeatherService } from '../weather.service';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-safety-service',
  standalone: true,
  imports: [FormsModule,CommonModule, NavbarComponent],
  templateUrl: './safety-service.component.html',
  styleUrl: './safety-service.component.css'
})

export class SafetyServiceComponent implements AfterViewInit {
  @ViewChild('map') mapContainer!: ElementRef;
  map: L.Map | null = null;
  searchQuery: string = '';
  weatherData: any = null;  

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  initializeMap(): void {
    this.map = L.map(this.mapContainer.nativeElement).setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  onSearchSubmit() {
    if (this.searchQuery) {
      this.searchLocation(this.searchQuery);
    }
  }

  searchLocation(query: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (this.map) {
            this.map.setView([lat, lon], 13);
            this.addNearbyPlaces(lat, lon);
            this.getWeather(lat, lon);
          }
        } else {
          console.log('No results found for the given query.');
        }
      })
      .catch(error => {
        console.error('Error fetching location data:', error);
      });
  }

  addNearbyPlaces(lat: number, lon: number) {
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["amenity"="hospital"](around:10000,${lat},${lon});node["amenity"="police"](around:10000,${lat},${lon}););out;`;

    fetch(overpassUrl)
      .then(response => response.json())
      .then(data => {
        this.clearExistingMarkers();
        data.elements.forEach((place: OverpassPlace) => {
          if (place.lat && place.lon) {
            this.addMarker(place);
          }
        });
      })
      .catch(error => {
        console.error('Error fetching nearby places:', error);
      });
  }
   // Function to fetch weather using OpenWeather API
   getWeather(lat: number, lon: number) {
    const apiKey = '5d24c79e98b0a49f1d05645f57a36f9c';
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    fetch(weatherUrl)
      .then(response => response.json())
      .then(data => {
        this.weatherData = data;  // Store weather data
        console.log('Weather data:', data);
      })
      .catch(error => {
        console.error('Error fetching weather data:', error);
      });
  }

  clearExistingMarkers(): void {
    if (this.map) {
      this.map.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Marker) {
          this.map?.removeLayer(layer);
        }
      });
    }
  }

  addMarker(place: OverpassPlace): void {
    if (!this.map) return;

    const name = place.tags.name || 'Unnamed Place';
    const amenity = place.tags.amenity || 'unknown';
    let icon: L.Icon<L.IconOptions>;

    try {
      icon = this.getCustomIcon(amenity);
    } catch (error) {
      console.warn(`Failed to load custom icon for ${amenity}. Using default.`, error);
      icon = this.getDefaultIcon();
    }

    const marker = L.marker([place.lat, place.lon], { icon }).addTo(this.map);
    
    const popupContent = `
      <strong>${name}</strong><br>
      Type: ${amenity}<br>
      ${place.tags.phone ? `Phone: ${place.tags.phone}<br>` : ''}
      ${place.tags.opening_hours ? `Hours: ${place.tags.opening_hours}<br>` : ''}
    `;
    marker.bindPopup(popupContent);
  }

  getCustomIcon(amenity: string): L.Icon {
    const iconUrl = amenity === 'hospital' 
      ? 'assets/hospital-icon.png' 
      : 'assets/police-icon.png';
    return L.icon({
      iconUrl: iconUrl,
      iconSize: [16, 16],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
      shadowUrl: 'assets/marker-shadow.png',
      shadowSize: [10, 10]
    });
  }
  getDefaultIcon(): L.Icon<L.IconOptions> {
    return L.icon({
      iconUrl: 'assets/default-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'assets/marker-shadow.png',
      shadowSize: [41, 41]
    });
  }

}