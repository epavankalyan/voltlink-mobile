import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapComponentProps {
    isDark: boolean;
    stations: any[];
    familyVehicles: any[];
    t: any;
    COLORS: any;
    darkMapStyle: any; // Note: We might not need this anymore as we use the Carto dark map
    markerContainerStyle: any;
    MarkerZapIcon: React.ReactNode;
    MarkerCarIcon: React.ReactNode;
}

export default function MapComponent({
    isDark,
    stations,
    familyVehicles,
    t,
    COLORS,
}: MapComponentProps) {
    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);

    const baseMapUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    // Generate the HTML for the WebView
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
                background-color: ${COLORS.successGreen || '#4ADE80'};
            }
            
            .vehicle-icon {
                background-color: ${COLORS.brandBlue || '#3B82F6'};
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

            // Function to add markers from React Native
            var markers = [];
            
            function clearMarkers() {
                markers.forEach(m => map.removeLayer(m));
                markers = [];
            }

            function updateMarkers(stations, vehicles) {
                clearMarkers();
                
                // Add Stations
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

                // Add Vehicles
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
            // Initialize with data if available at render time
            const initialStations = ${JSON.stringify(stations || [])};
            const initialVehicles = ${JSON.stringify(familyVehicles || [])};
            updateMarkers(initialStations, initialVehicles);

            // Signal to React Native that the map is fully ready to receive future updates
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'leafletReady' }));
        </script>
    </body>
    </html>
    `;

    // Handle messages from the WebView
    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'leafletReady') {
                setIsReady(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Send updated data to the WebView whenever it changes AFTER it's ready
    useEffect(() => {
        if (isReady && webViewRef.current) {
            const script = `updateMarkers(${JSON.stringify(stations)}, ${JSON.stringify(familyVehicles)}); true;`;
            webViewRef.current.injectJavaScript(script);
        }
    }, [stations, familyVehicles, isDark, isReady]);

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={{ html: htmlContent }}
                style={styles.map}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={false}
                bounces={false}
                onMessage={handleMessage}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
    map: {
        flex: 1,
    },
});
