import{ac as d,r as e,u as o}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const y={title:"Layout/TrackControlSidePanel",component:d,parameters:{layout:"fullscreen"},tags:["autodocs"]},n={render:()=>{const[a,t]=e.useState(null),l=[114,114,114];return e.createElement("div",{style:{display:"flex",width:"100vw",height:"100vh",background:"#1a1a1a"}},e.createElement(d,{trackHeights:l,focusedTrackIndex:a},e.createElement(o,{trackName:"Track 1",trackType:"mono",volume:75,pan:0,isMuted:!1,isSolo:!1,onMuteToggle:()=>{},onSoloToggle:()=>{},state:a===0?"active":"idle",height:"default",onClick:()=>t(0)}),e.createElement(o,{trackName:"Track 2",trackType:"mono",volume:75,pan:0,isMuted:!1,isSolo:!1,onMuteToggle:()=>{},onSoloToggle:()=>{},state:a===1?"active":"idle",height:"default",onClick:()=>t(1)}),e.createElement(o,{trackName:"Track 3",trackType:"mono",volume:75,pan:0,isMuted:!1,isSolo:!1,onMuteToggle:()=>{},onSoloToggle:()=>{},state:a===2?"active":"idle",height:"default",onClick:()=>t(2)})),e.createElement("div",{style:{flex:1,padding:"20px",color:"#fff"}},e.createElement("h2",null,"Default State"),e.createElement("p",null,"Click on a track to select and focus it. Should show 2px gaps between panels."),e.createElement("p",null,e.createElement("strong",null,"Focused Track:")," ",a!==null?`Track ${a+1}`:"None")))}},r={render:()=>{const[a,t]=e.useState(1),l=[114,114,114];return e.createElement("div",{style:{display:"flex",width:"100vw",height:"100vh",background:"#1a1a1a"}},e.createElement(d,{trackHeights:l,focusedTrackIndex:a},e.createElement(o,{trackName:"Track 1",trackType:"mono",volume:75,pan:0,isMuted:!1,isSolo:!1,onMuteToggle:()=>{},onSoloToggle:()=>{},state:a===0?"active":"idle",height:"default",onClick:()=>t(0)}),e.createElement(o,{trackName:"Track 2",trackType:"mono",volume:75,pan:0,isMuted:!1,isSolo:!1,onMuteToggle:()=>{},onSoloToggle:()=>{},state:a===1?"active":"idle",height:"default",onClick:()=>t(1)}),e.createElement(o,{trackName:"Track 3",trackType:"mono",volume:75,pan:0,isMuted:!1,isSolo:!1,onMuteToggle:()=>{},onSoloToggle:()=>{},state:a===2?"active":"idle",height:"default",onClick:()=>t(2)})),e.createElement("div",{style:{flex:1,padding:"20px",color:"#fff"}},e.createElement("h2",null,"Focused Track"),e.createElement("p",null,"Click on a track to change focus. Track 2 starts focused with blue outline."),e.createElement("p",null,e.createElement("strong",null,"Focused Track:")," ",a!==null?`Track ${a+1}`:"None")))}},s={render:()=>{const[a,t]=e.useState(5),l=Array(12).fill(114);return e.createElement("div",{style:{display:"flex",width:"100vw",height:"100vh",background:"#1a1a1a"}},e.createElement(d,{trackHeights:l,focusedTrackIndex:a},Array.from({length:12},(x,c)=>e.createElement(o,{key:c,trackName:`Track ${c+1}`,trackType:c%2===0?"mono":"stereo",volume:75,pan:0,isMuted:!1,isSolo:!1,onMuteToggle:()=>{},onSoloToggle:()=>{},state:c===a?"active":"idle",height:"default",onClick:()=>t(c)}))),e.createElement("div",{style:{flex:1,padding:"20px",color:"#fff"}},e.createElement("h2",null,"Many Tracks"),e.createElement("p",null,"12 tracks - scrollable panel. Click on any track to focus it. Should show 2px gaps between panels."),e.createElement("p",null,e.createElement("strong",null,"Focused Track:")," ",a!==null?`Track ${a+1}`:"None")))}};var u,i,k;n.parameters={...n.parameters,docs:{...(u=n.parameters)==null?void 0:u.docs,source:{originalSource:`{
  render: () => {
    const [focusedTrackIndex, setFocusedTrackIndex] = React.useState<number | null>(null);
    const trackHeights = [114, 114, 114];
    return <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      background: '#1a1a1a'
    }}>
        <TrackControlSidePanel trackHeights={trackHeights} focusedTrackIndex={focusedTrackIndex}>
          <TrackControlPanel trackName="Track 1" trackType="mono" volume={75} pan={0} isMuted={false} isSolo={false} onMuteToggle={() => {}} onSoloToggle={() => {}} state={focusedTrackIndex === 0 ? 'active' : 'idle'} height="default" onClick={() => setFocusedTrackIndex(0)} />
          <TrackControlPanel trackName="Track 2" trackType="mono" volume={75} pan={0} isMuted={false} isSolo={false} onMuteToggle={() => {}} onSoloToggle={() => {}} state={focusedTrackIndex === 1 ? 'active' : 'idle'} height="default" onClick={() => setFocusedTrackIndex(1)} />
          <TrackControlPanel trackName="Track 3" trackType="mono" volume={75} pan={0} isMuted={false} isSolo={false} onMuteToggle={() => {}} onSoloToggle={() => {}} state={focusedTrackIndex === 2 ? 'active' : 'idle'} height="default" onClick={() => setFocusedTrackIndex(2)} />
        </TrackControlSidePanel>

        <div style={{
        flex: 1,
        padding: '20px',
        color: '#fff'
      }}>
          <h2>Default State</h2>
          <p>Click on a track to select and focus it. Should show 2px gaps between panels.</p>
          <p><strong>Focused Track:</strong> {focusedTrackIndex !== null ? \`Track \${focusedTrackIndex + 1}\` : 'None'}</p>
        </div>
      </div>;
  }
}`,...(k=(i=n.parameters)==null?void 0:i.docs)==null?void 0:k.source}}};var T,g,f;r.parameters={...r.parameters,docs:{...(T=r.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => {
    const [focusedTrackIndex, setFocusedTrackIndex] = React.useState<number | null>(1);
    const trackHeights = [114, 114, 114];
    return <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      background: '#1a1a1a'
    }}>
        <TrackControlSidePanel trackHeights={trackHeights} focusedTrackIndex={focusedTrackIndex}>
          <TrackControlPanel trackName="Track 1" trackType="mono" volume={75} pan={0} isMuted={false} isSolo={false} onMuteToggle={() => {}} onSoloToggle={() => {}} state={focusedTrackIndex === 0 ? 'active' : 'idle'} height="default" onClick={() => setFocusedTrackIndex(0)} />
          <TrackControlPanel trackName="Track 2" trackType="mono" volume={75} pan={0} isMuted={false} isSolo={false} onMuteToggle={() => {}} onSoloToggle={() => {}} state={focusedTrackIndex === 1 ? 'active' : 'idle'} height="default" onClick={() => setFocusedTrackIndex(1)} />
          <TrackControlPanel trackName="Track 3" trackType="mono" volume={75} pan={0} isMuted={false} isSolo={false} onMuteToggle={() => {}} onSoloToggle={() => {}} state={focusedTrackIndex === 2 ? 'active' : 'idle'} height="default" onClick={() => setFocusedTrackIndex(2)} />
        </TrackControlSidePanel>

        <div style={{
        flex: 1,
        padding: '20px',
        color: '#fff'
      }}>
          <h2>Focused Track</h2>
          <p>Click on a track to change focus. Track 2 starts focused with blue outline.</p>
          <p><strong>Focused Track:</strong> {focusedTrackIndex !== null ? \`Track \${focusedTrackIndex + 1}\` : 'None'}</p>
        </div>
      </div>;
  }
}`,...(f=(g=r.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};var p,m,h;s.parameters={...s.parameters,docs:{...(p=s.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => {
    const [focusedTrackIndex, setFocusedTrackIndex] = React.useState<number | null>(5);
    const trackHeights = Array(12).fill(114);
    return <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      background: '#1a1a1a'
    }}>
        <TrackControlSidePanel trackHeights={trackHeights} focusedTrackIndex={focusedTrackIndex}>
          {Array.from({
          length: 12
        }, (_, i) => <TrackControlPanel key={i} trackName={\`Track \${i + 1}\`} trackType={i % 2 === 0 ? 'mono' : 'stereo'} volume={75} pan={0} isMuted={false} isSolo={false} onMuteToggle={() => {}} onSoloToggle={() => {}} state={i === focusedTrackIndex ? 'active' : 'idle'} height="default" onClick={() => setFocusedTrackIndex(i)} />)}
        </TrackControlSidePanel>

        <div style={{
        flex: 1,
        padding: '20px',
        color: '#fff'
      }}>
          <h2>Many Tracks</h2>
          <p>12 tracks - scrollable panel. Click on any track to focus it. Should show 2px gaps between panels.</p>
          <p><strong>Focused Track:</strong> {focusedTrackIndex !== null ? \`Track \${focusedTrackIndex + 1}\` : 'None'}</p>
        </div>
      </div>;
  }
}`,...(h=(m=s.parameters)==null?void 0:m.docs)==null?void 0:h.source}}};const I=["Default","FocusedTrack","ManyTracks"];export{n as Default,r as FocusedTrack,s as ManyTracks,I as __namedExportsOrder,y as default};
