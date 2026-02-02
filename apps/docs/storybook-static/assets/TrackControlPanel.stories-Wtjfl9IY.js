import{u as Ve}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const Qe={title:"Components/TrackControlPanel",component:Ve,parameters:{layout:"padded"},tags:["autodocs"],argTypes:{trackName:{control:"text",description:"Name of the track"},trackType:{control:"radio",options:["mono","stereo","label"],description:"Type of audio track"},volume:{control:{type:"range",min:0,max:100,step:1},description:"Volume level (0-100)"},pan:{control:{type:"range",min:-100,max:100,step:1},description:"Pan position (-100 to 100)"},isMuted:{control:"boolean",description:"Mute state"},isSolo:{control:"boolean",description:"Solo state"},state:{control:"radio",options:["idle","hover","active"],description:"Visual state"},height:{control:"radio",options:["default","truncated","collapsed"],description:"Height variant"},meterLevel:{control:{type:"range",min:0,max:100,step:1},description:"Current meter level (0-100)"},meterClipped:{control:"boolean",description:"Whether the meter is clipping"},meterStyle:{control:"select",options:["default","rms"],description:"Meter display style"},meterRecentPeak:{control:{type:"range",min:0,max:100,step:1},description:"Recent peak level (0-100)"},meterMaxPeak:{control:{type:"range",min:0,max:100,step:1},description:"Max peak level (0-100)"}}},e={args:{trackName:"Mono track 1",trackType:"mono",volume:67,pan:0,isMuted:!1,isSolo:!1,state:"idle",height:"default",meterLevel:66,meterClipped:!1,meterStyle:"default",meterRecentPeak:66,meterMaxPeak:79}},r={args:{...e.args,state:"hover"}},t={args:{...e.args,state:"active"}},o={args:{...e.args,height:"truncated"}},s={args:{...e.args,height:"truncated",state:"hover"}},n={args:{...e.args,height:"truncated",state:"active"}},c={args:{...e.args,height:"collapsed"}},l={args:{...e.args,height:"collapsed",state:"hover"}},d={args:{...e.args,height:"collapsed",state:"active"}},a={args:{trackName:"Stereo track 1",trackType:"stereo",volume:67,pan:0,isMuted:!1,isSolo:!1,state:"idle",height:"default",meterLevelLeft:75,meterLevelRight:60,meterClippedLeft:!1,meterClippedRight:!1,meterStyle:"default",meterRecentPeakLeft:75,meterRecentPeakRight:60,meterMaxPeakLeft:85,meterMaxPeakRight:72}},m={args:{...a.args,meterStyle:"rms"}},i={args:{...a.args,meterLevelLeft:100,meterClippedLeft:!0,meterRecentPeakLeft:100,meterMaxPeakLeft:100}},p={args:{...a.args,state:"hover"}},u={args:{...a.args,state:"active"}},g={args:{trackName:"Label track 1",trackType:"label",volume:67,pan:0,isMuted:!1,isSolo:!1,state:"idle",height:"default"}},f={args:{...e.args,trackName:"Muted Track",isMuted:!0}},h={args:{...e.args,trackName:"Solo Track",isSolo:!0}},M={args:{...e.args,trackName:"Muted & Solo",isMuted:!0,isSolo:!0}},S={args:{...e.args,trackName:"Quiet Track",volume:25}},k={args:{...e.args,trackName:"Loud Track",volume:95}},v={args:{...e.args,trackName:"Panned Left",pan:-75}},L={args:{...e.args,trackName:"Panned Right",pan:75}};var D,I,P;e.parameters={...e.parameters,docs:{...(D=e.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    trackName: 'Mono track 1',
    trackType: 'mono',
    volume: 67,
    pan: 0,
    isMuted: false,
    isSolo: false,
    state: 'idle',
    height: 'default',
    meterLevel: 66,
    meterClipped: false,
    meterStyle: 'default',
    meterRecentPeak: 66,
    meterMaxPeak: 79
  }
}`,...(P=(I=e.parameters)==null?void 0:I.docs)==null?void 0:P.source}}};var T,y,R;r.parameters={...r.parameters,docs:{...(T=r.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    state: 'hover'
  }
}`,...(R=(y=r.parameters)==null?void 0:y.docs)==null?void 0:R.source}}};var N,C,x;t.parameters={...t.parameters,docs:{...(N=t.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    state: 'active'
  }
}`,...(x=(C=t.parameters)==null?void 0:C.docs)==null?void 0:x.source}}};var H,b,A;o.parameters={...o.parameters,docs:{...(H=o.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'truncated'
  }
}`,...(A=(b=o.parameters)==null?void 0:b.docs)==null?void 0:A.source}}};var V,W,w;s.parameters={...s.parameters,docs:{...(V=s.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'truncated',
    state: 'hover'
  }
}`,...(w=(W=s.parameters)==null?void 0:W.docs)==null?void 0:w.source}}};var Q,_,E;n.parameters={...n.parameters,docs:{...(Q=n.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'truncated',
    state: 'active'
  }
}`,...(E=(_=n.parameters)==null?void 0:_.docs)==null?void 0:E.source}}};var O,j,q;c.parameters={...c.parameters,docs:{...(O=c.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'collapsed'
  }
}`,...(q=(j=c.parameters)==null?void 0:j.docs)==null?void 0:q.source}}};var z,B,F;l.parameters={...l.parameters,docs:{...(z=l.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'collapsed',
    state: 'hover'
  }
}`,...(F=(B=l.parameters)==null?void 0:B.docs)==null?void 0:F.source}}};var G,J,K;d.parameters={...d.parameters,docs:{...(G=d.parameters)==null?void 0:G.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'collapsed',
    state: 'active'
  }
}`,...(K=(J=d.parameters)==null?void 0:J.docs)==null?void 0:K.source}}};var U,X,Y;a.parameters={...a.parameters,docs:{...(U=a.parameters)==null?void 0:U.docs,source:{originalSource:`{
  args: {
    trackName: 'Stereo track 1',
    trackType: 'stereo',
    volume: 67,
    pan: 0,
    isMuted: false,
    isSolo: false,
    state: 'idle',
    height: 'default',
    meterLevelLeft: 75,
    meterLevelRight: 60,
    meterClippedLeft: false,
    meterClippedRight: false,
    meterStyle: 'default',
    meterRecentPeakLeft: 75,
    meterRecentPeakRight: 60,
    meterMaxPeakLeft: 85,
    meterMaxPeakRight: 72
  }
}`,...(Y=(X=a.parameters)==null?void 0:X.docs)==null?void 0:Y.source}}};var Z,$,ee;m.parameters={...m.parameters,docs:{...(Z=m.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  args: {
    ...StereoDefaultIdle.args,
    meterStyle: 'rms'
  }
}`,...(ee=($=m.parameters)==null?void 0:$.docs)==null?void 0:ee.source}}};var ae,re,te;i.parameters={...i.parameters,docs:{...(ae=i.parameters)==null?void 0:ae.docs,source:{originalSource:`{
  args: {
    ...StereoDefaultIdle.args,
    meterLevelLeft: 100,
    meterClippedLeft: true,
    meterRecentPeakLeft: 100,
    meterMaxPeakLeft: 100
  }
}`,...(te=(re=i.parameters)==null?void 0:re.docs)==null?void 0:te.source}}};var oe,se,ne;p.parameters={...p.parameters,docs:{...(oe=p.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  args: {
    ...StereoDefaultIdle.args,
    state: 'hover'
  }
}`,...(ne=(se=p.parameters)==null?void 0:se.docs)==null?void 0:ne.source}}};var ce,le,de;u.parameters={...u.parameters,docs:{...(ce=u.parameters)==null?void 0:ce.docs,source:{originalSource:`{
  args: {
    ...StereoDefaultIdle.args,
    state: 'active'
  }
}`,...(de=(le=u.parameters)==null?void 0:le.docs)==null?void 0:de.source}}};var me,ie,pe;g.parameters={...g.parameters,docs:{...(me=g.parameters)==null?void 0:me.docs,source:{originalSource:`{
  args: {
    trackName: 'Label track 1',
    trackType: 'label',
    volume: 67,
    pan: 0,
    isMuted: false,
    isSolo: false,
    state: 'idle',
    height: 'default'
  }
}`,...(pe=(ie=g.parameters)==null?void 0:ie.docs)==null?void 0:pe.source}}};var ue,ge,fe;f.parameters={...f.parameters,docs:{...(ue=f.parameters)==null?void 0:ue.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Muted Track',
    isMuted: true
  }
}`,...(fe=(ge=f.parameters)==null?void 0:ge.docs)==null?void 0:fe.source}}};var he,Me,Se;h.parameters={...h.parameters,docs:{...(he=h.parameters)==null?void 0:he.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Solo Track',
    isSolo: true
  }
}`,...(Se=(Me=h.parameters)==null?void 0:Me.docs)==null?void 0:Se.source}}};var ke,ve,Le;M.parameters={...M.parameters,docs:{...(ke=M.parameters)==null?void 0:ke.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Muted & Solo',
    isMuted: true,
    isSolo: true
  }
}`,...(Le=(ve=M.parameters)==null?void 0:ve.docs)==null?void 0:Le.source}}};var De,Ie,Pe;S.parameters={...S.parameters,docs:{...(De=S.parameters)==null?void 0:De.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Quiet Track',
    volume: 25
  }
}`,...(Pe=(Ie=S.parameters)==null?void 0:Ie.docs)==null?void 0:Pe.source}}};var Te,ye,Re;k.parameters={...k.parameters,docs:{...(Te=k.parameters)==null?void 0:Te.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Loud Track',
    volume: 95
  }
}`,...(Re=(ye=k.parameters)==null?void 0:ye.docs)==null?void 0:Re.source}}};var Ne,Ce,xe;v.parameters={...v.parameters,docs:{...(Ne=v.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Panned Left',
    pan: -75
  }
}`,...(xe=(Ce=v.parameters)==null?void 0:Ce.docs)==null?void 0:xe.source}}};var He,be,Ae;L.parameters={...L.parameters,docs:{...(He=L.parameters)==null?void 0:He.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Panned Right',
    pan: 75
  }
}`,...(Ae=(be=L.parameters)==null?void 0:be.docs)==null?void 0:Ae.source}}};const _e=["MonoDefaultIdle","MonoDefaultHover","MonoDefaultActive","MonoTruncatedIdle","MonoTruncatedHover","MonoTruncatedActive","MonoCollapsedIdle","MonoCollapsedHover","MonoCollapsedActive","StereoDefaultIdle","StereoWithRMS","StereoClippingLeft","StereoDefaultHover","StereoDefaultActive","LabelDefaultIdle","Muted","Solo","MutedAndSolo","LowVolume","HighVolume","PannedLeft","PannedRight"];export{k as HighVolume,g as LabelDefaultIdle,S as LowVolume,d as MonoCollapsedActive,l as MonoCollapsedHover,c as MonoCollapsedIdle,t as MonoDefaultActive,r as MonoDefaultHover,e as MonoDefaultIdle,n as MonoTruncatedActive,s as MonoTruncatedHover,o as MonoTruncatedIdle,f as Muted,M as MutedAndSolo,v as PannedLeft,L as PannedRight,h as Solo,i as StereoClippingLeft,u as StereoDefaultActive,p as StereoDefaultHover,a as StereoDefaultIdle,m as StereoWithRMS,_e as __namedExportsOrder,Qe as default};
