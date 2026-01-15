import{R as e}from"./index-yIsmwZOr.js";import{q as a}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const V={title:"Components/LabeledCheckbox",component:a,parameters:{layout:"centered"},tags:["autodocs"]},s={args:{label:"Don't show this again",checked:!1}},t={args:{label:"Don't show this again",checked:!0}},r={args:{label:"Don't show this again",checked:!1,disabled:!0}},c={args:{label:"Don't show this again",checked:!0,disabled:!0}},o={render:()=>{const[d,L]=e.useState(!1);return e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px"}},e.createElement(a,{label:"Don't show this again",checked:d,onChange:L}),e.createElement("div",{style:{fontSize:"12px",fontFamily:"Inter, sans-serif"}},"Status: ",d?"Checked":"Unchecked"))}},l={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px"}},e.createElement(a,{label:"Don't show this again",checked:!1}),e.createElement(a,{label:"I agree to the terms and conditions",checked:!1}),e.createElement(a,{label:"Remember me",checked:!0}),e.createElement(a,{label:"Send me notifications",checked:!1}))};var n,i,h;s.parameters={...s.parameters,docs:{...(n=s.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    label: "Don't show this again",
    checked: false
  }
}`,...(h=(i=s.parameters)==null?void 0:i.docs)==null?void 0:h.source}}};var m,p,u;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    label: "Don't show this again",
    checked: true
  }
}`,...(u=(p=t.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};var b,k,g;r.parameters={...r.parameters,docs:{...(b=r.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    label: "Don't show this again",
    checked: false,
    disabled: true
  }
}`,...(g=(k=r.parameters)==null?void 0:k.docs)==null?void 0:g.source}}};var f,x,D;c.parameters={...c.parameters,docs:{...(f=c.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    label: "Don't show this again",
    checked: true,
    disabled: true
  }
}`,...(D=(x=c.parameters)==null?void 0:x.docs)==null?void 0:D.source}}};var C,S,y;o.parameters={...o.parameters,docs:{...(C=o.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => {
    const [checked, setChecked] = React.useState(false);
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
        <LabeledCheckbox label="Don't show this again" checked={checked} onChange={setChecked} />
        <div style={{
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      }}>
          Status: {checked ? 'Checked' : 'Unchecked'}
        </div>
      </div>;
  }
}`,...(y=(S=o.parameters)==null?void 0:S.docs)==null?void 0:y.source}}};var w,v,E;l.parameters={...l.parameters,docs:{...(w=l.parameters)==null?void 0:w.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  }}>
      <LabeledCheckbox label="Don't show this again" checked={false} />
      <LabeledCheckbox label="I agree to the terms and conditions" checked={false} />
      <LabeledCheckbox label="Remember me" checked={true} />
      <LabeledCheckbox label="Send me notifications" checked={false} />
    </div>
}`,...(E=(v=l.parameters)==null?void 0:v.docs)==null?void 0:E.source}}};const _=["Default","Checked","Disabled","DisabledChecked","Interactive","VariousLabels"];export{t as Checked,s as Default,r as Disabled,c as DisabledChecked,o as Interactive,l as VariousLabels,_ as __namedExportsOrder,V as default};
