import{R as e}from"./index-yIsmwZOr.js";import{G as s}from"./index-BlR7gUto.js";import"./jsx-runtime-BjG_zV1W.js";const M={title:"Components/GhostButton",component:s,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{icon:{control:"select",options:["menu","mixer","undo","redo","play","pause","stop","record","rewind","forward"],description:"Icon to display"},disabled:{control:"boolean",description:"Whether the button is disabled"},ariaLabel:{control:"text",description:"ARIA label for accessibility"}}},a={args:{icon:"menu",ariaLabel:"Menu",disabled:!1}},r={args:{icon:"menu",ariaLabel:"Menu",disabled:!0}},t={args:{icon:"mixer",ariaLabel:"Mixer"}},n={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px"}},e.createElement("div",{style:{display:"flex",gap:"8px",alignItems:"center"}},e.createElement(s,{icon:"menu",ariaLabel:"Menu"}),e.createElement("span",{style:{fontSize:"12px",color:"#666"}},"Default (hover to see background)")),e.createElement("div",{style:{display:"flex",gap:"8px",alignItems:"center"}},e.createElement(s,{icon:"menu",ariaLabel:"Menu",disabled:!0}),e.createElement("span",{style:{fontSize:"12px",color:"#666"}},"Disabled")),e.createElement("div",{style:{display:"flex",gap:"8px",alignItems:"center"}},e.createElement(s,{icon:"mixer",ariaLabel:"Mixer"}),e.createElement("span",{style:{fontSize:"12px",color:"#666"}},"With mixer icon")))};var o,i,l;a.parameters={...a.parameters,docs:{...(o=a.parameters)==null?void 0:o.docs,source:{originalSource:`{
  args: {
    icon: 'menu',
    ariaLabel: 'Menu',
    disabled: false
  }
}`,...(l=(i=a.parameters)==null?void 0:i.docs)==null?void 0:l.source}}};var c,p,d;r.parameters={...r.parameters,docs:{...(c=r.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    icon: 'menu',
    ariaLabel: 'Menu',
    disabled: true
  }
}`,...(d=(p=r.parameters)==null?void 0:p.docs)==null?void 0:d.source}}};var m,u,x;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    icon: 'mixer',
    ariaLabel: 'Mixer'
  }
}`,...(x=(u=t.parameters)==null?void 0:u.docs)==null?void 0:x.source}}};var b,g,f;n.parameters={...n.parameters,docs:{...(b=n.parameters)==null?void 0:b.docs,source:{originalSource:`{
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
        <GhostButton icon="menu" ariaLabel="Menu" />
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
        <GhostButton icon="menu" ariaLabel="Menu" disabled />
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
        <GhostButton icon="mixer" ariaLabel="Mixer" />
        <span style={{
        fontSize: '12px',
        color: '#666'
      }}>With mixer icon</span>
      </div>
    </div>
}`,...(f=(g=n.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};const L=["Default","Disabled","WithMixerIcon","AllStates"];export{n as AllStates,a as Default,r as Disabled,t as WithMixerIcon,L as __namedExportsOrder,M as default};
