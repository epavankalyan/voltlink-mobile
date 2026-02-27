import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

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
    COLORS,
}: MapComponentProps) {
    return (
        <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0' }]}>
            <Text style={{ color: isDark ? '#AAA' : '#666', fontWeight: '600' }}>
                Map View is not available on Web
            </Text>
            <Text style={{ color: isDark ? '#666' : '#999', fontSize: 12, marginTop: 4 }}>
                Please use the mobile app to view the station map
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    mapPlaceholder: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
});
