import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

interface MapComponentProps {
    isDark: boolean;
    stations: any[];
    familyVehicles: any[];
    initialFamily: any[];
    t: any;
    COLORS: any;
    darkMapStyle: any;
    markerContainerStyle: any;
    MarkerZapIcon: React.ReactNode;
    MarkerCarIcon: React.ReactNode;
}

export default function MapComponent({
    isDark,
    stations,
    familyVehicles,
    initialFamily,
    t,
    COLORS,
    darkMapStyle,
    markerContainerStyle,
    MarkerZapIcon,
    MarkerCarIcon,
}: MapComponentProps) {
    return (
        <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={{
                latitude: 28.495,
                longitude: 77.088,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }}
            customMapStyle={isDark ? darkMapStyle : []}
        >
            {stations.map((station) => {
                const coords = station.coordinates || { latitude: 28.495, longitude: 77.088 };
                return (
                    <Marker
                        key={`stat-${station.id}`}
                        coordinate={{
                            latitude: Number(coords.latitude),
                            longitude: Number(coords.longitude)
                        }}
                        title={station.name}
                        description={`${station.availableChargers}/${station.totalChargers} ${t.available}`}
                    >
                        <View style={[markerContainerStyle, { backgroundColor: COLORS.successGreen }]}>
                            {MarkerZapIcon}
                        </View>
                    </Marker>
                );
            })}

            {familyVehicles.map((vehicle, idx) => {
                const coords = vehicle.coordinates || initialFamily[idx]?.coordinates || { latitude: 28.495, longitude: 77.088 };
                return (
                    <Marker
                        key={`veh-${vehicle.id}`}
                        coordinate={{
                            latitude: Number(coords.latitude),
                            longitude: Number(coords.longitude)
                        }}
                        title={vehicle.memberName}
                        description={`${vehicle.vehicleModel} • ${vehicle.batteryLevel}%`}
                    >
                        <View style={[markerContainerStyle, { backgroundColor: COLORS.brandBlue }]}>
                            {MarkerCarIcon}
                        </View>
                    </Marker>
                );
            })}
        </MapView>
    );
}

const styles = StyleSheet.create({
    map: { ...StyleSheet.absoluteFillObject },
});
