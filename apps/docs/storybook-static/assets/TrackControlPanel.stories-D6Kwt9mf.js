import{T as Le}from"./index-BlR7gUto.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-yIsmwZOr.js";const Ce={title:"Components/TrackControlPanel",component:Le,parameters:{layout:"padded"},tags:["autodocs"],argTypes:{trackName:{control:"text",description:"Name of the track"},trackType:{control:"radio",options:["mono","stereo","label"],description:"Type of audio track"},volume:{control:{type:"range",min:0,max:100,step:1},description:"Volume level (0-100)"},pan:{control:{type:"range",min:-100,max:100,step:1},description:"Pan position (-100 to 100)"},isMuted:{control:"boolean",description:"Mute state"},isSolo:{control:"boolean",description:"Solo state"},state:{control:"radio",options:["idle","hover","active"],description:"Visual state"},height:{control:"radio",options:["default","truncated","collapsed"],description:"Height variant"}}},e={args:{trackName:"Mono track 1",trackType:"mono",volume:67,pan:0,isMuted:!1,isSolo:!1,state:"idle",height:"default"}},r={args:{...e.args,state:"hover"}},o={args:{...e.args,state:"active"}},t={args:{...e.args,height:"truncated"}},s={args:{...e.args,height:"truncated",state:"hover"}},n={args:{...e.args,height:"truncated",state:"active"}},c={args:{...e.args,height:"collapsed"}},l={args:{...e.args,height:"collapsed",state:"hover"}},d={args:{...e.args,height:"collapsed",state:"active"}},a={args:{trackName:"Stereo track 1",trackType:"stereo",volume:67,pan:0,isMuted:!1,isSolo:!1,state:"idle",height:"default"}},u={args:{...a.args,state:"hover"}},i={args:{...a.args,state:"active"}},p={args:{trackName:"Label track 1",trackType:"label",volume:67,pan:0,isMuted:!1,isSolo:!1,state:"idle",height:"default"}},m={args:{...e.args,trackName:"Muted Track",isMuted:!0}},g={args:{...e.args,trackName:"Solo Track",isSolo:!0}},f={args:{...e.args,trackName:"Muted & Solo",isMuted:!0,isSolo:!0}},h={args:{...e.args,trackName:"Quiet Track",volume:25}},M={args:{...e.args,trackName:"Loud Track",volume:95}},S={args:{...e.args,trackName:"Panned Left",pan:-75}},v={args:{...e.args,trackName:"Panned Right",pan:75}};var k,D,I;e.parameters={...e.parameters,docs:{...(k=e.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    trackName: 'Mono track 1',
    trackType: 'mono',
    volume: 67,
    pan: 0,
    isMuted: false,
    isSolo: false,
    state: 'idle',
    height: 'default'
  }
}`,...(I=(D=e.parameters)==null?void 0:D.docs)==null?void 0:I.source}}};var T,N,y;r.parameters={...r.parameters,docs:{...(T=r.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    state: 'hover'
  }
}`,...(y=(N=r.parameters)==null?void 0:N.docs)==null?void 0:y.source}}};var L,H,P;o.parameters={...o.parameters,docs:{...(L=o.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    state: 'active'
  }
}`,...(P=(H=o.parameters)==null?void 0:H.docs)==null?void 0:P.source}}};var A,b,C;t.parameters={...t.parameters,docs:{...(A=t.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'truncated'
  }
}`,...(C=(b=t.parameters)==null?void 0:b.docs)==null?void 0:C.source}}};var V,x,R;s.parameters={...s.parameters,docs:{...(V=s.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'truncated',
    state: 'hover'
  }
}`,...(R=(x=s.parameters)==null?void 0:x.docs)==null?void 0:R.source}}};var w,Q,_;n.parameters={...n.parameters,docs:{...(w=n.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'truncated',
    state: 'active'
  }
}`,...(_=(Q=n.parameters)==null?void 0:Q.docs)==null?void 0:_.source}}};var E,O,j;c.parameters={...c.parameters,docs:{...(E=c.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'collapsed'
  }
}`,...(j=(O=c.parameters)==null?void 0:O.docs)==null?void 0:j.source}}};var q,z,B;l.parameters={...l.parameters,docs:{...(q=l.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'collapsed',
    state: 'hover'
  }
}`,...(B=(z=l.parameters)==null?void 0:z.docs)==null?void 0:B.source}}};var F,G,J;d.parameters={...d.parameters,docs:{...(F=d.parameters)==null?void 0:F.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    height: 'collapsed',
    state: 'active'
  }
}`,...(J=(G=d.parameters)==null?void 0:G.docs)==null?void 0:J.source}}};var K,U,W;a.parameters={...a.parameters,docs:{...(K=a.parameters)==null?void 0:K.docs,source:{originalSource:`{
  args: {
    trackName: 'Stereo track 1',
    trackType: 'stereo',
    volume: 67,
    pan: 0,
    isMuted: false,
    isSolo: false,
    state: 'idle',
    height: 'default'
  }
}`,...(W=(U=a.parameters)==null?void 0:U.docs)==null?void 0:W.source}}};var X,Y,Z;u.parameters={...u.parameters,docs:{...(X=u.parameters)==null?void 0:X.docs,source:{originalSource:`{
  args: {
    ...StereoDefaultIdle.args,
    state: 'hover'
  }
}`,...(Z=(Y=u.parameters)==null?void 0:Y.docs)==null?void 0:Z.source}}};var $,ee,ae;i.parameters={...i.parameters,docs:{...($=i.parameters)==null?void 0:$.docs,source:{originalSource:`{
  args: {
    ...StereoDefaultIdle.args,
    state: 'active'
  }
}`,...(ae=(ee=i.parameters)==null?void 0:ee.docs)==null?void 0:ae.source}}};var re,oe,te;p.parameters={...p.parameters,docs:{...(re=p.parameters)==null?void 0:re.docs,source:{originalSource:`{
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
}`,...(te=(oe=p.parameters)==null?void 0:oe.docs)==null?void 0:te.source}}};var se,ne,ce;m.parameters={...m.parameters,docs:{...(se=m.parameters)==null?void 0:se.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Muted Track',
    isMuted: true
  }
}`,...(ce=(ne=m.parameters)==null?void 0:ne.docs)==null?void 0:ce.source}}};var le,de,ue;g.parameters={...g.parameters,docs:{...(le=g.parameters)==null?void 0:le.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Solo Track',
    isSolo: true
  }
}`,...(ue=(de=g.parameters)==null?void 0:de.docs)==null?void 0:ue.source}}};var ie,pe,me;f.parameters={...f.parameters,docs:{...(ie=f.parameters)==null?void 0:ie.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Muted & Solo',
    isMuted: true,
    isSolo: true
  }
}`,...(me=(pe=f.parameters)==null?void 0:pe.docs)==null?void 0:me.source}}};var ge,fe,he;h.parameters={...h.parameters,docs:{...(ge=h.parameters)==null?void 0:ge.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Quiet Track',
    volume: 25
  }
}`,...(he=(fe=h.parameters)==null?void 0:fe.docs)==null?void 0:he.source}}};var Me,Se,ve;M.parameters={...M.parameters,docs:{...(Me=M.parameters)==null?void 0:Me.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Loud Track',
    volume: 95
  }
}`,...(ve=(Se=M.parameters)==null?void 0:Se.docs)==null?void 0:ve.source}}};var ke,De,Ie;S.parameters={...S.parameters,docs:{...(ke=S.parameters)==null?void 0:ke.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Panned Left',
    pan: -75
  }
}`,...(Ie=(De=S.parameters)==null?void 0:De.docs)==null?void 0:Ie.source}}};var Te,Ne,ye;v.parameters={...v.parameters,docs:{...(Te=v.parameters)==null?void 0:Te.docs,source:{originalSource:`{
  args: {
    ...MonoDefaultIdle.args,
    trackName: 'Panned Right',
    pan: 75
  }
}`,...(ye=(Ne=v.parameters)==null?void 0:Ne.docs)==null?void 0:ye.source}}};const Ve=["MonoDefaultIdle","MonoDefaultHover","MonoDefaultActive","MonoTruncatedIdle","MonoTruncatedHover","MonoTruncatedActive","MonoCollapsedIdle","MonoCollapsedHover","MonoCollapsedActive","StereoDefaultIdle","StereoDefaultHover","StereoDefaultActive","LabelDefaultIdle","Muted","Solo","MutedAndSolo","LowVolume","HighVolume","PannedLeft","PannedRight"];export{M as HighVolume,p as LabelDefaultIdle,h as LowVolume,d as MonoCollapsedActive,l as MonoCollapsedHover,c as MonoCollapsedIdle,o as MonoDefaultActive,r as MonoDefaultHover,e as MonoDefaultIdle,n as MonoTruncatedActive,s as MonoTruncatedHover,t as MonoTruncatedIdle,m as Muted,f as MutedAndSolo,S as PannedLeft,v as PannedRight,g as Solo,i as StereoDefaultActive,u as StereoDefaultHover,a as StereoDefaultIdle,Ve as __namedExportsOrder,Ce as default};
