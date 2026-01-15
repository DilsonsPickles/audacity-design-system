import{R as e}from"./index-yIsmwZOr.js";import{Q as r}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const j={title:"Components/ToolButton",component:r,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{state:{control:"select",options:["idle","hover","pressed","disabled"]}}},o={args:{icon:"",state:"idle"}},t={args:{icon:"",state:"hover"}},s={args:{icon:"",state:"pressed"}},n={args:{icon:"",disabled:!0}},a={render:()=>e.createElement("div",{style:{display:"flex",gap:"4px",alignItems:"center"}},e.createElement(r,{icon:""}),e.createElement(r,{icon:""}),e.createElement(r,{icon:""}),e.createElement(r,{icon:""}),e.createElement(r,{icon:""}))};var i,c,d,m,p;o.parameters={...o.parameters,docs:{...(i=o.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF41B),
    // Mixer icon
    state: 'idle'
  }
}`,...(d=(c=o.parameters)==null?void 0:c.docs)==null?void 0:d.source},description:{story:"Tool button in idle state",...(p=(m=o.parameters)==null?void 0:m.docs)==null?void 0:p.description}}};var l,g,C,u,f;t.parameters={...t.parameters,docs:{...(l=t.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF41B),
    state: 'hover'
  }
}`,...(C=(g=t.parameters)==null?void 0:g.docs)==null?void 0:C.source},description:{story:"Tool button in hover state",...(f=(u=t.parameters)==null?void 0:u.docs)==null?void 0:f.description}}};var S,h,x,T,B;s.parameters={...s.parameters,docs:{...(S=s.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF41B),
    state: 'pressed'
  }
}`,...(x=(h=s.parameters)==null?void 0:h.docs)==null?void 0:x.source},description:{story:"Tool button in pressed state",...(B=(T=s.parameters)==null?void 0:T.docs)==null?void 0:B.description}}};var b,y,E,v,F;n.parameters={...n.parameters,docs:{...(b=n.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF41B),
    disabled: true
  }
}`,...(E=(y=n.parameters)==null?void 0:y.docs)==null?void 0:E.source},description:{story:"Tool button in disabled state",...(F=(v=n.parameters)==null?void 0:v.docs)==null?void 0:F.description}}};var I,A,D,H,P;a.parameters={...a.parameters,docs:{...(I=a.parameters)==null?void 0:I.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  }}>
      <ToolButton icon={String.fromCharCode(0xF41B)} />
      <ToolButton icon={String.fromCharCode(0xEF13)} />
      <ToolButton icon={String.fromCharCode(0xE001)} />
      <ToolButton icon={String.fromCharCode(0xE002)} />
      <ToolButton icon={String.fromCharCode(0xEF2A)} />
    </div>
}`,...(D=(A=a.parameters)==null?void 0:A.docs)==null?void 0:D.source},description:{story:"Different tool buttons",...(P=(H=a.parameters)==null?void 0:H.docs)==null?void 0:P.description}}};const k=["Idle","Hover","Pressed","Disabled","AllTools"];export{a as AllTools,n as Disabled,t as Hover,o as Idle,s as Pressed,k as __namedExportsOrder,j as default};
