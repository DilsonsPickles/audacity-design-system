import{b as a,R as e}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const R={title:"Components/Checkbox",component:a,parameters:{layout:"centered"},tags:["autodocs"]},c={args:{checked:!1,"aria-label":"Unchecked checkbox"}},s={args:{checked:!0,"aria-label":"Checked checkbox"}},t={args:{checked:!1,disabled:!0,"aria-label":"Disabled checkbox"}},r={args:{checked:!0,disabled:!0,"aria-label":"Disabled checked checkbox"}},l={render:()=>{const[d,U]=e.useState(!1);return e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px"}},e.createElement(a,{checked:d,onChange:U,"aria-label":"Interactive checkbox"}),e.createElement("div",{style:{fontSize:"12px",fontFamily:"Inter, sans-serif"}},"Status: ",d?"Checked":"Unchecked"))}},n={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px"}},e.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},e.createElement(a,{checked:!1,"aria-label":"Unchecked"}),e.createElement("span",{style:{fontSize:"12px",fontFamily:"Inter, sans-serif"}},"Unchecked")),e.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},e.createElement(a,{checked:!0,"aria-label":"Checked"}),e.createElement("span",{style:{fontSize:"12px",fontFamily:"Inter, sans-serif"}},"Checked")),e.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},e.createElement(a,{checked:!1,disabled:!0,"aria-label":"Disabled unchecked"}),e.createElement("span",{style:{fontSize:"12px",fontFamily:"Inter, sans-serif"}},"Disabled Unchecked")),e.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},e.createElement(a,{checked:!0,disabled:!0,"aria-label":"Disabled checked"}),e.createElement("span",{style:{fontSize:"12px",fontFamily:"Inter, sans-serif"}},"Disabled Checked")))};var i,o,p;c.parameters={...c.parameters,docs:{...(i=c.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    checked: false,
    'aria-label': 'Unchecked checkbox'
  }
}`,...(p=(o=c.parameters)==null?void 0:o.docs)==null?void 0:p.source}}};var h,k,m;s.parameters={...s.parameters,docs:{...(h=s.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    checked: true,
    'aria-label': 'Checked checkbox'
  }
}`,...(m=(k=s.parameters)==null?void 0:k.docs)==null?void 0:m.source}}};var b,f,x;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    checked: false,
    disabled: true,
    'aria-label': 'Disabled checkbox'
  }
}`,...(x=(f=t.parameters)==null?void 0:f.docs)==null?void 0:x.source}}};var u,y,g;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    checked: true,
    disabled: true,
    'aria-label': 'Disabled checked checkbox'
  }
}`,...(g=(y=r.parameters)==null?void 0:y.docs)==null?void 0:g.source}}};var C,v,I;l.parameters={...l.parameters,docs:{...(C=l.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => {
    const [checked, setChecked] = React.useState(false);
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
        <Checkbox checked={checked} onChange={setChecked} aria-label="Interactive checkbox" />
        <div style={{
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      }}>
          Status: {checked ? 'Checked' : 'Unchecked'}
        </div>
      </div>;
  }
}`,...(I=(v=l.parameters)==null?void 0:v.docs)==null?void 0:I.source}}};var S,D,E;n.parameters={...n.parameters,docs:{...(S=n.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  }}>
      <div style={{
      display: 'flex',
      gap: '16px',
      alignItems: 'center'
    }}>
        <Checkbox checked={false} aria-label="Unchecked" />
        <span style={{
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      }}>Unchecked</span>
      </div>
      <div style={{
      display: 'flex',
      gap: '16px',
      alignItems: 'center'
    }}>
        <Checkbox checked={true} aria-label="Checked" />
        <span style={{
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      }}>Checked</span>
      </div>
      <div style={{
      display: 'flex',
      gap: '16px',
      alignItems: 'center'
    }}>
        <Checkbox checked={false} disabled aria-label="Disabled unchecked" />
        <span style={{
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      }}>Disabled Unchecked</span>
      </div>
      <div style={{
      display: 'flex',
      gap: '16px',
      alignItems: 'center'
    }}>
        <Checkbox checked={true} disabled aria-label="Disabled checked" />
        <span style={{
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      }}>Disabled Checked</span>
      </div>
    </div>
}`,...(E=(D=n.parameters)==null?void 0:D.docs)==null?void 0:E.source}}};const A=["Unchecked","Checked","Disabled","DisabledChecked","Interactive","AllStates"];export{n as AllStates,s as Checked,t as Disabled,r as DisabledChecked,l as Interactive,c as Unchecked,A as __namedExportsOrder,R as default};
