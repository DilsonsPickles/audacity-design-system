import{R as e}from"./index-yIsmwZOr.js";import{d as t,g as x}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const o=x(.5,1800),r=x(.5,1800),n=x(.5,1800),h=[{time:.2,db:-6},{time:.5,db:3},{time:.8,db:-3}],Me={title:"Audio/ClipDisplay",component:t,tags:["autodocs"],parameters:{layout:"centered"},argTypes:{color:{control:"select",options:["cyan","blue","violet","magenta","red","orange","yellow","green","teal"],description:"Clip color from the 9-color palette"},selected:{control:"boolean",description:"Whether the clip is selected"},state:{control:"select",options:["default","headerHover"],description:"Interaction state"},name:{control:"text",description:"Clip name displayed in header"},width:{control:"number",description:"Width in pixels"},height:{control:"number",description:"Height in pixels"},envelope:{control:!1,description:"Envelope points for automation curve"},showEnvelope:{control:"boolean",description:"Whether to show the envelope overlay"}}},i={args:{color:"blue",selected:!1,state:"default",name:"Clip",width:224,height:104,waveformData:o,envelope:void 0,showEnvelope:!1}},g={args:{...i.args,selected:!0}},f={args:{...i.args,state:"headerHover"}},w={args:{...i.args,selected:!0,state:"headerHover"}},u={args:{color:"blue",selected:!1,state:"default",name:"Stereo Clip",width:224,height:104,waveformLeft:r,waveformRight:n}},S={args:{color:"violet",selected:!0,state:"default",name:"Stereo Selected",width:224,height:104,waveformLeft:r,waveformRight:n}},l={args:{color:"cyan",selected:!1,state:"default",name:"Spectrogram",width:224,height:104,variant:"spectrogram",channelMode:"mono",waveformData:o}},s={args:{color:"violet",selected:!1,state:"default",name:"Stereo Spectrogram",width:224,height:104,variant:"spectrogram",channelMode:"stereo",waveformLeft:r,waveformRight:n}},m={args:{color:"blue",selected:!1,state:"default",name:"Split View Mono",width:224,height:104,variant:"spectrogram",channelMode:"split-mono",waveformData:o}},p={args:{color:"magenta",selected:!1,state:"default",name:"Split View Stereo",width:224,height:104,variant:"spectrogram",channelMode:"split-stereo",waveformLeft:r,waveformRight:n}},c={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",padding:"20px"}},e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Mono Waveform (44px height)"),e.createElement(t,{color:"blue",name:"Mono",width:224,height:44,variant:"waveform",channelMode:"mono",waveformData:o})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Stereo Waveform (44px height)"),e.createElement(t,{color:"violet",name:"Stereo",width:224,height:44,variant:"waveform",channelMode:"stereo",waveformLeft:r,waveformRight:n})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Spectrogram Mono (44px height)"),e.createElement(t,{color:"cyan",name:"Spectro",width:224,height:44,variant:"spectrogram",channelMode:"mono",waveformData:o})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Spectrogram Stereo (44px height)"),e.createElement(t,{color:"magenta",name:"Spectro Stereo",width:224,height:44,variant:"spectrogram",channelMode:"stereo",waveformLeft:r,waveformRight:n})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Split View Mono (44px height)"),e.createElement(t,{color:"green",name:"Split Mono",width:224,height:44,variant:"spectrogram",channelMode:"split-mono",waveformData:o})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Split View Stereo (44px height)"),e.createElement(t,{color:"orange",name:"Split Stereo",width:224,height:44,variant:"spectrogram",channelMode:"split-stereo",waveformLeft:r,waveformRight:n})))},d={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",padding:"20px"}},e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Mono Waveform with Envelope"),e.createElement(t,{color:"blue",name:"Envelope Clip",width:224,height:104,variant:"waveform",channelMode:"mono",waveformData:o,envelope:h,showEnvelope:!0})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Stereo Waveform with Envelope"),e.createElement(t,{color:"violet",name:"Stereo Envelope",width:224,height:104,variant:"waveform",channelMode:"stereo",waveformLeft:r,waveformRight:n,envelope:h,showEnvelope:!0})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Spectrogram with Envelope"),e.createElement(t,{color:"cyan",name:"Spectral Envelope",width:224,height:104,variant:"spectrogram",channelMode:"mono",waveformData:o,envelope:h,showEnvelope:!0})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontWeight:"bold"}},"Split View with Envelope"),e.createElement(t,{color:"magenta",name:"Split Envelope",width:224,height:104,variant:"spectrogram",channelMode:"split-mono",waveformData:o,envelope:h,showEnvelope:!0})))},v={render:()=>e.createElement("div",{style:{padding:"20px"}},e.createElement("h3",{style:{marginBottom:"16px"}},"All Clip States"),e.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:"8px"}},["cyan","blue","violet","magenta","red","orange","yellow","green","teal"].map(a=>e.createElement(e.Fragment,{key:a},e.createElement(t,{color:a,name:`${a} default`,width:180,height:80,waveformData:o}),e.createElement(t,{color:a,name:`${a} hover`,state:"headerHover",width:180,height:80,waveformData:o}),e.createElement(t,{color:a,name:`${a} selected`,selected:!0,width:180,height:80,waveformData:o}),e.createElement(t,{color:a,name:`${a} sel+hover`,selected:!0,state:"headerHover",width:180,height:80,waveformData:o})))))};var y,E,W;i.parameters={...i.parameters,docs:{...(y=i.parameters)==null?void 0:y.docs,source:{originalSource:`{
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
}`,...(W=(E=i.parameters)==null?void 0:E.docs)==null?void 0:W.source}}};var D,M,b;g.parameters={...g.parameters,docs:{...(D=g.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    selected: true
  }
}`,...(b=(M=g.parameters)==null?void 0:M.docs)==null?void 0:b.source}}};var C,R,L;f.parameters={...f.parameters,docs:{...(C=f.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    state: 'headerHover'
  }
}`,...(L=(R=f.parameters)==null?void 0:R.docs)==null?void 0:L.source}}};var B,z,H;w.parameters={...w.parameters,docs:{...(B=w.parameters)==null?void 0:B.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    selected: true,
    state: 'headerHover'
  }
}`,...(H=(z=w.parameters)==null?void 0:z.docs)==null?void 0:H.source}}};var V,$,T;u.parameters={...u.parameters,docs:{...(V=u.parameters)==null?void 0:V.docs,source:{originalSource:`{
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
}`,...(T=($=u.parameters)==null?void 0:$.docs)==null?void 0:T.source}}};var A,F,k;S.parameters={...S.parameters,docs:{...(A=S.parameters)==null?void 0:A.docs,source:{originalSource:`{
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
}`,...(k=(F=S.parameters)==null?void 0:F.docs)==null?void 0:k.source}}};var _,I,O,j,q;l.parameters={...l.parameters,docs:{...(_=l.parameters)==null?void 0:_.docs,source:{originalSource:`{
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
}`,...(O=(I=l.parameters)==null?void 0:I.docs)==null?void 0:O.source},description:{story:"Spectrogram view (mono)",...(q=(j=l.parameters)==null?void 0:j.docs)==null?void 0:q.description}}};var G,J,K,N,P;s.parameters={...s.parameters,docs:{...(G=s.parameters)==null?void 0:G.docs,source:{originalSource:`{
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
}`,...(K=(J=s.parameters)==null?void 0:J.docs)==null?void 0:K.source},description:{story:"Spectrogram view (stereo)",...(P=(N=s.parameters)==null?void 0:N.docs)==null?void 0:P.description}}};var Q,U,X,Y,Z;m.parameters={...m.parameters,docs:{...(Q=m.parameters)==null?void 0:Q.docs,source:{originalSource:`{
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
}`,...(X=(U=m.parameters)==null?void 0:U.docs)==null?void 0:X.source},description:{story:"Split view (mono) - spectrogram on top, waveform on bottom",...(Z=(Y=m.parameters)==null?void 0:Y.docs)==null?void 0:Z.description}}};var ee,te,oe,ae,re;p.parameters={...p.parameters,docs:{...(ee=p.parameters)==null?void 0:ee.docs,source:{originalSource:`{
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
}`,...(oe=(te=p.parameters)==null?void 0:te.docs)==null?void 0:oe.source},description:{story:"Split view (stereo) - stereo spectrogram on top, stereo waveform on bottom",...(re=(ae=p.parameters)==null?void 0:ae.docs)==null?void 0:re.description}}};var ne,ie,le,se,me;c.parameters={...c.parameters,docs:{...(ne=c.parameters)==null?void 0:ne.docs,source:{originalSource:`{
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
}`,...(le=(ie=c.parameters)==null?void 0:ie.docs)==null?void 0:le.source},description:{story:`Truncated view - all body types at minimum height (44px)
Header is hidden until hover`,...(me=(se=c.parameters)==null?void 0:se.docs)==null?void 0:me.description}}};var pe,ce,de,ve,he;d.parameters={...d.parameters,docs:{...(pe=d.parameters)==null?void 0:pe.docs,source:{originalSource:`{
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
}`,...(de=(ce=d.parameters)==null?void 0:ce.docs)==null?void 0:de.source},description:{story:"Clips with envelope automation curves",...(he=(ve=d.parameters)==null?void 0:ve.docs)==null?void 0:he.description}}};var ge,fe,we,ue,Se;v.parameters={...v.parameters,docs:{...(ge=v.parameters)==null?void 0:ge.docs,source:{originalSource:`{
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
}`,...(we=(fe=v.parameters)==null?void 0:fe.docs)==null?void 0:we.source},description:{story:"Complete color matrix showing all combinations",...(Se=(ue=v.parameters)==null?void 0:ue.docs)==null?void 0:Se.description}}};const be=["Default","Selected","HeaderHover","SelectedHeaderHover","Stereo","StereoSelected","SpectrogramMono","SpectrogramStereo","SplitViewMono","SplitViewStereo","TruncatedViews","WithEnvelope","ColorMatrix"];export{v as ColorMatrix,i as Default,f as HeaderHover,g as Selected,w as SelectedHeaderHover,l as SpectrogramMono,s as SpectrogramStereo,m as SplitViewMono,p as SplitViewStereo,u as Stereo,S as StereoSelected,c as TruncatedViews,d as WithEnvelope,be as __namedExportsOrder,Me as default};
