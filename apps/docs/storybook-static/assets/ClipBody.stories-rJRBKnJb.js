import{R as r}from"./index-yIsmwZOr.js";import{c as T,g as E}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const e=E(.5,1800),a=E(.5,1800),o=E(.5,1800),Ze={title:"Audio/ClipBody",component:T,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{color:{control:"select",options:["cyan","blue","violet","magenta","red","orange","yellow","green","teal"],description:"Clip color from the 9-color palette"},selected:{control:"boolean",description:"Whether the clip is selected"},variant:{control:"select",options:["waveform","spectrogram"],description:"Visualization type"},channelMode:{control:"select",options:["mono","stereo","split-mono","split-stereo"],description:"Channel display mode"},height:{control:"number",description:"Height in pixels"},showEnvelope:{control:"boolean",description:"Whether to show the envelope overlay"}}},l={args:{color:"blue",selected:!1,variant:"waveform",channelMode:"mono",width:224,height:84,waveformData:e}},c={args:{color:"blue",selected:!0,variant:"waveform",channelMode:"mono",width:224,height:84,waveformData:e}},m={render:()=>r.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"8px"}},["cyan","blue","violet","magenta","red","orange","yellow","green","teal"].map(i=>r.createElement("div",{key:i,style:{display:"flex",gap:"8px",alignItems:"center"}},r.createElement("span",{style:{width:"80px",fontSize:"12px"}},i),r.createElement(T,{color:i,selected:!1,height:84,width:224,waveformData:e}),r.createElement(T,{color:i,selected:!0,height:84,width:224,waveformData:e}))))},d={args:{color:"blue",selected:!1,variant:"waveform",channelMode:"mono",width:224,height:84,waveformData:e}},p={args:{color:"blue",selected:!1,variant:"waveform",channelMode:"stereo",width:224,height:84,waveformLeft:a,waveformRight:o}},h={args:{color:"blue",selected:!1,variant:"spectrogram",channelMode:"mono",width:224,height:84,waveformData:e}},f={args:{color:"cyan",selected:!1,variant:"spectrogram",channelMode:"stereo",width:224,height:84,waveformLeft:a,waveformRight:o}},v={args:{color:"violet",selected:!1,variant:"spectrogram",channelMode:"split-mono",width:224,height:84,waveformData:e}},g={args:{color:"magenta",selected:!1,variant:"spectrogram",channelMode:"split-stereo",width:224,height:84,waveformLeft:a,waveformRight:o}},w={args:{color:"blue",selected:!1,variant:"waveform",channelMode:"mono",width:224,height:84,waveformData:e,showEnvelope:!0,envelope:[{time:.2,db:-6},{time:.5,db:3},{time:.8,db:-3}]}},u={args:{color:"violet",selected:!1,variant:"spectrogram",channelMode:"split-mono",width:224,height:84,waveformData:e,showEnvelope:!0,envelope:[{time:.2,db:-6},{time:.5,db:3},{time:.8,db:-3}]}},S={args:{color:"magenta",selected:!1,variant:"spectrogram",channelMode:"split-stereo",width:224,height:84,waveformLeft:a,waveformRight:o,showEnvelope:!0,envelope:[{time:.2,db:-6},{time:.5,db:3},{time:.8,db:-3}]}},t={args:{color:"blue",selected:!1,variant:"waveform",channelMode:"mono",width:224,height:84,waveformData:e,clipStartTime:0,clipDuration:.5,timeSelection:{startTime:.1,endTime:.3}}},M={args:{color:"violet",selected:!1,variant:"waveform",channelMode:"mono",width:224,height:84,waveformData:e,clipStartTime:0,clipDuration:.5,showEnvelope:!0,envelope:[{time:.2,db:-6},{time:.5,db:3},{time:.8,db:-3}],timeSelection:{startTime:.15,endTime:.35}}},W={args:{color:"magenta",selected:!1,variant:"spectrogram",channelMode:"split-mono",width:224,height:84,waveformData:e,clipStartTime:0,clipDuration:.5,timeSelection:{startTime:.1,endTime:.4}}},n={args:{color:"blue",selected:!1,variant:"waveform",channelMode:"stereo",width:224,height:84,waveformLeft:a,waveformRight:o,channelSplitRatio:.5}},b={args:{color:"violet",selected:!1,variant:"waveform",channelMode:"stereo",width:224,height:84,waveformLeft:a,waveformRight:o,channelSplitRatio:.7}},R={args:{color:"magenta",selected:!1,variant:"waveform",channelMode:"stereo",width:224,height:84,waveformLeft:a,waveformRight:o,channelSplitRatio:.3}},s={args:{color:"green",selected:!1,variant:"waveform",channelMode:"stereo",width:224,height:60,waveformLeft:a,waveformRight:o}},L={args:{color:"teal",selected:!1,variant:"waveform",channelMode:"stereo",width:224,height:84,waveformLeft:a,waveformRight:o}},D={args:{color:"orange",selected:!1,variant:"waveform",channelMode:"stereo",width:224,height:120,waveformLeft:a,waveformRight:o}},y={args:{color:"red",selected:!1,variant:"waveform",channelMode:"stereo",width:224,height:200,waveformLeft:a,waveformRight:o}};var x,V,H;l.parameters={...l.parameters,docs:{...(x=l.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform
  }
}`,...(H=(V=l.parameters)==null?void 0:V.docs)==null?void 0:H.source}}};var C,B,z;c.parameters={...c.parameters,docs:{...(C=c.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: true,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform
  }
}`,...(z=(B=c.parameters)==null?void 0:B.docs)==null?void 0:z.source}}};var A,k,I;m.parameters={...m.parameters,docs:{...(A=m.parameters)==null?void 0:A.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  }}>
      {(['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'] as const).map(color => <div key={color} style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
          <span style={{
        width: '80px',
        fontSize: '12px'
      }}>{color}</span>
          <ClipBody color={color} selected={false} height={84} width={224} waveformData={sampleWaveform} />
          <ClipBody color={color} selected={true} height={84} width={224} waveformData={sampleWaveform} />
        </div>)}
    </div>
}`,...(I=(k=m.parameters)==null?void 0:k.docs)==null?void 0:I.source}}};var X,_,q;d.parameters={...d.parameters,docs:{...(X=d.parameters)==null?void 0:X.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform
  }
}`,...(q=(_=d.parameters)==null?void 0:_.docs)==null?void 0:q.source}}};var O,j,F;p.parameters={...p.parameters,docs:{...(O=p.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...(F=(j=p.parameters)==null?void 0:j.docs)==null?void 0:F.source}}};var G,J,K;h.parameters={...h.parameters,docs:{...(G=h.parameters)==null?void 0:G.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform
  }
}`,...(K=(J=h.parameters)==null?void 0:J.docs)==null?void 0:K.source}}};var N,P,Q;f.parameters={...f.parameters,docs:{...(N=f.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    color: 'cyan',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...(Q=(P=f.parameters)==null?void 0:P.docs)==null?void 0:Q.source}}};var U,Y,Z;v.parameters={...v.parameters,docs:{...(U=v.parameters)==null?void 0:U.docs,source:{originalSource:`{
  args: {
    color: 'violet',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'split-mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform
  }
}`,...(Z=(Y=v.parameters)==null?void 0:Y.docs)==null?void 0:Z.source}}};var $,ee,ae;g.parameters={...g.parameters,docs:{...($=g.parameters)==null?void 0:$.docs,source:{originalSource:`{
  args: {
    color: 'magenta',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'split-stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...(ae=(ee=g.parameters)==null?void 0:ee.docs)==null?void 0:ae.source}}};var oe,re,te;w.parameters={...w.parameters,docs:{...(oe=w.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
    showEnvelope: true,
    envelope: [{
      time: 0.2,
      db: -6
    }, {
      time: 0.5,
      db: 3
    }, {
      time: 0.8,
      db: -3
    }]
  }
}`,...(te=(re=w.parameters)==null?void 0:re.docs)==null?void 0:te.source}}};var ne,se,ie;u.parameters={...u.parameters,docs:{...(ne=u.parameters)==null?void 0:ne.docs,source:{originalSource:`{
  args: {
    color: 'violet',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'split-mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
    showEnvelope: true,
    envelope: [{
      time: 0.2,
      db: -6
    }, {
      time: 0.5,
      db: 3
    }, {
      time: 0.8,
      db: -3
    }]
  }
}`,...(ie=(se=u.parameters)==null?void 0:se.docs)==null?void 0:ie.source}}};var le,ce,me;S.parameters={...S.parameters,docs:{...(le=S.parameters)==null?void 0:le.docs,source:{originalSource:`{
  args: {
    color: 'magenta',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'split-stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
    showEnvelope: true,
    envelope: [{
      time: 0.2,
      db: -6
    }, {
      time: 0.5,
      db: 3
    }, {
      time: 0.8,
      db: -3
    }]
  }
}`,...(me=(ce=S.parameters)==null?void 0:ce.docs)==null?void 0:me.source}}};var de,pe,he,fe,ve;t.parameters={...t.parameters,docs:{...(de=t.parameters)==null?void 0:de.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
    clipStartTime: 0,
    clipDuration: 0.5,
    timeSelection: {
      startTime: 0.1,
      endTime: 0.3
    }
  }
}`,...(he=(pe=t.parameters)==null?void 0:pe.docs)==null?void 0:he.source},description:{story:"Time selection (marquee selection) - selecting a range of audio data",...(ve=(fe=t.parameters)==null?void 0:fe.docs)==null?void 0:ve.description}}};var ge,we,ue;M.parameters={...M.parameters,docs:{...(ge=M.parameters)==null?void 0:ge.docs,source:{originalSource:`{
  args: {
    color: 'violet',
    selected: false,
    variant: 'waveform',
    channelMode: 'mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
    clipStartTime: 0,
    clipDuration: 0.5,
    showEnvelope: true,
    envelope: [{
      time: 0.2,
      db: -6
    }, {
      time: 0.5,
      db: 3
    }, {
      time: 0.8,
      db: -3
    }],
    timeSelection: {
      startTime: 0.15,
      endTime: 0.35
    }
  }
}`,...(ue=(we=M.parameters)==null?void 0:we.docs)==null?void 0:ue.source}}};var Se,Me,We;W.parameters={...W.parameters,docs:{...(Se=W.parameters)==null?void 0:Se.docs,source:{originalSource:`{
  args: {
    color: 'magenta',
    selected: false,
    variant: 'spectrogram',
    channelMode: 'split-mono',
    width: 224,
    height: 84,
    waveformData: sampleWaveform,
    clipStartTime: 0,
    clipDuration: 0.5,
    timeSelection: {
      startTime: 0.1,
      endTime: 0.4
    }
  }
}`,...(We=(Me=W.parameters)==null?void 0:Me.docs)==null?void 0:We.source}}};var be,Re,Le,De,ye;n.parameters={...n.parameters,docs:{...(be=n.parameters)==null?void 0:be.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
    channelSplitRatio: 0.5
  }
}`,...(Le=(Re=n.parameters)==null?void 0:Re.docs)==null?void 0:Le.source},description:{story:"Stereo channel split ratios",...(ye=(De=n.parameters)==null?void 0:De.docs)==null?void 0:ye.description}}};var Te,Ee,xe;b.parameters={...b.parameters,docs:{...(Te=b.parameters)==null?void 0:Te.docs,source:{originalSource:`{
  args: {
    color: 'violet',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
    channelSplitRatio: 0.7
  }
}`,...(xe=(Ee=b.parameters)==null?void 0:Ee.docs)==null?void 0:xe.source}}};var Ve,He,Ce;R.parameters={...R.parameters,docs:{...(Ve=R.parameters)==null?void 0:Ve.docs,source:{originalSource:`{
  args: {
    color: 'magenta',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight,
    channelSplitRatio: 0.3
  }
}`,...(Ce=(He=R.parameters)==null?void 0:He.docs)==null?void 0:Ce.source}}};var Be,ze,Ae,ke,Ie;s.parameters={...s.parameters,docs:{...(Be=s.parameters)==null?void 0:Be.docs,source:{originalSource:`{
  args: {
    color: 'green',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 60,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...(Ae=(ze=s.parameters)==null?void 0:ze.docs)==null?void 0:Ae.source},description:{story:"Different clip heights",...(Ie=(ke=s.parameters)==null?void 0:ke.docs)==null?void 0:Ie.description}}};var Xe,_e,qe;L.parameters={...L.parameters,docs:{...(Xe=L.parameters)==null?void 0:Xe.docs,source:{originalSource:`{
  args: {
    color: 'teal',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 84,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...(qe=(_e=L.parameters)==null?void 0:_e.docs)==null?void 0:qe.source}}};var Oe,je,Fe;D.parameters={...D.parameters,docs:{...(Oe=D.parameters)==null?void 0:Oe.docs,source:{originalSource:`{
  args: {
    color: 'orange',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 120,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...(Fe=(je=D.parameters)==null?void 0:je.docs)==null?void 0:Fe.source}}};var Ge,Je,Ke;y.parameters={...y.parameters,docs:{...(Ge=y.parameters)==null?void 0:Ge.docs,source:{originalSource:`{
  args: {
    color: 'red',
    selected: false,
    variant: 'waveform',
    channelMode: 'stereo',
    width: 224,
    height: 200,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...(Ke=(Je=y.parameters)==null?void 0:Je.docs)==null?void 0:Ke.source}}};const $e=["Default","Selected","AllColors","Mono","Stereo","SpectrogramMono","SpectrogramStereo","SplitViewMono","SplitViewStereo","WithEnvelope","SplitViewMonoWithEnvelope","SplitViewStereoWithEnvelope","WithTimeSelection","TimeSelectionWithEnvelope","TimeSelectionSplitView","StereoSplit5050","StereoSplit7030","StereoSplit3070","HeightSmall","HeightMedium","HeightLarge","HeightXLarge"];export{m as AllColors,l as Default,D as HeightLarge,L as HeightMedium,s as HeightSmall,y as HeightXLarge,d as Mono,c as Selected,h as SpectrogramMono,f as SpectrogramStereo,v as SplitViewMono,u as SplitViewMonoWithEnvelope,g as SplitViewStereo,S as SplitViewStereoWithEnvelope,p as Stereo,R as StereoSplit3070,n as StereoSplit5050,b as StereoSplit7030,W as TimeSelectionSplitView,M as TimeSelectionWithEnvelope,w as WithEnvelope,t as WithTimeSelection,$e as __namedExportsOrder,Ze as default};
