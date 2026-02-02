import{Q as a,r as e,u as r}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const W={title:"Layout/SidePanel",component:a,parameters:{layout:"fullscreen"},tags:["autodocs"]},p=()=>e.createElement("div",{style:{padding:"16px"}},e.createElement("h3",{style:{margin:"0 0 16px 0",fontSize:"14px",color:"#fff"}},"Panel Content"),Array.from({length:10},(n,t)=>e.createElement("div",{key:t,style:{padding:"12px",marginBottom:"8px",background:"#2a2a2a",borderRadius:"4px",color:"#fff",fontSize:"13px"}},"Item ",t+1))),l={args:{position:"left",width:200,resizable:!0,children:e.createElement(p,null)},render:n=>e.createElement("div",{style:{display:"flex",width:"100vw",height:"100vh",background:"#1a1a1a"}},e.createElement(a,{...n}),e.createElement("div",{style:{flex:1,padding:"20px",color:"#fff"}},e.createElement("h2",null,"Main Content Area"),e.createElement("p",null,"The side panel can be resized by dragging its edge.")))},i={args:{position:"right",width:250,resizable:!0,children:e.createElement(p,null)},render:n=>e.createElement("div",{style:{display:"flex",width:"100vw",height:"100vh",background:"#1a1a1a"}},e.createElement("div",{style:{flex:1,padding:"20px",color:"#fff"}},e.createElement("h2",null,"Main Content Area"),e.createElement("p",null,"The side panel can be resized by dragging its edge.")),e.createElement(a,{...n}))},s={args:{position:"left",width:200,resizable:!1,children:e.createElement(p,null)},render:n=>e.createElement("div",{style:{display:"flex",width:"100vw",height:"100vh",background:"#1a1a1a"}},e.createElement(a,{...n}),e.createElement("div",{style:{flex:1,padding:"20px",color:"#fff"}},e.createElement("h2",null,"Main Content Area"),e.createElement("p",null,"This panel cannot be resized.")))},o={args:{position:"left",width:400,resizable:!0,minWidth:300,maxWidth:600,children:e.createElement(p,null)},render:n=>e.createElement("div",{style:{display:"flex",width:"100vw",height:"100vh",background:"#1a1a1a"}},e.createElement(a,{...n}),e.createElement("div",{style:{flex:1,padding:"20px",color:"#fff"}},e.createElement("h2",null,"Main Content Area"),e.createElement("p",null,"This panel is wider and has custom min/max width constraints (300-600px).")))},d={args:{position:"left",width:200,resizable:!0,children:e.createElement("div",{style:{padding:"16px"}},e.createElement("h3",{style:{margin:"0 0 16px 0",fontSize:"14px",color:"#fff"}},"Long List"),Array.from({length:50},(n,t)=>e.createElement("div",{key:t,style:{padding:"12px",marginBottom:"8px",background:"#2a2a2a",borderRadius:"4px",color:"#fff",fontSize:"13px"}},"Item ",t+1)))},render:n=>e.createElement("div",{style:{display:"flex",width:"100vw",height:"100vh",background:"#1a1a1a"}},e.createElement(a,{...n}),e.createElement("div",{style:{flex:1,padding:"20px",color:"#fff"}},e.createElement("h2",null,"Main Content Area"),e.createElement("p",null,"The panel content is scrollable when it exceeds the panel height.")))},c={args:{position:"left",width:240,resizable:!0,children:e.createElement(e.Fragment,null,e.createElement(r,{trackName:"Track 1 - Vocals",trackType:"mono",volume:75,pan:0,isMuted:!1,isSolo:!1,height:"default"}),e.createElement(r,{trackName:"Track 2 - Guitar",trackType:"stereo",volume:60,pan:-30,isMuted:!1,isSolo:!0,height:"default"}),e.createElement(r,{trackName:"Track 3 - Bass",trackType:"mono",volume:80,pan:0,isMuted:!0,isSolo:!1,height:"default"}),e.createElement(r,{trackName:"Track 4 - Drums",trackType:"stereo",volume:70,pan:15,isMuted:!1,isSolo:!1,height:"default"}))},render:n=>e.createElement("div",{style:{display:"flex",width:"100vw",height:"100vh",background:"#1a1a1a"}},e.createElement(a,{...n}),e.createElement("div",{style:{flex:1,padding:"20px",color:"#fff"}},e.createElement("h2",null,"Track List"),e.createElement("p",null,"Side panel containing multiple track control panels, similar to an Audacity-style layout.")))};var h,m,f;l.parameters={...l.parameters,docs:{...(h=l.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    position: 'left',
    width: 200,
    resizable: true,
    children: <SampleContent />
  },
  render: args => <div style={{
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#1a1a1a'
  }}>
      <SidePanel {...args} />
      <div style={{
      flex: 1,
      padding: '20px',
      color: '#fff'
    }}>
        <h2>Main Content Area</h2>
        <p>The side panel can be resized by dragging its edge.</p>
      </div>
    </div>
}`,...(f=(m=l.parameters)==null?void 0:m.docs)==null?void 0:f.source}}};var g,u,v;i.parameters={...i.parameters,docs:{...(g=i.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    position: 'right',
    width: 250,
    resizable: true,
    children: <SampleContent />
  },
  render: args => <div style={{
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#1a1a1a'
  }}>
      <div style={{
      flex: 1,
      padding: '20px',
      color: '#fff'
    }}>
        <h2>Main Content Area</h2>
        <p>The side panel can be resized by dragging its edge.</p>
      </div>
      <SidePanel {...args} />
    </div>
}`,...(v=(u=i.parameters)==null?void 0:u.docs)==null?void 0:v.source}}};var y,x,k;s.parameters={...s.parameters,docs:{...(y=s.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    position: 'left',
    width: 200,
    resizable: false,
    children: <SampleContent />
  },
  render: args => <div style={{
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#1a1a1a'
  }}>
      <SidePanel {...args} />
      <div style={{
      flex: 1,
      padding: '20px',
      color: '#fff'
    }}>
        <h2>Main Content Area</h2>
        <p>This panel cannot be resized.</p>
      </div>
    </div>
}`,...(k=(x=s.parameters)==null?void 0:x.docs)==null?void 0:k.source}}};var E,b,w;o.parameters={...o.parameters,docs:{...(E=o.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    position: 'left',
    width: 400,
    resizable: true,
    minWidth: 300,
    maxWidth: 600,
    children: <SampleContent />
  },
  render: args => <div style={{
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#1a1a1a'
  }}>
      <SidePanel {...args} />
      <div style={{
      flex: 1,
      padding: '20px',
      color: '#fff'
    }}>
        <h2>Main Content Area</h2>
        <p>This panel is wider and has custom min/max width constraints (300-600px).</p>
      </div>
    </div>
}`,...(w=(b=o.parameters)==null?void 0:b.docs)==null?void 0:w.source}}};var S,T,z;d.parameters={...d.parameters,docs:{...(S=d.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    position: 'left',
    width: 200,
    resizable: true,
    children: <div style={{
      padding: '16px'
    }}>
        <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        color: '#fff'
      }}>Long List</h3>
        {Array.from({
        length: 50
      }, (_, i) => <div key={i} style={{
        padding: '12px',
        marginBottom: '8px',
        background: '#2a2a2a',
        borderRadius: '4px',
        color: '#fff',
        fontSize: '13px'
      }}>
            Item {i + 1}
          </div>)}
      </div>
  },
  render: args => <div style={{
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#1a1a1a'
  }}>
      <SidePanel {...args} />
      <div style={{
      flex: 1,
      padding: '20px',
      color: '#fff'
    }}>
        <h2>Main Content Area</h2>
        <p>The panel content is scrollable when it exceeds the panel height.</p>
      </div>
    </div>
}`,...(z=(T=d.parameters)==null?void 0:T.docs)==null?void 0:z.source}}};var C,P,M;c.parameters={...c.parameters,docs:{...(C=c.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    position: 'left',
    width: 240,
    resizable: true,
    children: <>
        <TrackControlPanel trackName="Track 1 - Vocals" trackType="mono" volume={75} pan={0} isMuted={false} isSolo={false} height="default" />
        <TrackControlPanel trackName="Track 2 - Guitar" trackType="stereo" volume={60} pan={-30} isMuted={false} isSolo={true} height="default" />
        <TrackControlPanel trackName="Track 3 - Bass" trackType="mono" volume={80} pan={0} isMuted={true} isSolo={false} height="default" />
        <TrackControlPanel trackName="Track 4 - Drums" trackType="stereo" volume={70} pan={15} isMuted={false} isSolo={false} height="default" />
      </>
  },
  render: args => <div style={{
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#1a1a1a'
  }}>
      <SidePanel {...args} />
      <div style={{
      flex: 1,
      padding: '20px',
      color: '#fff'
    }}>
        <h2>Track List</h2>
        <p>Side panel containing multiple track control panels, similar to an Audacity-style layout.</p>
      </div>
    </div>
}`,...(M=(P=c.parameters)==null?void 0:P.docs)==null?void 0:M.source}}};const L=["LeftPanel","RightPanel","NonResizable","WidePanel","WithScrollableContent","WithTrackControlPanels"];export{l as LeftPanel,s as NonResizable,i as RightPanel,o as WidePanel,d as WithScrollableContent,c as WithTrackControlPanels,L as __namedExportsOrder,W as default};
