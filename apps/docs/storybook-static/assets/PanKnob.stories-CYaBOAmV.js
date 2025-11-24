import{r as d}from"./index-yIsmwZOr.js";import{P as n}from"./index-BlR7gUto.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";const B={title:"Components/PanKnob",component:n,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{value:{control:{type:"range",min:-100,max:100,step:1},description:"Pan value: -100 (full left) to 100 (full right)"},disabled:{control:"boolean",description:"Disabled state"}}},r={args:{value:0,disabled:!1}},s={args:{value:-100}},o={args:{value:100}},l={args:{value:-50}},c={args:{value:50}},i={args:{value:25,disabled:!0}},p={args:{value:0},render:a=>{const[t,m]=d.useState(a.value||0),g=e=>e===0?"0 (Center)":e<0?`${Math.abs(e)}L`:`${e}R`;return React.createElement("div",{style:{textAlign:"center"}},React.createElement(n,{...a,value:t,onChange:e=>m(e)}),React.createElement("div",{style:{marginTop:"16px",fontSize:"14px",fontWeight:"500",color:"#14151a"}},"Pan: ",g(t)),React.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Drag vertically to adjust • Arrow keys • '0' to center"))}},u={render:()=>{const[a,t]=d.useState(0),[m,g]=d.useState(-50),[e,j]=d.useState(50);return React.createElement("div",{style:{display:"flex",gap:"32px",alignItems:"center"}},React.createElement("div",{style:{textAlign:"center"}},React.createElement(n,{value:a,onChange:t}),React.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Track 1")),React.createElement("div",{style:{textAlign:"center"}},React.createElement(n,{value:m,onChange:g}),React.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Track 2")),React.createElement("div",{style:{textAlign:"center"}},React.createElement(n,{value:e,onChange:j}),React.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Track 3")))}};var v,x,f;r.parameters={...r.parameters,docs:{...(v=r.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    value: 0,
    disabled: false
  }
}`,...(f=(x=r.parameters)==null?void 0:x.docs)==null?void 0:f.source}}};var y,P,S;s.parameters={...s.parameters,docs:{...(y=s.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    value: -100
  }
}`,...(S=(P=s.parameters)==null?void 0:P.docs)==null?void 0:S.source}}};var R,b,h;o.parameters={...o.parameters,docs:{...(R=o.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    value: 100
  }
}`,...(h=(b=o.parameters)==null?void 0:b.docs)==null?void 0:h.source}}};var T,E,C;l.parameters={...l.parameters,docs:{...(T=l.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    value: -50
  }
}`,...(C=(E=l.parameters)==null?void 0:E.docs)==null?void 0:C.source}}};var z,A,k;c.parameters={...c.parameters,docs:{...(z=c.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    value: 50
  }
}`,...(k=(A=c.parameters)==null?void 0:A.docs)==null?void 0:k.source}}};var K,V,L;i.parameters={...i.parameters,docs:{...(K=i.parameters)==null?void 0:K.docs,source:{originalSource:`{
  args: {
    value: 25,
    disabled: true
  }
}`,...(L=(V=i.parameters)==null?void 0:V.docs)==null?void 0:L.source}}};var D,F,w;p.parameters={...p.parameters,docs:{...(D=p.parameters)==null?void 0:D.docs,source:{originalSource:`{
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
}`,...(w=(F=p.parameters)==null?void 0:F.docs)==null?void 0:w.source}}};var I,M,$;u.parameters={...u.parameters,docs:{...(I=u.parameters)==null?void 0:I.docs,source:{originalSource:`{
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
}`,...($=(M=u.parameters)==null?void 0:M.docs)==null?void 0:$.source}}};const G=["Center","FullLeft","FullRight","PannedLeft","PannedRight","Disabled","Interactive","MultipleKnobs"];export{r as Center,i as Disabled,s as FullLeft,o as FullRight,p as Interactive,u as MultipleKnobs,l as PannedLeft,c as PannedRight,G as __namedExportsOrder,B as default};
