import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '../../components/navigation/TabBar';

export default function B2CLayout() {
    return (
        <Tabs
            tabBar={(props) => <TabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
            <Tabs.Screen name="discover" options={{ title: 'Stations' }} />
            <Tabs.Screen name="credits" options={{ title: 'Credits' }} />
            <Tabs.Screen name="history" options={{ title: 'History' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
            {/* Non-tab screens — hidden from tab bar */}
            <Tabs.Screen name="booking" options={{ href: null, title: 'Booking' }} />
            <Tabs.Screen name="session" options={{ href: null, title: 'Session' }} />
        </Tabs>
    );
}
