import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '../../components/navigation/TabBar';

export default function DriverLayout() {
    return (
        <Tabs
            tabBar={(props) => <TabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
            <Tabs.Screen name="recommendations" options={{ title: 'AI Tips', href: null }} />
            <Tabs.Screen name="history" options={{ title: 'History' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
            {/* Non-tab screens — hidden from tab bar */}
            <Tabs.Screen name="booking" options={{ href: null, title: 'Booking' }} />
            <Tabs.Screen name="session" options={{ href: null, title: 'Session' }} />
        </Tabs>
    );
}
