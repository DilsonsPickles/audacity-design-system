import{a5 as a,R as e,r as p}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const j={title:"Components/ToggleButton",component:a,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{active:{control:"boolean",description:"Whether the button is in active/pressed state"},disabled:{control:"boolean",description:"Whether the button is disabled"},children:{control:"text",description:"Button content (typically a single character like M or S)"},ariaLabel:{control:"text",description:"ARIA label for accessibility"}}},t={args:{children:"M",ariaLabel:"Mute",active:!1,disabled:!1}},r={args:{children:"M",ariaLabel:"Mute",active:!0}},s={args:{children:"M",ariaLabel:"Mute",disabled:!0}},l={args:{children:"S",ariaLabel:"Solo",active:!1}},o={args:{children:"S",ariaLabel:"Solo",active:!0}},n={render:()=>{const[c,R]=p.useState(!1),[d,W]=p.useState(!1);return e.createElement("div",{style:{display:"flex",gap:"8px"}},e.createElement(a,{active:c,onClick:()=>R(!c),ariaLabel:"Mute"},"M"),e.createElement(a,{active:d,onClick:()=>W(!d),ariaLabel:"Solo"},"S"))}},i={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px"}},e.createElement("div",{style:{display:"flex",gap:"8px",alignItems:"center"}},e.createElement(a,{ariaLabel:"Default"},"M"),e.createElement("span",{style:{fontSize:"12px",color:"#666"}},"Default")),e.createElement("div",{style:{display:"flex",gap:"8px",alignItems:"center"}},e.createElement(a,{active:!0,ariaLabel:"Active"},"M"),e.createElement("span",{style:{fontSize:"12px",color:"#666"}},"Active")),e.createElement("div",{style:{display:"flex",gap:"8px",alignItems:"center"}},e.createElement(a,{disabled:!0,ariaLabel:"Disabled"},"M"),e.createElement("span",{style:{fontSize:"12px",color:"#666"}},"Disabled")))};var u,m,g;t.parameters={...t.parameters,docs:{...(u=t.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    children: 'M',
    ariaLabel: 'Mute',
    active: false,
    disabled: false
  }
}`,...(g=(m=t.parameters)==null?void 0:m.docs)==null?void 0:g.source}}};var b,v,S;r.parameters={...r.parameters,docs:{...(b=r.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    children: 'M',
    ariaLabel: 'Mute',
    active: true
  }
}`,...(S=(v=r.parameters)==null?void 0:v.docs)==null?void 0:S.source}}};var f,x,y;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    children: 'M',
    ariaLabel: 'Mute',
    disabled: true
  }
}`,...(y=(x=s.parameters)==null?void 0:x.docs)==null?void 0:y.source}}};var M,L,h;l.parameters={...l.parameters,docs:{...(M=l.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    children: 'S',
    ariaLabel: 'Solo',
    active: false
  }
}`,...(h=(L=l.parameters)==null?void 0:L.docs)==null?void 0:h.source}}};var E,D,B;o.parameters={...o.parameters,docs:{...(E=o.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    children: 'S',
    ariaLabel: 'Solo',
    active: true
  }
}`,...(B=(D=o.parameters)==null?void 0:D.docs)==null?void 0:B.source}}};var T,A,I;n.parameters={...n.parameters,docs:{...(T=n.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => {
    const [muted, setMuted] = useState(false);
    const [solo, setSolo] = useState(false);
    return <div style={{
      display: 'flex',
      gap: '8px'
    }}>
        <ToggleButton active={muted} onClick={() => setMuted(!muted)} ariaLabel="Mute">
          M
        </ToggleButton>
        <ToggleButton active={solo} onClick={() => setSolo(!solo)} ariaLabel="Solo">
          S
        </ToggleButton>
      </div>;
  }
}`,...(I=(A=n.parameters)==null?void 0:A.docs)==null?void 0:I.source}}};var z,k,C;i.parameters={...i.parameters,docs:{...(z=i.parameters)==null?void 0:z.docs,source:{originalSource:`{
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
        <ToggleButton ariaLabel="Default">M</ToggleButton>
        <span style={{
        fontSize: '12px',
        color: '#666'
      }}>Default</span>
      </div>
      <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
        <ToggleButton active ariaLabel="Active">M</ToggleButton>
        <span style={{
        fontSize: '12px',
        color: '#666'
      }}>Active</span>
      </div>
      <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
        <ToggleButton disabled ariaLabel="Disabled">M</ToggleButton>
        <span style={{
        fontSize: '12px',
        color: '#666'
      }}>Disabled</span>
      </div>
    </div>
}`,...(C=(k=i.parameters)==null?void 0:k.docs)==null?void 0:C.source}}};const q=["Default","Active","Disabled","Solo","SoloActive","Interactive","AllStates"];export{r as Active,i as AllStates,t as Default,s as Disabled,n as Interactive,l as Solo,o as SoloActive,q as __namedExportsOrder,j as default};
