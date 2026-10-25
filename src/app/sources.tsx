import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, ActivityIndicator } from 'react-native';
import { colors } from '@/core/theme';
import { sourcesInSection, loadLatestCloudStreamExtensions } from '@/features/registerSources';
import type { CloudStreamExtension } from '@/features/cloudstreamEngine';
import type { SectionId } from '@/core/sources/types';

const sections: { id: SectionId; title: string }[] = [
  { id:'home', title:'Movies & Series' }, { id:'anime', title:'Anime' }, { id:'kdrama', title:'K-Drama' }, { id:'livetv', title:'Live TV' },
];
export default function Sources() {
  const [extensions,setExtensions]=useState<CloudStreamExtension[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{loadLatestCloudStreamExtensions().then(setExtensions).finally(()=>setLoading(false));},[]);
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <Text style={s.title}>Source Library</Text><Text style={s.sub}>CloudStream repository manifests · live metadata refresh</Text>
    {sections.map(section => <View key={section.id} style={s.group}><Text style={s.heading}>{section.title}</Text>
      {sourcesInSection(section.id).map(source => <Pressable key={source.id} style={s.row} onPress={()=>Linking.openURL(source.url)}><View style={{flex:1}}><Text style={s.name}>{source.name}</Text><Text style={s.note}>{source.note} · {source.protocol}</Text></View><Text style={s.open}>Open ›</Text></Pressable>)}
      {extensions.filter(e=>e.section===section.id).slice(0,12).map((ext,i)=><View key={`${ext.repository}:${ext.name}:${i}`} style={s.extension}><View style={{flex:1}}><Text style={s.name}>{ext.name}</Text><Text style={s.note}>CloudStream · {ext.repository}{ext.version?` · v${ext.version}`:''}</Text></View><Text style={s.badge}>LATEST</Text></View>)}
    </View>)}
    {loading?<ActivityIndicator color={colors.accentB}/>:<Text style={s.foot}>{extensions.length} extension manifests loaded from configured repositories. Plugin binaries are not executed by Cinetor; only public manifest metadata is read.</Text>}
  </ScrollView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:100},title:{color:colors.text,fontSize:28,fontWeight:'800'},sub:{color:colors.textDim,fontSize:13,marginTop:5,marginBottom:24},group:{marginBottom:22},heading:{color:colors.text,fontSize:18,fontWeight:'700',marginBottom:9},row:{flexDirection:'row',alignItems:'center',backgroundColor:colors.surface,borderRadius:12,padding:14,marginBottom:8,borderWidth:.5,borderColor:colors.border},extension:{flexDirection:'row',alignItems:'center',backgroundColor:'#161c25',borderRadius:12,padding:14,marginBottom:8,borderWidth:.5,borderColor:'#28384a'},name:{color:colors.text,fontSize:14,fontWeight:'700'},note:{color:colors.textDim,fontSize:11,marginTop:4},open:{color:colors.accentB,fontSize:12,fontWeight:'700'},badge:{color:'#56e39b',fontSize:10,fontWeight:'800'},foot:{color:colors.textFaint,fontSize:12,lineHeight:18,marginTop:4}});
