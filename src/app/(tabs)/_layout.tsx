import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '@/core/theme';
import { TabIcon } from '@/components/TabIcon';

export default function TabsLayout() {
  return <Tabs screenOptions={{headerShown:false, tabBarStyle:{backgroundColor:colors.surface,borderTopColor:colors.border,borderTopWidth:.5,height:64,paddingBottom:8},tabBarActiveTintColor:colors.accentB,tabBarInactiveTintColor:colors.textFaint,tabBarLabelStyle:{fontSize:11,fontWeight:'600'}}}>
    <Tabs.Screen name="home" options={{title:'Home',tabBarIcon:p=><TabIcon name="home" {...p}/>}} />
    <Tabs.Screen name="kdrama" options={{title:'K-Drama',tabBarIcon:p=><TabIcon name="drama" {...p}/>}} />
    <Tabs.Screen name="anime" options={{title:'Anime',tabBarIcon:p=><TabIcon name="anime" {...p}/>}} />
    <Tabs.Screen name="others" options={{title:'Sources',tabBarIcon:p=><TabIcon name="others" {...p}/>}} />
    <Tabs.Screen name="profiles" options={{title:'Profiles',tabBarIcon:p=><TabIcon name="profile" {...p}/>}} />
  </Tabs>;
}
