import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { colors } from '@/core/theme';
import { sectionStore } from '@/core/storage/store';
import { sourcesInSection } from '@/features/registerSources';
import type { SectionId } from '@/core/sources/types';

const sections: { id: SectionId; title: string }[] = [
  { id:'home', title:'Movies & Series' }, { id:'anime', title:'Anime' }, { id:'kdrama', title:'K-Drama' },
  { id:'livetv', title:'Live TV' },
];

export default function Sources() {
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <Text style={s.title}>Source Library</Text><Text style={s.sub}>Configured from your media sources guide</Text>
    {sections.map(section => <View key={section.id} style={s.group}><Text style={s.heading}>{section.title}</Text>
      {sourcesInSection(section.id).map(source => <Pressable key={source.id} style={s.row} onPress={() => Linking.openURL(source.url)}>
        <View style={{flex:1}}><Text style={s.name}>{source.name}</Text><Text style={s.note}>{source.note} · {source.protocol}</Text></View><Text style={s.open}>Open ›</Text>
      </Pressable>)}
    </View>)}
    <Text style={s.foot}>Static source registry is isolated by section. External provider pages open only after your tap; Cinetor does not bypass access controls or download third-party content automatically.</Text>
  </ScrollView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:100},title:{color:colors.text,fontSize:28,fontWeight:'800'},sub:{color:colors.textDim,fontSize:13,marginTop:5,marginBottom:24},group:{marginBottom:22},heading:{color:colors.text,fontSize:18,fontWeight:'700',marginBottom:9},row:{flexDirection:'row',alignItems:'center',backgroundColor:colors.surface,borderRadius:12,padding:14,marginBottom:8,borderWidth:.5,borderColor:colors.border},name:{color:colors.text,fontSize:14,fontWeight:'700'},note:{color:colors.textDim,fontSize:11,marginTop:4},open:{color:colors.accentB,fontSize:12,fontWeight:'700'},foot:{color:colors.textFaint,fontSize:12,lineHeight:18,marginTop:4}});
