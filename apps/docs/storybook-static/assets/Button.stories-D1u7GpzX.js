import{R as e}from"./index-yIsmwZOr.js";import{B as a}from"./index-DR-q5OqV.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const ie={title:"Components/Button",component:a,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{variant:{control:"select",options:["primary","secondary"],description:"Button variant"},size:{control:"select",options:["small","default","large"],description:"Button size (small=24px, default=28px, large=40px)"},showIcon:{control:"boolean",description:"Show icon"},disabled:{control:"boolean",description:"Disabled state"}}},r={args:{variant:"secondary",size:"default",children:"Secondary",showIcon:!1}},t={args:{variant:"secondary",size:"small",children:"Secondary",showIcon:!1}},n={args:{variant:"secondary",children:"Secondary",icon:"🎚️",showIcon:!0}},o={args:{variant:"secondary",children:"Secondary",disabled:!0,showIcon:!1}},s={args:{variant:"secondary",children:"Secondary",icon:"🎚️",showIcon:!0,disabled:!0}},i={args:{variant:"primary",size:"default",children:"Primary",showIcon:!1}},c={args:{variant:"primary",size:"large",children:"Watch video",showIcon:!1}},l={render:()=>e.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},e.createElement("div",null,e.createElement(a,{variant:"primary",size:"default",showIcon:!1},"Primary"),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Primary")),e.createElement("div",null,e.createElement(a,{variant:"secondary",size:"default",showIcon:!1},"Secondary"),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Secondary")))},d={render:()=>e.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},e.createElement("div",null,e.createElement(a,{variant:"secondary",size:"small",showIcon:!1},"Small"),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Small (24px)")),e.createElement("div",null,e.createElement(a,{variant:"secondary",size:"default",showIcon:!1},"Default"),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Default (28px)")),e.createElement("div",null,e.createElement(a,{variant:"primary",size:"large",showIcon:!1},"Large"),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Large (40px)")))},p={render:()=>e.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center"}},e.createElement("div",null,e.createElement(a,{variant:"secondary",size:"default",showIcon:!1},"Default"),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Default")),e.createElement("div",null,e.createElement(a,{variant:"secondary",size:"default",showIcon:!1},"Hover"),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Hover (try me)")),e.createElement("div",null,e.createElement(a,{variant:"secondary",size:"default",showIcon:!1,disabled:!0},"Disabled"),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Disabled")))},m={render:()=>e.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"center",flexWrap:"wrap"}},e.createElement(a,{variant:"secondary",icon:"🎚️"},"Mixer"),e.createElement(a,{variant:"secondary",icon:"⏪"},"Rewind"),e.createElement(a,{variant:"secondary",icon:"⏸️"},"Pause"),e.createElement(a,{variant:"secondary",icon:"⏯️"},"Play"),e.createElement(a,{variant:"secondary",icon:"⏹️"},"Stop"),e.createElement(a,{variant:"secondary",icon:"⏩"},"Forward"))},u={args:{variant:"secondary",children:"This is a longer button text",showIcon:!1}},v={render:()=>{const ee=()=>{alert("Button clicked!")};return e.createElement("div",{style:{textAlign:"center"}},e.createElement(a,{variant:"secondary",onClick:ee,showIcon:!1},"Click Me"),e.createElement("div",{style:{marginTop:"16px",fontSize:"11px",color:"#666"}},"Click the button to see the alert"))}};var y,g,x;r.parameters={...r.parameters,docs:{...(y=r.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    size: 'default',
    children: 'Secondary',
    showIcon: false
  }
}`,...(x=(g=r.parameters)==null?void 0:g.docs)==null?void 0:x.source}}};var f,h,S;t.parameters={...t.parameters,docs:{...(f=t.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    size: 'small',
    children: 'Secondary',
    showIcon: false
  }
}`,...(S=(h=t.parameters)==null?void 0:h.docs)==null?void 0:S.source}}};var I,z,w;n.parameters={...n.parameters,docs:{...(I=n.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    children: 'Secondary',
    icon: '🎚️',
    showIcon: true
  }
}`,...(w=(z=n.parameters)==null?void 0:z.docs)==null?void 0:w.source}}};var E,B,T;o.parameters={...o.parameters,docs:{...(E=o.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    children: 'Secondary',
    disabled: true,
    showIcon: false
  }
}`,...(T=(B=o.parameters)==null?void 0:B.docs)==null?void 0:T.source}}};var b,A,D;s.parameters={...s.parameters,docs:{...(b=s.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    children: 'Secondary',
    icon: '🎚️',
    showIcon: true,
    disabled: true
  }
}`,...(D=(A=s.parameters)==null?void 0:A.docs)==null?void 0:D.source}}};var C,P,k;i.parameters={...i.parameters,docs:{...(C=i.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    size: 'default',
    children: 'Primary',
    showIcon: false
  }
}`,...(k=(P=i.parameters)==null?void 0:P.docs)==null?void 0:k.source}}};var W,L,H;c.parameters={...c.parameters,docs:{...(W=c.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    size: 'large',
    children: 'Watch video',
    showIcon: false
  }
}`,...(H=(L=c.parameters)==null?void 0:L.docs)==null?void 0:H.source}}};var M,R,F;l.parameters={...l.parameters,docs:{...(M=l.parameters)==null?void 0:M.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  }}>
      <div>
        <Button variant="primary" size="default" showIcon={false}>Primary</Button>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Primary
        </div>
      </div>
      <div>
        <Button variant="secondary" size="default" showIcon={false}>Secondary</Button>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Secondary
        </div>
      </div>
    </div>
}`,...(F=(R=l.parameters)==null?void 0:R.docs)==null?void 0:F.source}}};var V,_,O;d.parameters={...d.parameters,docs:{...(V=d.parameters)==null?void 0:V.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  }}>
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
        <Button variant="primary" size="large" showIcon={false}>Large</Button>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Large (40px)
        </div>
      </div>
    </div>
}`,...(O=(_=d.parameters)==null?void 0:_.docs)==null?void 0:O.source}}};var j,q,G;p.parameters={...p.parameters,docs:{...(j=p.parameters)==null?void 0:j.docs,source:{originalSource:`{
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
}`,...(G=(q=p.parameters)==null?void 0:q.docs)==null?void 0:G.source}}};var J,K,N;m.parameters={...m.parameters,docs:{...(J=m.parameters)==null?void 0:J.docs,source:{originalSource:`{
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
}`,...(N=(K=m.parameters)==null?void 0:K.docs)==null?void 0:N.source}}};var Q,U,X;u.parameters={...u.parameters,docs:{...(Q=u.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    children: 'This is a longer button text',
    showIcon: false
  }
}`,...(X=(U=u.parameters)==null?void 0:U.docs)==null?void 0:X.source}}};var Y,Z,$;v.parameters={...v.parameters,docs:{...(Y=v.parameters)==null?void 0:Y.docs,source:{originalSource:`{
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
}`,...($=(Z=v.parameters)==null?void 0:Z.docs)==null?void 0:$.source}}};const ce=["Secondary","SecondarySmall","WithIcon","Disabled","DisabledWithIcon","Primary","Large","VariantComparison","SizeComparison","AllStates","WithIcons","LongText","Interactive"];export{p as AllStates,o as Disabled,s as DisabledWithIcon,v as Interactive,c as Large,u as LongText,i as Primary,r as Secondary,t as SecondarySmall,d as SizeComparison,l as VariantComparison,n as WithIcon,m as WithIcons,ce as __namedExportsOrder,ie as default};
