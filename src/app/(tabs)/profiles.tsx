import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { colors } from '@/core/theme';
import { sectionStore } from '@/core/storage/store';
import { useScan } from '@/bdix/scanner';

export default function Profiles() {
  const [bdix,setBdix]=useState(sectionStore.get('bdix.enabled','settings') !== '0');
  const [saver,setSaver]=useState(sectionStore.get('net.saver','settings') === '1');
  const [adult,setAdult]=useState(sectionStore.get('adult.enabled','settings') === '1');
  const scan=useScan();
  useEffect(()=>{ if(bdix) useScan.getState().start(); },[]);
  const toggle=(key:string,val:boolean,set:(b:boolean)=>void)=>{sectionStore.set(key,val?'1':'0','settings');set(val);};
  return <ScrollView style={s.root} contentContainerStyle={{padding:18}}>
    <Text style={s.title}>Profiles</Text>
    <Text style={s.sub}>Independent content and network controls</Text>
    <Row label="Live TV" sub="Separate IPTV section · IPTV-org public playlist" value={true} onChange={()=>Alert.alert('Live TV','Open the Sources tab to view configured Live TV providers.')} />
    <Row label="Adult content" sub="Independent, disabled by default" value={adult} onChange={v=>toggle('adult.enabled',v,setAdult)} />
    <Row label="Local source scan" sub={scan.scanning ? `Checking ${scan.scanned}/${scan.total} sources` : `${scan.online} available sources found`} value={bdix} onChange={v=>toggle('bdix.enabled',v,setBdix)} />
    <Row label="Data saver" sub="Cap quality on mobile data" value={saver} onChange={v=>toggle('net.saver',v,setSaver)} />
    <Pressable style={s.rescan} onPress={()=>useScan.getState().rescan()}><Text style={s.rescanText}>Scan local sources now</Text></Pressable>
    <Text style={s.note}>Cinetor v1.0.0 — every section owns its own source adapters and cache. Login and multi-profile flows are not included.</Text>
  </ScrollView>;
}
function Row({label,sub,value,onChange}:{label:string;sub?:string;value:boolean;onChange:(b:boolean)=>void}){return <View style={s.row}><View style={{flex:1,paddingRight:12}}><Text style={s.label}>{label}</Text><Text style={s.sub}>{sub}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{false:colors.border,true:colors.accentA}} thumbColor={value?'#fff':colors.textDim}/></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},title:{color:colors.text,fontSize:28,fontWeight:'800'},sub:{color:colors.textDim,fontSize:12,marginTop:4},row:{flexDirection:'row',alignItems:'center',backgroundColor:colors.surface,borderRadius:14,padding:16,marginTop:12,borderWidth:.5,borderColor:colors.border},label:{color:colors.text,fontSize:15,fontWeight:'600'},note:{color:colors.textFaint,fontSize:12,marginTop:20,lineHeight:18},rescan:{marginTop:16,padding:14,borderRadius:12,backgroundColor:colors.accentA,alignItems:'center'},rescanText:{color:'#fff',fontWeight:'700'}});

