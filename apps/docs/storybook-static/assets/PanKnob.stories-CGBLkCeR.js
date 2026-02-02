import{P as a,r as m,R as e}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const H={title:"Components/PanKnob",component:a,parameters:{layout:"centered",design:{type:"figma",url:"https://www.figma.com/design/8rgC6MOTSEY1MHO4wWnucb/01---Audacity-Component-library?node-id=111-1383"}},tags:["autodocs"],argTypes:{value:{control:{type:"range",min:-100,max:100,step:1},description:"Pan value: -100 (full left) to 100 (full right)"},disabled:{control:"boolean",description:"Disabled state"}}},s={args:{value:0,disabled:!1}},o={args:{value:-100}},l={args:{value:100}},c={args:{value:-50}},i={args:{value:50}},u={args:{value:25,disabled:!0}},p={args:{value:0},render:t=>{const[r,g]=m.useState(t.value||0),v=n=>n===0?"0 (Center)":n<0?`${Math.abs(n)}L`:`${n}R`;return e.createElement("div",{style:{textAlign:"center"}},e.createElement(a,{...t,value:r,onChange:n=>g(n)}),e.createElement("div",{style:{marginTop:"16px",fontSize:"14px",fontWeight:"500",color:"#14151a"}},"Pan: ",v(r)),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Drag vertically to adjust • Arrow keys • '0' to center"))}},d={render:()=>{const[t,r]=m.useState(0),[g,v]=m.useState(-50),[n,W]=m.useState(50);return e.createElement("div",{style:{display:"flex",gap:"32px",alignItems:"center"}},e.createElement("div",{style:{textAlign:"center"}},e.createElement(a,{value:t,onChange:r}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Track 1")),e.createElement("div",{style:{textAlign:"center"}},e.createElement(a,{value:g,onChange:v}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Track 2")),e.createElement("div",{style:{textAlign:"center"}},e.createElement(a,{value:n,onChange:W}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Track 3")))}};var x,f,y;s.parameters={...s.parameters,docs:{...(x=s.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    value: 0,
    disabled: false
  }
}`,...(y=(f=s.parameters)==null?void 0:f.docs)==null?void 0:y.source}}};var S,P,b;o.parameters={...o.parameters,docs:{...(S=o.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    value: -100
  }
}`,...(b=(P=o.parameters)==null?void 0:P.docs)==null?void 0:b.source}}};var h,T,E;l.parameters={...l.parameters,docs:{...(h=l.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    value: 100
  }
}`,...(E=(T=l.parameters)==null?void 0:T.docs)==null?void 0:E.source}}};var C,A,z;c.parameters={...c.parameters,docs:{...(C=c.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    value: -50
  }
}`,...(z=(A=c.parameters)==null?void 0:A.docs)==null?void 0:z.source}}};var R,k,w;i.parameters={...i.parameters,docs:{...(R=i.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    value: 50
  }
}`,...(w=(k=i.parameters)==null?void 0:k.docs)==null?void 0:w.source}}};var K,V,L;u.parameters={...u.parameters,docs:{...(K=u.parameters)==null?void 0:K.docs,source:{originalSource:`{
  args: {
    value: 25,
    disabled: true
  }
}`,...(L=(V=u.parameters)==null?void 0:V.docs)==null?void 0:L.source}}};var M,D,F;p.parameters={...p.parameters,docs:{...(M=p.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    value: 0
  },
  render: args => {
    const [value, setValue] = useState(args.value || 0);

    // Format pan value for display (e.g., "50L", "0C", "50R")
    const formatPanValue = (val: number): string => {
      if (val === 0) return '0 (Center)';
      if (val < 0) return \`\${Math.abs(val)}L\`;
      return \`\${val}R\`;
    };
    return <div style={{
      textAlign: 'center'
    }}>
        <PanKnob {...args} value={value} onChange={newValue => setValue(newValue)} />
        <div style={{
        marginTop: '16px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#14151a'
      }}>
          Pan: {formatPanValue(value)}
        </div>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666'
      }}>
          Drag vertically to adjust • Arrow keys • '0' to center
        </div>
      </div>;
  }
}`,...(F=(D=p.parameters)==null?void 0:D.docs)==null?void 0:F.source}}};var I,$,O;d.parameters={...d.parameters,docs:{...(I=d.parameters)==null?void 0:I.docs,source:{originalSource:`{
  render: () => {
    const [pan1, setPan1] = useState(0);
    const [pan2, setPan2] = useState(-50);
    const [pan3, setPan3] = useState(50);
    return <div style={{
      display: 'flex',
      gap: '32px',
      alignItems: 'center'
    }}>
        <div style={{
        textAlign: 'center'
      }}>
          <PanKnob value={pan1} onChange={setPan1} />
          <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#666'
        }}>
            Track 1
          </div>
        </div>
        <div style={{
        textAlign: 'center'
      }}>
          <PanKnob value={pan2} onChange={setPan2} />
          <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#666'
        }}>
            Track 2
          </div>
        </div>
        <div style={{
        textAlign: 'center'
      }}>
          <PanKnob value={pan3} onChange={setPan3} />
          <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#666'
        }}>
            Track 3
          </div>
        </div>
      </div>;
  }
}`,...(O=($=d.parameters)==null?void 0:$.docs)==null?void 0:O.source}}};const Y=["Center","FullLeft","FullRight","PannedLeft","PannedRight","Disabled","Interactive","MultipleKnobs"];export{s as Center,u as Disabled,o as FullLeft,l as FullRight,p as Interactive,d as MultipleKnobs,c as PannedLeft,i as PannedRight,Y as __namedExportsOrder,H as default};
