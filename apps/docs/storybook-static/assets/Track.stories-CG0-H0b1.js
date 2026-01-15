import{R as e,r as k}from"./index-yIsmwZOr.js";import{Y as t}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const te={title:"Audio Components/Track",component:t,parameters:{layout:"fullscreen"},tags:["autodocs"],argTypes:{height:{control:{type:"range",min:44,max:400,step:10},description:"Track height in pixels"},trackIndex:{control:{type:"select",options:[0,1,2]},description:"Track index (determines color scheme)"},isSelected:{control:"boolean",description:"Whether the track is selected"},isFocused:{control:"boolean",description:"Whether the track has focus (shows blue borders)"},pixelsPerSecond:{control:{type:"range",min:10,max:200,step:10},description:"Zoom level"},width:{control:{type:"range",min:800,max:5e3,step:100},description:"Track width in pixels"},backgroundColor:{control:"color",description:"Canvas background color"}}},n=[{id:1,name:"Intro",start:0,duration:2.5,selected:!1},{id:2,name:"Verse 1",start:3,duration:4,selected:!1},{id:3,name:"Chorus",start:8,duration:3.5,selected:!1}],o={args:{clips:n,height:114,trackIndex:0,isSelected:!1,isFocused:!1,pixelsPerSecond:100,width:2e3,backgroundColor:"#212433"},render:r=>e.createElement("div",{style:{padding:"20px",backgroundColor:"#212433",minHeight:"200px"}},e.createElement(t,{...r}))},a={args:{clips:n,height:114,trackIndex:0,isSelected:!0,isFocused:!1,pixelsPerSecond:100,width:2e3,backgroundColor:"#212433"},render:r=>e.createElement("div",{style:{padding:"20px",backgroundColor:"#212433",minHeight:"200px"}},e.createElement(t,{...r}))},c={args:{clips:n,height:114,trackIndex:0,isSelected:!0,isFocused:!0,pixelsPerSecond:100,width:2e3,backgroundColor:"#212433"},render:r=>e.createElement("div",{style:{padding:"20px",backgroundColor:"#212433",minHeight:"200px"}},e.createElement(t,{...r}))},i={args:{clips:[{id:1,name:"Intro",start:0,duration:2.5,selected:!1},{id:2,name:"Verse 1",start:3,duration:4,selected:!0},{id:3,name:"Chorus",start:8,duration:3.5,selected:!1}],height:114,trackIndex:0,isSelected:!0,isFocused:!1,pixelsPerSecond:100,width:2e3,backgroundColor:"#212433"},render:r=>e.createElement("div",{style:{padding:"20px",backgroundColor:"#212433",minHeight:"200px"}},e.createElement(t,{...r}))},d={render:()=>e.createElement("div",{style:{padding:"20px",backgroundColor:"#212433",minHeight:"600px",display:"flex",flexDirection:"column",gap:"20px"}},e.createElement("div",null,e.createElement("h3",{style:{color:"white",marginBottom:"10px"}},"Track 1 (Blue)"),e.createElement(t,{clips:n,height:114,trackIndex:0,isSelected:!1,isFocused:!1,pixelsPerSecond:100,width:2e3,backgroundColor:"#212433"})),e.createElement("div",null,e.createElement("h3",{style:{color:"white",marginBottom:"10px"}},"Track 2 (Violet)"),e.createElement(t,{clips:n,height:114,trackIndex:1,isSelected:!1,isFocused:!1,pixelsPerSecond:100,width:2e3,backgroundColor:"#212433"})),e.createElement("div",null,e.createElement("h3",{style:{color:"white",marginBottom:"10px"}},"Track 3 (Magenta)"),e.createElement(t,{clips:n,height:114,trackIndex:2,isSelected:!1,isFocused:!1,pixelsPerSecond:100,width:2e3,backgroundColor:"#212433"})))},l={render:()=>{const r=()=>{const[s,K]=k.useState(null),[h,L]=k.useState(!1),N=[{id:1,name:"Intro",start:0,duration:2.5,selected:s===1},{id:2,name:"Verse 1",start:3,duration:4,selected:s===2},{id:3,name:"Chorus",start:8,duration:3.5,selected:s===3}];return e.createElement("div",{style:{padding:"20px",backgroundColor:"#212433",minHeight:"200px"}},e.createElement("p",{style:{color:"white",marginBottom:"10px"}},"Click on clips to select them, click on track background to focus the track"),e.createElement(t,{clips:N,height:114,trackIndex:0,isSelected:s!==null,isFocused:h,pixelsPerSecond:100,width:2e3,backgroundColor:"#212433",onClipClick:Q=>K(Q),onTrackClick:()=>L(!h)}),s&&e.createElement("p",{style:{color:"white",marginTop:"10px"}},"Selected clip: ",s))};return e.createElement(r,null)}},p={args:{clips:n,height:114,trackIndex:0,isSelected:!1,isFocused:!1,pixelsPerSecond:200,width:4e3,backgroundColor:"#212433"},render:r=>e.createElement("div",{style:{padding:"20px",backgroundColor:"#212433",minHeight:"200px",overflow:"auto"}},e.createElement(t,{...r}))},g={args:{clips:n,height:114,trackIndex:0,isSelected:!1,isFocused:!1,pixelsPerSecond:50,width:1e3,backgroundColor:"#212433"},render:r=>e.createElement("div",{style:{padding:"20px",backgroundColor:"#212433",minHeight:"200px"}},e.createElement(t,{...r}))},u={args:{clips:n,height:44,trackIndex:0,isSelected:!1,isFocused:!1,pixelsPerSecond:100,width:2e3,backgroundColor:"#212433"},render:r=>e.createElement("div",{style:{padding:"20px",backgroundColor:"#212433",minHeight:"200px"}},e.createElement(t,{...r}))},m={args:{clips:n,height:200,trackIndex:0,isSelected:!1,isFocused:!1,pixelsPerSecond:100,width:2e3,backgroundColor:"#212433"},render:r=>e.createElement("div",{style:{padding:"20px",backgroundColor:"#212433",minHeight:"300px"}},e.createElement(t,{...r}))};var x,C,S;o.parameters={...o.parameters,docs:{...(x=o.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433'
  },
  render: args => <div style={{
    padding: '20px',
    backgroundColor: '#212433',
    minHeight: '200px'
  }}>
      <Track {...args} />
    </div>
}`,...(S=(C=o.parameters)==null?void 0:C.docs)==null?void 0:S.source}}};var f,b,I;a.parameters={...a.parameters,docs:{...(f=a.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: true,
    isFocused: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433'
  },
  render: args => <div style={{
    padding: '20px',
    backgroundColor: '#212433',
    minHeight: '200px'
  }}>
      <Track {...args} />
    </div>
}`,...(I=(b=a.parameters)==null?void 0:b.docs)==null?void 0:I.source}}};var v,w,y;c.parameters={...c.parameters,docs:{...(v=c.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: true,
    isFocused: true,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433'
  },
  render: args => <div style={{
    padding: '20px',
    backgroundColor: '#212433',
    minHeight: '200px'
  }}>
      <Track {...args} />
    </div>
}`,...(y=(w=c.parameters)==null?void 0:w.docs)==null?void 0:y.source}}};var E,T,F;i.parameters={...i.parameters,docs:{...(E=i.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    clips: [{
      id: 1,
      name: 'Intro',
      start: 0,
      duration: 2.5,
      selected: false
    }, {
      id: 2,
      name: 'Verse 1',
      start: 3,
      duration: 4,
      selected: true
    }, {
      id: 3,
      name: 'Chorus',
      start: 8,
      duration: 3.5,
      selected: false
    }],
    height: 114,
    trackIndex: 0,
    isSelected: true,
    isFocused: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433'
  },
  render: args => <div style={{
    padding: '20px',
    backgroundColor: '#212433',
    minHeight: '200px'
  }}>
      <Track {...args} />
    </div>
}`,...(F=(T=i.parameters)==null?void 0:T.docs)==null?void 0:F.source}}};var P,H,B;d.parameters={...d.parameters,docs:{...(P=d.parameters)==null?void 0:P.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: '20px',
    backgroundColor: '#212433',
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  }}>
      <div>
        <h3 style={{
        color: 'white',
        marginBottom: '10px'
      }}>Track 1 (Blue)</h3>
        <Track clips={sampleClips} height={114} trackIndex={0} isSelected={false} isFocused={false} pixelsPerSecond={100} width={2000} backgroundColor="#212433" />
      </div>
      <div>
        <h3 style={{
        color: 'white',
        marginBottom: '10px'
      }}>Track 2 (Violet)</h3>
        <Track clips={sampleClips} height={114} trackIndex={1} isSelected={false} isFocused={false} pixelsPerSecond={100} width={2000} backgroundColor="#212433" />
      </div>
      <div>
        <h3 style={{
        color: 'white',
        marginBottom: '10px'
      }}>Track 3 (Magenta)</h3>
        <Track clips={sampleClips} height={114} trackIndex={2} isSelected={false} isFocused={false} pixelsPerSecond={100} width={2000} backgroundColor="#212433" />
      </div>
    </div>
}`,...(B=(H=d.parameters)==null?void 0:H.docs)==null?void 0:B.source}}};var V,Z,D;l.parameters={...l.parameters,docs:{...(V=l.parameters)==null?void 0:V.docs,source:{originalSource:`{
  render: () => {
    const InteractiveTrack = () => {
      const [selectedClipId, setSelectedClipId] = useState<string | number | null>(null);
      const [isFocused, setIsFocused] = useState(false);
      const clips: TrackClip[] = [{
        id: 1,
        name: 'Intro',
        start: 0,
        duration: 2.5,
        selected: selectedClipId === 1
      }, {
        id: 2,
        name: 'Verse 1',
        start: 3,
        duration: 4,
        selected: selectedClipId === 2
      }, {
        id: 3,
        name: 'Chorus',
        start: 8,
        duration: 3.5,
        selected: selectedClipId === 3
      }];
      return <div style={{
        padding: '20px',
        backgroundColor: '#212433',
        minHeight: '200px'
      }}>
          <p style={{
          color: 'white',
          marginBottom: '10px'
        }}>
            Click on clips to select them, click on track background to focus the track
          </p>
          <Track clips={clips} height={114} trackIndex={0} isSelected={selectedClipId !== null} isFocused={isFocused} pixelsPerSecond={100} width={2000} backgroundColor="#212433" onClipClick={clipId => setSelectedClipId(clipId)} onTrackClick={() => setIsFocused(!isFocused)} />
          {selectedClipId && <p style={{
          color: 'white',
          marginTop: '10px'
        }}>Selected clip: {selectedClipId}</p>}
        </div>;
    };
    return <InteractiveTrack />;
  }
}`,...(D=(Z=l.parameters)==null?void 0:Z.docs)==null?void 0:D.source}}};var W,O,M;p.parameters={...p.parameters,docs:{...(W=p.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    pixelsPerSecond: 200,
    width: 4000,
    backgroundColor: '#212433'
  },
  render: args => <div style={{
    padding: '20px',
    backgroundColor: '#212433',
    minHeight: '200px',
    overflow: 'auto'
  }}>
      <Track {...args} />
    </div>
}`,...(M=(O=p.parameters)==null?void 0:O.docs)==null?void 0:M.source}}};var R,_,A;g.parameters={...g.parameters,docs:{...(R=g.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    clips: sampleClips,
    height: 114,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    pixelsPerSecond: 50,
    width: 1000,
    backgroundColor: '#212433'
  },
  render: args => <div style={{
    padding: '20px',
    backgroundColor: '#212433',
    minHeight: '200px'
  }}>
      <Track {...args} />
    </div>
}`,...(A=(_=g.parameters)==null?void 0:_.docs)==null?void 0:A.source}}};var Y,j,q;u.parameters={...u.parameters,docs:{...(Y=u.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  args: {
    clips: sampleClips,
    height: 44,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433'
  },
  render: args => <div style={{
    padding: '20px',
    backgroundColor: '#212433',
    minHeight: '200px'
  }}>
      <Track {...args} />
    </div>
}`,...(q=(j=u.parameters)==null?void 0:j.docs)==null?void 0:q.source}}};var z,G,J;m.parameters={...m.parameters,docs:{...(z=m.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    clips: sampleClips,
    height: 200,
    trackIndex: 0,
    isSelected: false,
    isFocused: false,
    pixelsPerSecond: 100,
    width: 2000,
    backgroundColor: '#212433'
  },
  render: args => <div style={{
    padding: '20px',
    backgroundColor: '#212433',
    minHeight: '300px'
  }}>
      <Track {...args} />
    </div>
}`,...(J=(G=m.parameters)==null?void 0:G.docs)==null?void 0:J.source}}};const ne=["Default","Selected","Focused","WithSelectedClip","TrackColors","Interactive","ZoomedIn","ZoomedOut","CollapsedHeight","ExpandedHeight"];export{u as CollapsedHeight,o as Default,m as ExpandedHeight,c as Focused,l as Interactive,a as Selected,d as TrackColors,i as WithSelectedClip,p as ZoomedIn,g as ZoomedOut,ne as __namedExportsOrder,te as default};
