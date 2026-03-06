import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

interface MapComponentProps {
    isDark: boolean;
    stations: any[];
    familyVehicles: any[];
    initialFamily?: any[];
    t: any;
    COLORS: any;
    darkMapStyle?: any;
    markerContainerStyle?: any;
    MarkerZapIcon?: React.ReactNode;
    MarkerCarIcon?: React.ReactNode;
}

export default function MapComponent({
    isDark,
    stations,
    familyVehicles,
    t,
    COLORS,
}: MapComponentProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLeafletReady, setIsLeafletReady] = useState(false);

    const baseMapUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    // Generate the HTML for the iframe
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { width: 100vw; height: 100vh; background-color: ${isDark ? '#1a1a1a' : '#f0f0f0'}; }
            
            /* User's custom styles */
            .leaflet-container { z-index: 1; }
            .fleet-map-wrapper .leaflet-popup-pane { display: none; } /* Hide default popups */
            .leaflet-control-zoom { display: none; } /* Hide default zoom */
            .leaflet-control-attribution { display: none; } /* Hide attribution */
            
            .fleet-marker-container { 
                background: transparent;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .fleet-vehicle-icon { 
                width: 32px; 
                height: 32px; 
                border-radius: 50%;
                background-color: #152128;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            .marker-critical { 
                box-shadow: 0 0 10px red;
                animation: pulse 2s infinite;
            }

            .station-icon {
                background-color: ${COLORS?.successGreen || '#4ADE80'};
            }
            
            .vehicle-icon {
                background-color: ${COLORS?.brandBlue || '#3B82F6'};
            }

            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', {
                center: [12.9716, 77.5946],
                zoom: 12,
                zoomControl: false,
                attributionControl: false
            });

            L.tileLayer('${baseMapUrl}', {
                maxZoom: 19
            }).addTo(map);

            var markers = [];
            
            function clearMarkers() {
                markers.forEach(m => map.removeLayer(m));
                markers = [];
            }

            function updateMarkers(stations, vehicles) {
                clearMarkers();
                
                // Add Stations
                if (stations && Array.isArray(stations)) {
                    stations.forEach(station => {
                        const coords = station.coordinates || { latitude: 12.9716, longitude: 77.5946 };
                        
                        const icon = L.divIcon({
                            html: '<div class="fleet-vehicle-icon station-icon">⚡</div>',
                            className: 'fleet-marker-container',
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        });

                        const marker = L.marker([coords.latitude, coords.longitude], {icon: icon})
                            .bindPopup('<b>' + station.name + '</b><br>' + station.availableChargers + '/' + station.totalChargers + ' available')
                            .addTo(map);
                        
                        markers.push(marker);
                    });
                }

                // Add Vehicles
                if (vehicles && Array.isArray(vehicles)) {
                    vehicles.forEach(vehicle => {
                        const coords = vehicle.coordinates || { latitude: 12.9716, longitude: 77.5946 };
                        
                        const icon = L.divIcon({
                            html: '<div class="fleet-vehicle-icon vehicle-icon ' + (vehicle.batteryLevel < 20 ? 'marker-critical' : '') + '">🚗</div>',
                            className: 'fleet-marker-container',
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        });

                        const marker = L.marker([coords.latitude, coords.longitude], {icon: icon})
                            .bindPopup('<b>' + vehicle.memberName + '</b><br>' + vehicle.vehicleModel + ' • ' + vehicle.batteryLevel + '%')
                            .addTo(map);
                        
                        markers.push(marker);
                    });
                }
            }

            // Listen for window messages from the parent React app
            window.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'updateMarkers') {
                    updateMarkers(event.data.stations, event.data.vehicles);
                }
            });

            // Initialize with data if available at render time
            const initialStations = ${JSON.stringify(stations || [])};
            const initialVehicles = ${JSON.stringify(familyVehicles || [])};
            updateMarkers(initialStations, initialVehicles);

            // Tell React Native we are fully ready
            window.parent.postMessage({ type: 'leafletReady' }, '*');
        </script>
    </body>
    </html>
    `;

    // Listen for the iframe telling us it's ready
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'leafletReady') {
                setIsLeafletReady(true);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Send updated data to the iframe whenever it changes AFTER it's ready
    useEffect(() => {
        if (isLeafletReady && iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'updateMarkers',
                stations,
                vehicles: familyVehicles
            }, '*');
        }
    }, [stations, familyVehicles, isDark, isLeafletReady]);

    // Render an HTML iframe for Web
    // @ts-ignore - React Native Web supports standard DOM elements but TS doesn't natively expose them here
    const IframeComponent = (props) => React.createElement('iframe', props);

    return (
        <View style={styles.container}>
            <IframeComponent
                ref={iframeRef}
                srcDoc={htmlContent}
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-scripts allow-same-origin"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
});
