import{s as o,r,u as W}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const Z={title:"Layout/EffectsPanel",component:o,parameters:{layout:"fullscreen"},tags:["autodocs"]},d={render:()=>{const[n,s]=r.useState([{id:"1",name:"Reverb",enabled:!0},{id:"2",name:"Compressor",enabled:!0},{id:"3",name:"EQ",enabled:!1},{id:"4",name:"Delay",enabled:!0},{id:"5",name:"Chorus",enabled:!1}]),[a,f]=r.useState([{id:"m1",name:"Limiter",enabled:!0},{id:"m2",name:"Master EQ",enabled:!0},{id:"m3",name:"Stereo Enhancer",enabled:!1},{id:"m4",name:"Final Compressor",enabled:!0}]),[c,b]=r.useState(!0),[g,k]=r.useState(!0);return React.createElement("div",{style:{display:"flex",height:"720px",width:"100%"}},React.createElement(o,{mode:"sidebar",trackSection:{trackName:"Audio Track 1",effects:n,allEnabled:c,onToggleAll:e=>{b(e),s(n.map(l=>({...l,enabled:e})))},onEffectToggle:(e,l)=>{const t=[...n];t[e]={...t[e],enabled:l},s(t)},onEffectsReorder:(e,l)=>{const t=[...n],[h]=t.splice(e,1);t.splice(l,0,h),s(t)},onAddEffect:()=>{const e={id:`${n.length+1}`,name:`New Effect ${n.length+1}`,enabled:!0};s([...n,e])},onContextMenu:e=>{console.log("Track context menu clicked",e)}},masterSection:{effects:a,allEnabled:g,onToggleAll:e=>{k(e),f(a.map(l=>({...l,enabled:e})))},onEffectToggle:(e,l)=>{const t=[...a];t[e]={...t[e],enabled:l},f(t)},onEffectsReorder:(e,l)=>{const t=[...a],[h]=t.splice(e,1);t.splice(l,0,h),f(t)},onAddEffect:()=>{const e={id:`m${a.length+1}`,name:`Master Effect ${a.length+1}`,enabled:!0};f([...a,e])},onContextMenu:e=>{console.log("Master context menu clicked",e)}},onClose:()=>console.log("Close panel")}),React.createElement("div",{style:{flex:1,padding:"20px",background:"#f0f0f0"}},React.createElement("h2",null,"Main Content Area"),React.createElement("p",null,"The effects panel appears on the left side of the interface.")))}},i={render:()=>{const[n,s]=r.useState(!1),[a,f]=r.useState({left:0,top:0}),c=r.useRef(null),[b,g]=r.useState([{id:"1",name:"Reverb",enabled:!0},{id:"2",name:"Compressor",enabled:!0},{id:"3",name:"EQ",enabled:!1}]),k=()=>{if(c.current){const e=c.current.getBoundingClientRect();f({left:e.right+8,top:e.top})}s(!n)};return React.createElement("div",{style:{padding:"40px",background:"#e8e8e8",minHeight:"720px",position:"relative"}},React.createElement("h2",{style:{marginBottom:"20px"}},'Click "Effects" button on track panel →'),React.createElement("div",{ref:c,style:{width:"280px"}},React.createElement(W,{trackName:"Audio Track 1",trackType:"mono",volume:75,pan:0,isMuted:!1,isSolo:!1,trackHeight:114,onEffectsClick:k})),React.createElement(o,{isOpen:n,mode:"overlay",left:a.left,top:a.top,trackSection:{trackName:"Audio Track 1",effects:b,allEnabled:!0,onEffectToggle:(e,l)=>{const t=[...b];t[e]={...t[e],enabled:l},g(t)},onAddEffect:()=>{console.log("Add effect")}},onClose:()=>s(!1)}))}},E={render:()=>{const[n,s]=r.useState([{id:"1",name:"Reverb",enabled:!0},{id:"2",name:"Compressor",enabled:!0},{id:"3",name:"EQ",enabled:!1}]);return React.createElement("div",{style:{display:"flex",height:"720px",width:"100%"}},React.createElement(o,{mode:"sidebar",trackSection:{trackName:"My Awesome Track",effects:n,allEnabled:!0,onEffectToggle:(a,f)=>{const c=[...n];c[a]={...c[a],enabled:f},s(c)}},onClose:()=>console.log("Close panel")}),React.createElement("div",{style:{flex:1,padding:"20px",background:"#f0f0f0"}},React.createElement("h2",null,"Main Content Area")))}},m={render:()=>{const[n,s]=r.useState([{id:"m1",name:"Limiter",enabled:!0},{id:"m2",name:"Master EQ",enabled:!0}]);return React.createElement("div",{style:{display:"flex",height:"720px",width:"100%"}},React.createElement(o,{mode:"sidebar",masterSection:{effects:n,allEnabled:!0,onEffectToggle:(a,f)=>{const c=[...n];c[a]={...c[a],enabled:f},s(c)}},onClose:()=>console.log("Close panel")}),React.createElement("div",{style:{flex:1,padding:"20px",background:"#f0f0f0"}},React.createElement("h2",null,"Main Content Area")))}},p={render:()=>React.createElement("div",{style:{display:"flex",height:"720px",width:"100%"}},React.createElement(o,{mode:"sidebar",trackSection:{trackName:"Empty Track",effects:[],allEnabled:!1,onAddEffect:()=>console.log("Add effect")},masterSection:{effects:[],allEnabled:!1,onAddEffect:()=>console.log("Add master effect")},onClose:()=>console.log("Close panel")}),React.createElement("div",{style:{flex:1,padding:"20px",background:"#f0f0f0"}},React.createElement("h2",null,"Main Content Area"),React.createElement("p",null,"No effects added yet.")))},u={render:()=>{const n=[{id:"1",name:"Reverb",enabled:!1},{id:"2",name:"Compressor",enabled:!1},{id:"3",name:"EQ",enabled:!1}],s=[{id:"m1",name:"Limiter",enabled:!1},{id:"m2",name:"Master EQ",enabled:!1}];return React.createElement("div",{style:{display:"flex",height:"720px",width:"100%"}},React.createElement(o,{mode:"sidebar",trackSection:{trackName:"Audio Track 1",effects:n,allEnabled:!1},masterSection:{effects:s,allEnabled:!1},onClose:()=>console.log("Close panel")}),React.createElement("div",{style:{flex:1,padding:"20px",background:"#f0f0f0"}},React.createElement("h2",null,"Main Content Area")))}};var x,y,v,C,w;d.parameters={...d.parameters,docs:{...(x=d.parameters)==null?void 0:x.docs,source:{originalSource:`{
  render: () => {
    const [trackEffects, setTrackEffects] = useState([{
      id: '1',
      name: 'Reverb',
      enabled: true
    }, {
      id: '2',
      name: 'Compressor',
      enabled: true
    }, {
      id: '3',
      name: 'EQ',
      enabled: false
    }, {
      id: '4',
      name: 'Delay',
      enabled: true
    }, {
      id: '5',
      name: 'Chorus',
      enabled: false
    }]);
    const [masterEffects, setMasterEffects] = useState([{
      id: 'm1',
      name: 'Limiter',
      enabled: true
    }, {
      id: 'm2',
      name: 'Master EQ',
      enabled: true
    }, {
      id: 'm3',
      name: 'Stereo Enhancer',
      enabled: false
    }, {
      id: 'm4',
      name: 'Final Compressor',
      enabled: true
    }]);
    const [allTrackEffectsEnabled, setAllTrackEffectsEnabled] = useState(true);
    const [allMasterEffectsEnabled, setAllMasterEffectsEnabled] = useState(true);
    return <div style={{
      display: 'flex',
      height: '720px',
      width: '100%'
    }}>
        <EffectsPanel mode="sidebar" trackSection={{
        trackName: 'Audio Track 1',
        effects: trackEffects,
        allEnabled: allTrackEffectsEnabled,
        onToggleAll: enabled => {
          setAllTrackEffectsEnabled(enabled);
          setTrackEffects(trackEffects.map(e => ({
            ...e,
            enabled
          })));
        },
        onEffectToggle: (index, enabled) => {
          const newEffects = [...trackEffects];
          newEffects[index] = {
            ...newEffects[index],
            enabled
          };
          setTrackEffects(newEffects);
        },
        onEffectsReorder: (fromIndex, toIndex) => {
          const newEffects = [...trackEffects];
          const [movedEffect] = newEffects.splice(fromIndex, 1);
          newEffects.splice(toIndex, 0, movedEffect);
          setTrackEffects(newEffects);
        },
        onAddEffect: () => {
          const newEffect = {
            id: \`\${trackEffects.length + 1}\`,
            name: \`New Effect \${trackEffects.length + 1}\`,
            enabled: true
          };
          setTrackEffects([...trackEffects, newEffect]);
        },
        onContextMenu: e => {
          console.log('Track context menu clicked', e);
        }
      }} masterSection={{
        effects: masterEffects,
        allEnabled: allMasterEffectsEnabled,
        onToggleAll: enabled => {
          setAllMasterEffectsEnabled(enabled);
          setMasterEffects(masterEffects.map(e => ({
            ...e,
            enabled
          })));
        },
        onEffectToggle: (index, enabled) => {
          const newEffects = [...masterEffects];
          newEffects[index] = {
            ...newEffects[index],
            enabled
          };
          setMasterEffects(newEffects);
        },
        onEffectsReorder: (fromIndex, toIndex) => {
          const newEffects = [...masterEffects];
          const [movedEffect] = newEffects.splice(fromIndex, 1);
          newEffects.splice(toIndex, 0, movedEffect);
          setMasterEffects(newEffects);
        },
        onAddEffect: () => {
          const newEffect = {
            id: \`m\${masterEffects.length + 1}\`,
            name: \`Master Effect \${masterEffects.length + 1}\`,
            enabled: true
          };
          setMasterEffects([...masterEffects, newEffect]);
        },
        onContextMenu: e => {
          console.log('Master context menu clicked', e);
        }
      }} onClose={() => console.log('Close panel')} />
        <div style={{
        flex: 1,
        padding: '20px',
        background: '#f0f0f0'
      }}>
          <h2>Main Content Area</h2>
          <p>The effects panel appears on the left side of the interface.</p>
        </div>
      </div>;
  }
}`,...(v=(y=d.parameters)==null?void 0:y.docs)==null?void 0:v.source},description:{story:"Default EffectsPanel as sidebar with track and master sections",...(w=(C=d.parameters)==null?void 0:C.docs)==null?void 0:w.description}}};var T,S,A,R,M;i.parameters={...i.parameters,docs:{...(T=i.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [panelPosition, setPanelPosition] = useState({
      left: 0,
      top: 0
    });
    const buttonRef = useRef<HTMLDivElement>(null);
    const [trackEffects, setTrackEffects] = useState([{
      id: '1',
      name: 'Reverb',
      enabled: true
    }, {
      id: '2',
      name: 'Compressor',
      enabled: true
    }, {
      id: '3',
      name: 'EQ',
      enabled: false
    }]);
    const handleEffectsClick = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPanelPosition({
          left: rect.right + 8,
          // 8px gap to the right of track control panel
          top: rect.top
        });
      }
      setIsPanelOpen(!isPanelOpen);
    };
    return <div style={{
      padding: '40px',
      background: '#e8e8e8',
      minHeight: '720px',
      position: 'relative'
    }}>
        <h2 style={{
        marginBottom: '20px'
      }}>Click "Effects" button on track panel →</h2>

        <div ref={buttonRef} style={{
        width: '280px'
      }}>
          <TrackControlPanel trackName="Audio Track 1" trackType="mono" volume={75} pan={0} isMuted={false} isSolo={false} trackHeight={114} onEffectsClick={handleEffectsClick} />
        </div>

        <EffectsPanel isOpen={isPanelOpen} mode="overlay" left={panelPosition.left} top={panelPosition.top} trackSection={{
        trackName: 'Audio Track 1',
        effects: trackEffects,
        allEnabled: true,
        onEffectToggle: (index, enabled) => {
          const newEffects = [...trackEffects];
          newEffects[index] = {
            ...newEffects[index],
            enabled
          };
          setTrackEffects(newEffects);
        },
        onAddEffect: () => {
          console.log('Add effect');
        }
      }} onClose={() => setIsPanelOpen(false)} />
      </div>;
  }
}`,...(A=(S=i.parameters)==null?void 0:S.docs)==null?void 0:A.source},description:{story:"Overlay mode - triggered by clicking Effects button on track control panel",...(M=(R=i.parameters)==null?void 0:R.docs)==null?void 0:M.description}}};var P,O,N,Q,I;E.parameters={...E.parameters,docs:{...(P=E.parameters)==null?void 0:P.docs,source:{originalSource:`{
  render: () => {
    const [trackEffects, setTrackEffects] = useState([{
      id: '1',
      name: 'Reverb',
      enabled: true
    }, {
      id: '2',
      name: 'Compressor',
      enabled: true
    }, {
      id: '3',
      name: 'EQ',
      enabled: false
    }]);
    return <div style={{
      display: 'flex',
      height: '720px',
      width: '100%'
    }}>
        <EffectsPanel mode="sidebar" trackSection={{
        trackName: 'My Awesome Track',
        effects: trackEffects,
        allEnabled: true,
        onEffectToggle: (index, enabled) => {
          const newEffects = [...trackEffects];
          newEffects[index] = {
            ...newEffects[index],
            enabled
          };
          setTrackEffects(newEffects);
        }
      }} onClose={() => console.log('Close panel')} />
        <div style={{
        flex: 1,
        padding: '20px',
        background: '#f0f0f0'
      }}>
          <h2>Main Content Area</h2>
        </div>
      </div>;
  }
}`,...(N=(O=E.parameters)==null?void 0:O.docs)==null?void 0:N.source},description:{story:"Track section only",...(I=(Q=E.parameters)==null?void 0:Q.docs)==null?void 0:I.description}}};var L,$,B,D,H;m.parameters={...m.parameters,docs:{...(L=m.parameters)==null?void 0:L.docs,source:{originalSource:`{
  render: () => {
    const [masterEffects, setMasterEffects] = useState([{
      id: 'm1',
      name: 'Limiter',
      enabled: true
    }, {
      id: 'm2',
      name: 'Master EQ',
      enabled: true
    }]);
    return <div style={{
      display: 'flex',
      height: '720px',
      width: '100%'
    }}>
        <EffectsPanel mode="sidebar" masterSection={{
        effects: masterEffects,
        allEnabled: true,
        onEffectToggle: (index, enabled) => {
          const newEffects = [...masterEffects];
          newEffects[index] = {
            ...newEffects[index],
            enabled
          };
          setMasterEffects(newEffects);
        }
      }} onClose={() => console.log('Close panel')} />
        <div style={{
        flex: 1,
        padding: '20px',
        background: '#f0f0f0'
      }}>
          <h2>Main Content Area</h2>
        </div>
      </div>;
  }
}`,...(B=($=m.parameters)==null?void 0:$.docs)==null?void 0:B.source},description:{story:"Master section only",...(H=(D=m.parameters)==null?void 0:D.docs)==null?void 0:H.description}}};var F,_,j,q,z;p.parameters={...p.parameters,docs:{...(F=p.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => {
    return <div style={{
      display: 'flex',
      height: '720px',
      width: '100%'
    }}>
        <EffectsPanel mode="sidebar" trackSection={{
        trackName: 'Empty Track',
        effects: [],
        allEnabled: false,
        onAddEffect: () => console.log('Add effect')
      }} masterSection={{
        effects: [],
        allEnabled: false,
        onAddEffect: () => console.log('Add master effect')
      }} onClose={() => console.log('Close panel')} />
        <div style={{
        flex: 1,
        padding: '20px',
        background: '#f0f0f0'
      }}>
          <h2>Main Content Area</h2>
          <p>No effects added yet.</p>
        </div>
      </div>;
  }
}`,...(j=(_=p.parameters)==null?void 0:_.docs)==null?void 0:j.source},description:{story:"Empty state - no effects",...(z=(q=p.parameters)==null?void 0:q.docs)==null?void 0:z.description}}};var G,J,K,U,V;u.parameters={...u.parameters,docs:{...(G=u.parameters)==null?void 0:G.docs,source:{originalSource:`{
  render: () => {
    const trackEffects = [{
      id: '1',
      name: 'Reverb',
      enabled: false
    }, {
      id: '2',
      name: 'Compressor',
      enabled: false
    }, {
      id: '3',
      name: 'EQ',
      enabled: false
    }];
    const masterEffects = [{
      id: 'm1',
      name: 'Limiter',
      enabled: false
    }, {
      id: 'm2',
      name: 'Master EQ',
      enabled: false
    }];
    return <div style={{
      display: 'flex',
      height: '720px',
      width: '100%'
    }}>
        <EffectsPanel mode="sidebar" trackSection={{
        trackName: 'Audio Track 1',
        effects: trackEffects,
        allEnabled: false
      }} masterSection={{
        effects: masterEffects,
        allEnabled: false
      }} onClose={() => console.log('Close panel')} />
        <div style={{
        flex: 1,
        padding: '20px',
        background: '#f0f0f0'
      }}>
          <h2>Main Content Area</h2>
        </div>
      </div>;
  }
}`,...(K=(J=u.parameters)==null?void 0:J.docs)==null?void 0:K.source},description:{story:"All effects disabled",...(V=(U=u.parameters)==null?void 0:U.docs)==null?void 0:V.description}}};const ee=["Sidebar","OverlayFromTrackButton","TrackSectionOnly","MasterSectionOnly","EmptyState","AllDisabled"];export{u as AllDisabled,p as EmptyState,m as MasterSectionOnly,i as OverlayFromTrackButton,d as Sidebar,E as TrackSectionOnly,ee as __namedExportsOrder,Z as default};
