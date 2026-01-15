import{r as F,R as e}from"./index-yIsmwZOr.js";import{J as m,I as t}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const p=a=>({general:e.createElement(t,{name:"cog",size:16}),appearance:e.createElement(t,{name:"brush",size:16}),"audio-settings":e.createElement(t,{name:"volume",size:16}),"playback-recording":e.createElement(t,{name:"microphone",size:16}),"audio-editing":e.createElement(t,{name:"waveform",size:16}),"spectral-display":e.createElement(t,{name:"spectrogram",size:16}),plugins:e.createElement(t,{name:"plug",size:16}),music:e.createElement(t,{name:"metronome",size:16}),cloud:e.createElement(t,{name:"cloud",size:16}),shortcuts:e.createElement(t,{name:"keyboard",size:16}),"advanced-options":e.createElement(t,{name:"cog",size:16})})[a],M={title:"Components/TabList",component:m,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{selectedTabId:{control:"text",description:"Currently selected tab ID"},ariaLabel:{control:"text",description:"ARIA label for the tab list"}}},n=[{id:"general",label:"General"},{id:"appearance",label:"Appearance"},{id:"audio-settings",label:"Audio settings"},{id:"playback-recording",label:"Playback/Recording"},{id:"audio-editing",label:"Audio editing"},{id:"spectral-display",label:"Spectral display"},{id:"plugins",label:"Plugins"},{id:"music",label:"Music"},{id:"cloud",label:"Cloud"},{id:"shortcuts",label:"Shortcuts"},{id:"advanced-options",label:"Advanced options"}],d={args:{tabs:n,selectedTabId:"general"}},i={args:{tabs:n.map(a=>({...a,icon:p(a.id)})),selectedTabId:"general"}},c={args:{tabs:n.map(a=>({...a,icon:p(a.id),disabled:a.id==="cloud"||a.id==="music"})),selectedTabId:"general"}},l={render:()=>{const[a,o]=F.useState("general");return e.createElement("div",{style:{width:"300px"}},e.createElement(m,{tabs:n.map(s=>({...s,icon:p(s.id)})),selectedTabId:a,onTabSelect:s=>o(s),ariaLabel:"Preferences navigation"}),e.createElement("div",{style:{marginTop:"20px",padding:"16px",backgroundColor:"#f5f5f5",borderRadius:"4px"}},e.createElement("strong",null,"Selected:")," ",a))}},b={render:()=>{var s,g;const[a,o]=F.useState("general");return e.createElement("div",{style:{display:"flex",gap:"20px",width:"700px"}},e.createElement("div",{style:{width:"250px",flexShrink:0}},e.createElement(m,{tabs:n.map(r=>({...r,icon:p(r.id)})),selectedTabId:a,onTabSelect:r=>o(r),ariaLabel:"Preferences navigation"})),e.createElement("div",{style:{flex:1,padding:"20px",backgroundColor:"#f9f9f9",borderRadius:"8px"}},e.createElement("h2",{style:{marginTop:0,fontSize:"20px",fontFamily:"Inter, sans-serif"}},((s=n.find(r=>r.id===a))==null?void 0:s.label)||""),e.createElement("p",{style:{fontFamily:"Inter, sans-serif",color:"#666"}},"Content for the ",(g=n.find(r=>r.id===a))==null?void 0:g.label.toLowerCase()," preferences would go here.")))}};var u,f,T;d.parameters={...d.parameters,docs:{...(u=d.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    tabs: preferenceTabs,
    selectedTabId: 'general'
  }
}`,...(T=(f=d.parameters)==null?void 0:f.docs)==null?void 0:T.source}}};var I,x,y;i.parameters={...i.parameters,docs:{...(I=i.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    tabs: preferenceTabs.map(tab => ({
      ...tab,
      icon: getIconForTab(tab.id)
    })),
    selectedTabId: 'general'
  }
}`,...(y=(x=i.parameters)==null?void 0:x.docs)==null?void 0:y.source}}};var S,v,h;c.parameters={...c.parameters,docs:{...(S=c.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    tabs: preferenceTabs.map(tab => ({
      ...tab,
      icon: getIconForTab(tab.id),
      disabled: tab.id === 'cloud' || tab.id === 'music'
    })),
    selectedTabId: 'general'
  }
}`,...(h=(v=c.parameters)==null?void 0:v.docs)==null?void 0:h.source}}};var E,z,w;l.parameters={...l.parameters,docs:{...(E=l.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => {
    const [selectedTab, setSelectedTab] = useState('general');
    return <div style={{
      width: '300px'
    }}>
        <TabList tabs={preferenceTabs.map(tab => ({
        ...tab,
        icon: getIconForTab(tab.id)
      }))} selectedTabId={selectedTab} onTabSelect={tabId => setSelectedTab(tabId)} ariaLabel="Preferences navigation" />
        <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
          <strong>Selected:</strong> {selectedTab}
        </div>
      </div>;
  }
}`,...(w=(z=l.parameters)==null?void 0:z.docs)==null?void 0:w.source}}};var C,L,k;b.parameters={...b.parameters,docs:{...(C=b.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => {
    const [selectedTab, setSelectedTab] = useState('general');
    return <div style={{
      display: 'flex',
      gap: '20px',
      width: '700px'
    }}>
        <div style={{
        width: '250px',
        flexShrink: 0
      }}>
          <TabList tabs={preferenceTabs.map(tab => ({
          ...tab,
          icon: getIconForTab(tab.id)
        }))} selectedTabId={selectedTab} onTabSelect={tabId => setSelectedTab(tabId)} ariaLabel="Preferences navigation" />
        </div>
        <div style={{
        flex: 1,
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px'
      }}>
          <h2 style={{
          marginTop: 0,
          fontSize: '20px',
          fontFamily: 'Inter, sans-serif'
        }}>
            {preferenceTabs.find(t => t.id === selectedTab)?.label || ''}
          </h2>
          <p style={{
          fontFamily: 'Inter, sans-serif',
          color: '#666'
        }}>
            Content for the {preferenceTabs.find(t => t.id === selectedTab)?.label.toLowerCase()} preferences would go here.
          </p>
        </div>
      </div>;
  }
}`,...(k=(L=b.parameters)==null?void 0:L.docs)==null?void 0:k.source}}};const _=["Default","WithIcons","WithDisabledItems","Interactive","PreferencesSidebar"];export{d as Default,l as Interactive,b as PreferencesSidebar,c as WithDisabledItems,i as WithIcons,_ as __namedExportsOrder,M as default};
