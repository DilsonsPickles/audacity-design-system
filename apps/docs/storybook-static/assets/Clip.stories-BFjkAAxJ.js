import{c as Se,g as S,R as e}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const t=S(.5,1800),a=S(.5,1800),r=S(.5,1800),v=[{time:.2,db:-6},{time:.5,db:3},{time:.8,db:-3}],Ee={title:"Audio/Clip",component:Se,tags:["autodocs"],parameters:{layout:"centered"},argTypes:{color:{control:"select",options:["cyan","blue","violet","magenta","red","orange","yellow","green","teal"],description:"Clip color from the 9-color palette"},selected:{control:"boolean",description:"Whether the clip is selected"},state:{control:"select",options:["default","headerHover"],description:"Interaction state"},name:{control:"text",description:"Clip name displayed in header"},width:{control:"number",description:"Width in pixels"},height:{control:"number",description:"Height in pixels"},envelope:{control:!1,description:"Envelope points for automation curve"},showEnvelope:{control:"boolean",description:"Whether to show the envelope overlay"}}},n={args:{color:"blue",selected:!1,state:"default",name:"Clip",width:224,height:104,waveformData:t,envelope:void 0,showEnvelope:!1}},h={args:{...n.args,selected:!0}},g={args:{...n.args,state:"headerHover"}},f={args:{...n.args,selected:!0,state:"headerHover"}},w={args:{color:"blue",selected:!1,state:"default",name:"Stereo Clip",width:224,height:104,waveformLeft:a,waveformRight:r}},u={args:{color:"violet",selected:!0,state:"default",name:"Stereo Selected",width:224,height:104,waveformLeft:a,waveformRight:r}},i={args:{color:"cyan",selected:!1,state:"default",name:"Spectrogram",width:224,height:104,variant:"spectrogram",channelMode:"mono",waveformData:t}},l={args:{color:"violet",selected:!1,state:"default",name:"Stereo Spectrogram",width:224,height:104,variant:"spectrogram",channelMode:"stereo",waveformLeft:a,waveformRight:r}},s={args:{color:"blue",selected:!1,state:"default",name:"Split View Mono",width:224,height:104,variant:"spectrogram",channelMode:"split-mono",waveformData:t}},m={args:{color:"magenta",selected:!1,state:"default",name:"Split View Stereo",width:224,height:104,variant:"spectrogram",channelMode:"split-stereo",waveformLeft:a,waveformRight:r}},p={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",padding:"20px"}},e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Mono Waveform (44px height)"),e.createElement(ClipDisplay,{color:"blue",name:"Mono",width:224,height:44,variant:"waveform",channelMode:"mono",waveformData:t})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Stereo Waveform (44px height)"),e.createElement(ClipDisplay,{color:"violet",name:"Stereo",width:224,height:44,variant:"waveform",channelMode:"stereo",waveformLeft:a,waveformRight:r})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Spectrogram Mono (44px height)"),e.createElement(ClipDisplay,{color:"cyan",name:"Spectro",width:224,height:44,variant:"spectrogram",channelMode:"mono",waveformData:t})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Spectrogram Stereo (44px height)"),e.createElement(ClipDisplay,{color:"magenta",name:"Spectro Stereo",width:224,height:44,variant:"spectrogram",channelMode:"stereo",waveformLeft:a,waveformRight:r})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Split View Mono (44px height)"),e.createElement(ClipDisplay,{color:"green",name:"Split Mono",width:224,height:44,variant:"spectrogram",channelMode:"split-mono",waveformData:t})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Split View Stereo (44px height)"),e.createElement(ClipDisplay,{color:"orange",name:"Split Stereo",width:224,height:44,variant:"spectrogram",channelMode:"split-stereo",waveformLeft:a,waveformRight:r})))},c={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",padding:"20px"}},e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Mono Waveform with Envelope"),e.createElement(ClipDisplay,{color:"blue",name:"Envelope Clip",width:224,height:104,variant:"waveform",channelMode:"mono",waveformData:t,envelope:v,showEnvelope:!0})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Stereo Waveform with Envelope"),e.createElement(ClipDisplay,{color:"violet",name:"Stereo Envelope",width:224,height:104,variant:"waveform",channelMode:"stereo",waveformLeft:a,waveformRight:r,envelope:v,showEnvelope:!0})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Spectrogram with Envelope"),e.createElement(ClipDisplay,{color:"cyan",name:"Spectral Envelope",width:224,height:104,variant:"spectrogram",channelMode:"mono",waveformData:t,envelope:v,showEnvelope:!0})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Split View with Envelope"),e.createElement(ClipDisplay,{color:"magenta",name:"Split Envelope",width:224,height:104,variant:"spectrogram",channelMode:"split-mono",waveformData:t,envelope:v,showEnvelope:!0})))},d={render:()=>e.createElement("div",{style:{padding:"20px"}},e.createElement("h3",{style:{marginBottom:"16px"}},"All Clip States"),e.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:"8px"}},["cyan","blue","violet","magenta","red","orange","yellow","green","teal"].map(o=>e.createElement(e.Fragment,{key:o},e.createElement(ClipDisplay,{color:o,name:`${o} default`,width:180,height:80,waveformData:t}),e.createElement(ClipDisplay,{color:o,name:`${o} hover`,state:"headerHover",width:180,height:80,waveformData:t}),e.createElement(ClipDisplay,{color:o,name:`${o} selected`,selected:!0,width:180,height:80,waveformData:t}),e.createElement(ClipDisplay,{color:o,name:`${o} sel+hover`,selected:!0,state:"headerHover",width:180,height:80,waveformData:t})))))};var y,x,E;n.parameters={...n.parameters,docs:{...(y=n.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    state: 'default',
    name: 'Clip',
    width: 224,
    height: 104,
    waveformData: sampleWaveform,
    envelope: undefined,
    showEnvelope: false
  }
}`,...(E=(x=n.parameters)==null?void 0:x.docs)==null?void 0:E.source}}};var W,D,M;h.parameters={...h.parameters,docs:{...(W=h.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    selected: true
  }
}`,...(M=(D=h.parameters)==null?void 0:D.docs)==null?void 0:M.source}}};var C,b,R;g.parameters={...g.parameters,docs:{...(C=g.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    state: 'headerHover'
  }
}`,...(R=(b=g.parameters)==null?void 0:b.docs)==null?void 0:R.source}}};var L,B,z;f.parameters={...f.parameters,docs:{...(L=f.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    selected: true,
    state: 'headerHover'
  }
}`,...(z=(B=f.parameters)==null?void 0:B.docs)==null?void 0:z.source}}};var H,V,$;w.parameters={...w.parameters,docs:{...(H=w.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    state: 'default',
    name: 'Stereo Clip',
    width: 224,
    height: 104,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...($=(V=w.parameters)==null?void 0:V.docs)==null?void 0:$.source}}};var T,A,F;u.parameters={...u.parameters,docs:{...(T=u.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    color: 'violet',
    selected: true,
    state: 'default',
    name: 'Stereo Selected',
    width: 224,
    height: 104,
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...(F=(A=u.parameters)==null?void 0:A.docs)==null?void 0:F.source}}};var k,_,I,O,j;i.parameters={...i.parameters,docs:{...(k=i.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    color: 'cyan',
    selected: false,
    state: 'default',
    name: 'Spectrogram',
    width: 224,
    height: 104,
    variant: 'spectrogram',
    channelMode: 'mono',
    waveformData: sampleWaveform
  }
}`,...(I=(_=i.parameters)==null?void 0:_.docs)==null?void 0:I.source},description:{story:"Spectrogram view (mono)",...(j=(O=i.parameters)==null?void 0:O.docs)==null?void 0:j.description}}};var q,G,J,K,N;l.parameters={...l.parameters,docs:{...(q=l.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    color: 'violet',
    selected: false,
    state: 'default',
    name: 'Stereo Spectrogram',
    width: 224,
    height: 104,
    variant: 'spectrogram',
    channelMode: 'stereo',
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...(J=(G=l.parameters)==null?void 0:G.docs)==null?void 0:J.source},description:{story:"Spectrogram view (stereo)",...(N=(K=l.parameters)==null?void 0:K.docs)==null?void 0:N.description}}};var P,Q,U,X,Y;s.parameters={...s.parameters,docs:{...(P=s.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    state: 'default',
    name: 'Split View Mono',
    width: 224,
    height: 104,
    variant: 'spectrogram',
    channelMode: 'split-mono',
    waveformData: sampleWaveform
  }
}`,...(U=(Q=s.parameters)==null?void 0:Q.docs)==null?void 0:U.source},description:{story:"Split view (mono) - spectrogram on top, waveform on bottom",...(Y=(X=s.parameters)==null?void 0:X.docs)==null?void 0:Y.description}}};var Z,ee,te,oe,ae;m.parameters={...m.parameters,docs:{...(Z=m.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  args: {
    color: 'magenta',
    selected: false,
    state: 'default',
    name: 'Split View Stereo',
    width: 224,
    height: 104,
    variant: 'spectrogram',
    channelMode: 'split-stereo',
    waveformLeft: sampleWaveformLeft,
    waveformRight: sampleWaveformRight
  }
}`,...(te=(ee=m.parameters)==null?void 0:ee.docs)==null?void 0:te.source},description:{story:"Split view (stereo) - stereo spectrogram on top, stereo waveform on bottom",...(ae=(oe=m.parameters)==null?void 0:oe.docs)==null?void 0:ae.description}}};var re,ne,ie,le,se;p.parameters={...p.parameters,docs:{...(re=p.parameters)==null?void 0:re.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px'
  }}>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>Mono Waveform (44px height)</div>
        <ClipDisplay color="blue" name="Mono" width={224} height={44} variant="waveform" channelMode="mono" waveformData={sampleWaveform} />
      </div>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>Stereo Waveform (44px height)</div>
        <ClipDisplay color="violet" name="Stereo" width={224} height={44} variant="waveform" channelMode="stereo" waveformLeft={sampleWaveformLeft} waveformRight={sampleWaveformRight} />
      </div>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>Spectrogram Mono (44px height)</div>
        <ClipDisplay color="cyan" name="Spectro" width={224} height={44} variant="spectrogram" channelMode="mono" waveformData={sampleWaveform} />
      </div>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>Spectrogram Stereo (44px height)</div>
        <ClipDisplay color="magenta" name="Spectro Stereo" width={224} height={44} variant="spectrogram" channelMode="stereo" waveformLeft={sampleWaveformLeft} waveformRight={sampleWaveformRight} />
      </div>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>Split View Mono (44px height)</div>
        <ClipDisplay color="green" name="Split Mono" width={224} height={44} variant="spectrogram" channelMode="split-mono" waveformData={sampleWaveform} />
      </div>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>Split View Stereo (44px height)</div>
        <ClipDisplay color="orange" name="Split Stereo" width={224} height={44} variant="spectrogram" channelMode="split-stereo" waveformLeft={sampleWaveformLeft} waveformRight={sampleWaveformRight} />
      </div>
    </div>
}`,...(ie=(ne=p.parameters)==null?void 0:ne.docs)==null?void 0:ie.source},description:{story:`Truncated view - all body types at minimum height (44px)
Header is hidden until hover`,...(se=(le=p.parameters)==null?void 0:le.docs)==null?void 0:se.description}}};var me,pe,ce,de,ve;c.parameters={...c.parameters,docs:{...(me=c.parameters)==null?void 0:me.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px'
  }}>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>Mono Waveform with Envelope</div>
        <ClipDisplay color="blue" name="Envelope Clip" width={224} height={104} variant="waveform" channelMode="mono" waveformData={sampleWaveform} envelope={sampleEnvelope} showEnvelope={true} />
      </div>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>Stereo Waveform with Envelope</div>
        <ClipDisplay color="violet" name="Stereo Envelope" width={224} height={104} variant="waveform" channelMode="stereo" waveformLeft={sampleWaveformLeft} waveformRight={sampleWaveformRight} envelope={sampleEnvelope} showEnvelope={true} />
      </div>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>Spectrogram with Envelope</div>
        <ClipDisplay color="cyan" name="Spectral Envelope" width={224} height={104} variant="spectrogram" channelMode="mono" waveformData={sampleWaveform} envelope={sampleEnvelope} showEnvelope={true} />
      </div>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>Split View with Envelope</div>
        <ClipDisplay color="magenta" name="Split Envelope" width={224} height={104} variant="spectrogram" channelMode="split-mono" waveformData={sampleWaveform} envelope={sampleEnvelope} showEnvelope={true} />
      </div>
    </div>
}`,...(ce=(pe=c.parameters)==null?void 0:pe.docs)==null?void 0:ce.source},description:{story:"Clips with envelope automation curves",...(ve=(de=c.parameters)==null?void 0:de.docs)==null?void 0:ve.description}}};var he,ge,fe,we,ue;d.parameters={...d.parameters,docs:{...(he=d.parameters)==null?void 0:he.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: '20px'
  }}>
      <h3 style={{
      marginBottom: '16px'
    }}>All Clip States</h3>
      <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px'
    }}>
        {['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'].map(color => <React.Fragment key={color}>
            <ClipDisplay color={color as any} name={\`\${color} default\`} width={180} height={80} waveformData={sampleWaveform} />
            <ClipDisplay color={color as any} name={\`\${color} hover\`} state="headerHover" width={180} height={80} waveformData={sampleWaveform} />
            <ClipDisplay color={color as any} name={\`\${color} selected\`} selected width={180} height={80} waveformData={sampleWaveform} />
            <ClipDisplay color={color as any} name={\`\${color} sel+hover\`} selected state="headerHover" width={180} height={80} waveformData={sampleWaveform} />
          </React.Fragment>)}
      </div>
    </div>
}`,...(fe=(ge=d.parameters)==null?void 0:ge.docs)==null?void 0:fe.source},description:{story:"Complete color matrix showing all combinations",...(ue=(we=d.parameters)==null?void 0:we.docs)==null?void 0:ue.description}}};const We=["Default","Selected","HeaderHover","SelectedHeaderHover","Stereo","StereoSelected","SpectrogramMono","SpectrogramStereo","SplitViewMono","SplitViewStereo","TruncatedViews","WithEnvelope","ColorMatrix"];export{d as ColorMatrix,n as Default,g as HeaderHover,h as Selected,f as SelectedHeaderHover,i as SpectrogramMono,l as SpectrogramStereo,s as SplitViewMono,m as SplitViewStereo,w as Stereo,u as StereoSelected,p as TruncatedViews,c as WithEnvelope,We as __namedExportsOrder,Ee as default};
