import{G as a,R as e}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const C={title:"Components/GhostButton",component:a,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{icon:{control:"select",options:["menu","mixer","undo","redo","play","pause","stop","record","rewind","forward","chevron-left","chevron-right"],description:"Icon to display"},size:{control:"select",options:["small","large"],description:"Button size (small=20px, large=48px)"},disabled:{control:"boolean",description:"Whether the button is disabled"},ariaLabel:{control:"text",description:"ARIA label for accessibility"}}},r={args:{icon:"menu",ariaLabel:"Menu",disabled:!1}},t={args:{icon:"menu",ariaLabel:"Menu",disabled:!0}},s={args:{icon:"mixer",ariaLabel:"Mixer"}},n={args:{icon:"chevron-left",ariaLabel:"Previous",size:"large"}},i={render:()=>e.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},e.createElement("div",null,e.createElement(a,{icon:"menu",ariaLabel:"Menu",size:"small"}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Small (20px)")),e.createElement("div",null,e.createElement(a,{icon:"chevron-left",ariaLabel:"Previous",size:"large"}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Large (48px)")))},o={render:()=>e.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},e.createElement(a,{icon:"chevron-left",ariaLabel:"Previous",size:"large"}),e.createElement(a,{icon:"chevron-right",ariaLabel:"Next",size:"large"}))},l={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px"}},e.createElement("div",{style:{display:"flex",gap:"8px",alignItems:"center"}},e.createElement(a,{icon:"menu",ariaLabel:"Menu",size:"small"}),e.createElement("span",{style:{fontSize:"12px",color:"#666"}},"Default (hover to see background)")),e.createElement("div",{style:{display:"flex",gap:"8px",alignItems:"center"}},e.createElement(a,{icon:"menu",ariaLabel:"Menu",size:"small",disabled:!0}),e.createElement("span",{style:{fontSize:"12px",color:"#666"}},"Disabled")),e.createElement("div",{style:{display:"flex",gap:"8px",alignItems:"center"}},e.createElement(a,{icon:"mixer",ariaLabel:"Mixer",size:"small"}),e.createElement("span",{style:{fontSize:"12px",color:"#666"}},"With mixer icon")))};var c,p,d;r.parameters={...r.parameters,docs:{...(c=r.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    icon: 'menu',
    ariaLabel: 'Menu',
    disabled: false
  }
}`,...(d=(p=r.parameters)==null?void 0:p.docs)==null?void 0:d.source}}};var m,u,x;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    icon: 'menu',
    ariaLabel: 'Menu',
    disabled: true
  }
}`,...(x=(u=t.parameters)==null?void 0:u.docs)==null?void 0:x.source}}};var g,v,b;s.parameters={...s.parameters,docs:{...(g=s.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    icon: 'mixer',
    ariaLabel: 'Mixer'
  }
}`,...(b=(v=s.parameters)==null?void 0:v.docs)==null?void 0:b.source}}};var f,y,h;n.parameters={...n.parameters,docs:{...(f=n.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    icon: 'chevron-left',
    ariaLabel: 'Previous',
    size: 'large'
  }
}`,...(h=(y=n.parameters)==null?void 0:y.docs)==null?void 0:h.source}}};var z,L,S;i.parameters={...i.parameters,docs:{...(z=i.parameters)==null?void 0:z.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  }}>
      <div>
        <GhostButton icon="menu" ariaLabel="Menu" size="small" />
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Small (20px)
        </div>
      </div>
      <div>
        <GhostButton icon="chevron-left" ariaLabel="Previous" size="large" />
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Large (48px)
        </div>
      </div>
    </div>
}`,...(S=(L=i.parameters)==null?void 0:L.docs)==null?void 0:S.source}}};var E,I,M;o.parameters={...o.parameters,docs:{...(E=o.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  }}>
      <GhostButton icon="chevron-left" ariaLabel="Previous" size="large" />
      <GhostButton icon="chevron-right" ariaLabel="Next" size="large" />
    </div>
}`,...(M=(I=o.parameters)==null?void 0:I.docs)==null?void 0:M.source}}};var B,D,G;l.parameters={...l.parameters,docs:{...(B=l.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  }}>
      <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
        <GhostButton icon="menu" ariaLabel="Menu" size="small" />
        <span style={{
        fontSize: '12px',
        color: '#666'
      }}>Default (hover to see background)</span>
      </div>
      <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
        <GhostButton icon="menu" ariaLabel="Menu" size="small" disabled />
        <span style={{
        fontSize: '12px',
        color: '#666'
      }}>Disabled</span>
      </div>
      <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
        <GhostButton icon="mixer" ariaLabel="Mixer" size="small" />
        <span style={{
        fontSize: '12px',
        color: '#666'
      }}>With mixer icon</span>
      </div>
    </div>
}`,...(G=(D=l.parameters)==null?void 0:D.docs)==null?void 0:G.source}}};const T=["Default","Disabled","WithMixerIcon","Large","SizeComparison","ChevronIcons","AllStates"];export{l as AllStates,o as ChevronIcons,r as Default,t as Disabled,n as Large,i as SizeComparison,s as WithMixerIcon,T as __namedExportsOrder,C as default};
