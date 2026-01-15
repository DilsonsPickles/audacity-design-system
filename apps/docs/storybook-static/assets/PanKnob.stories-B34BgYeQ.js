import{r as m,R as e}from"./index-yIsmwZOr.js";import{r as a}from"./index-DR-q5OqV.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const J={title:"Components/PanKnob",component:a,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{value:{control:{type:"range",min:-100,max:100,step:1},description:"Pan value: -100 (full left) to 100 (full right)"},disabled:{control:"boolean",description:"Disabled state"}}},s={args:{value:0,disabled:!1}},o={args:{value:-100}},l={args:{value:100}},c={args:{value:-50}},i={args:{value:50}},p={args:{value:25,disabled:!0}},u={args:{value:0},render:t=>{const[r,g]=m.useState(t.value||0),v=n=>n===0?"0 (Center)":n<0?`${Math.abs(n)}L`:`${n}R`;return e.createElement("div",{style:{textAlign:"center"}},e.createElement(a,{...t,value:r,onChange:n=>g(n)}),e.createElement("div",{style:{marginTop:"16px",fontSize:"14px",fontWeight:"500",color:"#14151a"}},"Pan: ",v(r)),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Drag vertically to adjust • Arrow keys • '0' to center"))}},d={render:()=>{const[t,r]=m.useState(0),[g,v]=m.useState(-50),[n,W]=m.useState(50);return e.createElement("div",{style:{display:"flex",gap:"32px",alignItems:"center"}},e.createElement("div",{style:{textAlign:"center"}},e.createElement(a,{value:t,onChange:r}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Track 1")),e.createElement("div",{style:{textAlign:"center"}},e.createElement(a,{value:g,onChange:v}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Track 2")),e.createElement("div",{style:{textAlign:"center"}},e.createElement(a,{value:n,onChange:W}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Track 3")))}};var x,f,y;s.parameters={...s.parameters,docs:{...(x=s.parameters)==null?void 0:x.docs,source:{originalSource:`{
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
}`,...(E=(T=l.parameters)==null?void 0:T.docs)==null?void 0:E.source}}};var C,z,A;c.parameters={...c.parameters,docs:{...(C=c.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    value: -50
  }
}`,...(A=(z=c.parameters)==null?void 0:z.docs)==null?void 0:A.source}}};var R,k,K;i.parameters={...i.parameters,docs:{...(R=i.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    value: 50
  }
}`,...(K=(k=i.parameters)==null?void 0:k.docs)==null?void 0:K.source}}};var V,L,D;p.parameters={...p.parameters,docs:{...(V=p.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    value: 25,
    disabled: true
  }
}`,...(D=(L=p.parameters)==null?void 0:L.docs)==null?void 0:D.source}}};var F,w,I;u.parameters={...u.parameters,docs:{...(F=u.parameters)==null?void 0:F.docs,source:{originalSource:`{
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
}`,...(I=(w=u.parameters)==null?void 0:w.docs)==null?void 0:I.source}}};var M,$,j;d.parameters={...d.parameters,docs:{...(M=d.parameters)==null?void 0:M.docs,source:{originalSource:`{
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
}`,...(j=($=d.parameters)==null?void 0:$.docs)==null?void 0:j.source}}};const N=["Center","FullLeft","FullRight","PannedLeft","PannedRight","Disabled","Interactive","MultipleKnobs"];export{s as Center,p as Disabled,o as FullLeft,l as FullRight,u as Interactive,d as MultipleKnobs,c as PannedLeft,i as PannedRight,N as __namedExportsOrder,J as default};
