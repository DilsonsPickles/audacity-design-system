import{B as e}from"./index-BlR7gUto.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-yIsmwZOr.js";const N={title:"Components/Button",component:e,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{variant:{control:"select",options:["secondary"],description:"Button variant"},size:{control:"select",options:["default","small"],description:"Button size (default=28px, small=24px)"},showIcon:{control:"boolean",description:"Show icon"},disabled:{control:"boolean",description:"Disabled state"}}},a={args:{variant:"secondary",size:"default",children:"Secondary",showIcon:!1}},t={args:{variant:"secondary",size:"small",children:"Secondary",showIcon:!1}},n={args:{variant:"secondary",children:"Secondary",icon:"🎚️",showIcon:!0}},r={args:{variant:"secondary",children:"Secondary",disabled:!0,showIcon:!1}},o={args:{variant:"secondary",children:"Secondary",icon:"🎚️",showIcon:!0,disabled:!0}},s={render:()=>React.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},React.createElement("div",null,React.createElement(e,{variant:"secondary",size:"default",showIcon:!1},"Default"),React.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Default (28px)")),React.createElement("div",null,React.createElement(e,{variant:"secondary",size:"small",showIcon:!1},"Small"),React.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Small (24px)")))},c={render:()=>React.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},React.createElement("div",null,React.createElement(e,{variant:"secondary",size:"default",showIcon:!1},"Default"),React.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Default")),React.createElement("div",null,React.createElement(e,{variant:"secondary",size:"default",showIcon:!1},"Hover"),React.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Hover (try me)")),React.createElement("div",null,React.createElement(e,{variant:"secondary",size:"default",showIcon:!1,disabled:!0},"Disabled"),React.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Disabled")))},i={render:()=>React.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center",flexWrap:"wrap"}},React.createElement(e,{variant:"secondary",icon:"🎚️"},"Mixer"),React.createElement(e,{variant:"secondary",icon:"⏪"},"Rewind"),React.createElement(e,{variant:"secondary",icon:"⏸️"},"Pause"),React.createElement(e,{variant:"secondary",icon:"⏯️"},"Play"),React.createElement(e,{variant:"secondary",icon:"⏹️"},"Stop"),React.createElement(e,{variant:"secondary",icon:"⏩"},"Forward"))},l={args:{variant:"secondary",children:"This is a longer button text",showIcon:!1}},d={render:()=>{const j=()=>{alert("Button clicked!")};return React.createElement("div",{style:{textAlign:"center"}},React.createElement(e,{variant:"secondary",onClick:j,showIcon:!1},"Click Me"),React.createElement("div",{style:{marginTop:"16px",fontSize:"11px",color:"#666"}},"Click the button to see the alert"))}};var p,m,u;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    size: 'default',
    children: 'Secondary',
    showIcon: false
  }
}`,...(u=(m=a.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var v,y,g;t.parameters={...t.parameters,docs:{...(v=t.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    size: 'small',
    children: 'Secondary',
    showIcon: false
  }
}`,...(g=(y=t.parameters)==null?void 0:y.docs)==null?void 0:g.source}}};var x,f,h;n.parameters={...n.parameters,docs:{...(x=n.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    children: 'Secondary',
    icon: '🎚️',
    showIcon: true
  }
}`,...(h=(f=n.parameters)==null?void 0:f.docs)==null?void 0:h.source}}};var S,I,w;r.parameters={...r.parameters,docs:{...(S=r.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    children: 'Secondary',
    disabled: true,
    showIcon: false
  }
}`,...(w=(I=r.parameters)==null?void 0:I.docs)==null?void 0:w.source}}};var B,z,R;o.parameters={...o.parameters,docs:{...(B=o.parameters)==null?void 0:B.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    children: 'Secondary',
    icon: '🎚️',
    showIcon: true,
    disabled: true
  }
}`,...(R=(z=o.parameters)==null?void 0:z.docs)==null?void 0:R.source}}};var E,b,D;s.parameters={...s.parameters,docs:{...(E=s.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  }}>
      <div>
        <Button variant="secondary" size="default" showIcon={false}>Default</Button>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Default (28px)
        </div>
      </div>
      <div>
        <Button variant="secondary" size="small" showIcon={false}>Small</Button>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Small (24px)
        </div>
      </div>
    </div>
}`,...(D=(b=s.parameters)==null?void 0:b.docs)==null?void 0:D.source}}};var T,A,C;c.parameters={...c.parameters,docs:{...(T=c.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  }}>
      <div>
        <Button variant="secondary" size="default" showIcon={false}>Default</Button>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Default
        </div>
      </div>
      <div>
        <Button variant="secondary" size="default" showIcon={false}>Hover</Button>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Hover (try me)
        </div>
      </div>
      <div>
        <Button variant="secondary" size="default" showIcon={false} disabled>Disabled</Button>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Disabled
        </div>
      </div>
    </div>
}`,...(C=(A=c.parameters)==null?void 0:A.docs)==null?void 0:C.source}}};var k,W,H;i.parameters={...i.parameters,docs:{...(k=i.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap'
  }}>
      <Button variant="secondary" icon="🎚️">Mixer</Button>
      <Button variant="secondary" icon="⏪">Rewind</Button>
      <Button variant="secondary" icon="⏸️">Pause</Button>
      <Button variant="secondary" icon="⏯️">Play</Button>
      <Button variant="secondary" icon="⏹️">Stop</Button>
      <Button variant="secondary" icon="⏩">Forward</Button>
    </div>
}`,...(H=(W=i.parameters)==null?void 0:W.docs)==null?void 0:H.source}}};var M,P,F;l.parameters={...l.parameters,docs:{...(M=l.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    children: 'This is a longer button text',
    showIcon: false
  }
}`,...(F=(P=l.parameters)==null?void 0:P.docs)==null?void 0:F.source}}};var L,_,O;d.parameters={...d.parameters,docs:{...(L=d.parameters)==null?void 0:L.docs,source:{originalSource:`{
  render: () => {
    const handleClick = () => {
      alert('Button clicked!');
    };
    return <div style={{
      textAlign: 'center'
    }}>
        <Button variant="secondary" onClick={handleClick} showIcon={false}>
          Click Me
        </Button>
        <div style={{
        marginTop: '16px',
        fontSize: '11px',
        color: '#666'
      }}>
          Click the button to see the alert
        </div>
      </div>;
  }
}`,...(O=(_=d.parameters)==null?void 0:_.docs)==null?void 0:O.source}}};const Q=["Secondary","SecondarySmall","WithIcon","Disabled","DisabledWithIcon","SizeComparison","AllStates","WithIcons","LongText","Interactive"];export{c as AllStates,r as Disabled,o as DisabledWithIcon,d as Interactive,l as LongText,a as Secondary,t as SecondarySmall,s as SizeComparison,n as WithIcon,i as WithIcons,Q as __namedExportsOrder,N as default};
