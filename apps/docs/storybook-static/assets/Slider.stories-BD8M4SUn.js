import{R as e,r as s}from"./index-yIsmwZOr.js";import{z as t}from"./index-DR-q5OqV.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const Y={title:"Components/Slider",component:t,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{value:{control:{type:"range",min:0,max:100,step:1},description:"Current value (0-100)"},min:{control:{type:"number"},description:"Minimum value"},max:{control:{type:"number"},description:"Maximum value"},disabled:{control:"boolean",description:"Disabled state"}}},l={args:{value:50,disabled:!1},render:n=>e.createElement("div",{style:{width:"300px"}},e.createElement(t,{...n}))},i={args:{value:0},render:n=>e.createElement("div",{style:{width:"300px"}},e.createElement(t,{...n}))},o={args:{value:100},render:n=>e.createElement("div",{style:{width:"300px"}},e.createElement(t,{...n}))},d={args:{value:25},render:n=>e.createElement("div",{style:{width:"300px"}},e.createElement(t,{...n}))},c={args:{value:75},render:n=>e.createElement("div",{style:{width:"300px"}},e.createElement(t,{...n}))},p={args:{value:60,disabled:!0},render:n=>e.createElement("div",{style:{width:"300px"}},e.createElement(t,{...n}))},u={args:{value:50},render:n=>{const[r,a]=s.useState(n.value||50);return e.createElement("div",{style:{width:"300px",textAlign:"center"}},e.createElement(t,{...n,value:r,onChange:g=>a(g)}),e.createElement("div",{style:{marginTop:"20px",fontSize:"14px",fontWeight:"500",color:"#14151a"}},"Value: ",r),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Drag the slider to adjust"))}},m={render:()=>{const[n,r]=s.useState(50),[a,g]=s.useState(70),[G,J]=s.useState(30);return e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"24px",alignItems:"center"}},e.createElement("div",{style:{width:"200px"}},e.createElement(t,{value:n,onChange:r}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"200px width")),e.createElement("div",{style:{width:"300px"}},e.createElement(t,{value:a,onChange:g}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"300px width")),e.createElement("div",{style:{width:"400px"}},e.createElement(t,{value:G,onChange:J}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"400px width")))}},v={render:()=>{const[n,r]=s.useState(5);return e.createElement("div",{style:{width:"300px",textAlign:"center"}},e.createElement(t,{value:n,min:0,max:10,onChange:a=>r(a)}),e.createElement("div",{style:{marginTop:"20px",fontSize:"14px",fontWeight:"500",color:"#14151a"}},"Value: ",n," / 10"),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Custom range (0-10)"))}};var x,h,S;l.parameters={...l.parameters,docs:{...(x=l.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    value: 50,
    disabled: false
  },
  render: args => <div style={{
    width: '300px'
  }}>
      <Slider {...args} />
    </div>
}`,...(S=(h=l.parameters)==null?void 0:h.docs)==null?void 0:S.source}}};var y,w,f;i.parameters={...i.parameters,docs:{...(y=i.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    value: 0
  },
  render: args => <div style={{
    width: '300px'
  }}>
      <Slider {...args} />
    </div>
}`,...(f=(w=i.parameters)==null?void 0:w.docs)==null?void 0:f.source}}};var E,V,C;o.parameters={...o.parameters,docs:{...(E=o.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    value: 100
  },
  render: args => <div style={{
    width: '300px'
  }}>
      <Slider {...args} />
    </div>
}`,...(C=(V=o.parameters)==null?void 0:V.docs)==null?void 0:C.source}}};var z,T,b;d.parameters={...d.parameters,docs:{...(z=d.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    value: 25
  },
  render: args => <div style={{
    width: '300px'
  }}>
      <Slider {...args} />
    </div>
}`,...(b=(T=d.parameters)==null?void 0:T.docs)==null?void 0:b.source}}};var D,A,M;c.parameters={...c.parameters,docs:{...(D=c.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    value: 75
  },
  render: args => <div style={{
    width: '300px'
  }}>
      <Slider {...args} />
    </div>
}`,...(M=(A=c.parameters)==null?void 0:A.docs)==null?void 0:M.source}}};var W,I,R;p.parameters={...p.parameters,docs:{...(W=p.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    value: 60,
    disabled: true
  },
  render: args => <div style={{
    width: '300px'
  }}>
      <Slider {...args} />
    </div>
}`,...(R=(I=p.parameters)==null?void 0:I.docs)==null?void 0:R.source}}};var j,H,L;u.parameters={...u.parameters,docs:{...(j=u.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    value: 50
  },
  render: args => {
    const [value, setValue] = useState(args.value || 50);
    return <div style={{
      width: '300px',
      textAlign: 'center'
    }}>
        <Slider {...args} value={value} onChange={newValue => setValue(newValue)} />
        <div style={{
        marginTop: '20px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#14151a'
      }}>
          Value: {value}
        </div>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666'
      }}>
          Drag the slider to adjust
        </div>
      </div>;
  }
}`,...(L=(H=u.parameters)==null?void 0:H.docs)==null?void 0:L.source}}};var _,O,k;m.parameters={...m.parameters,docs:{...(_=m.parameters)==null?void 0:_.docs,source:{originalSource:`{
  render: () => {
    const [value1, setValue1] = useState(50);
    const [value2, setValue2] = useState(70);
    const [value3, setValue3] = useState(30);
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      alignItems: 'center'
    }}>
        <div style={{
        width: '200px'
      }}>
          <Slider value={value1} onChange={setValue1} />
          <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#666',
          textAlign: 'center'
        }}>
            200px width
          </div>
        </div>
        <div style={{
        width: '300px'
      }}>
          <Slider value={value2} onChange={setValue2} />
          <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#666',
          textAlign: 'center'
        }}>
            300px width
          </div>
        </div>
        <div style={{
        width: '400px'
      }}>
          <Slider value={value3} onChange={setValue3} />
          <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#666',
          textAlign: 'center'
        }}>
            400px width
          </div>
        </div>
      </div>;
  }
}`,...(k=(O=m.parameters)==null?void 0:O.docs)==null?void 0:k.source}}};var q,B,F;v.parameters={...v.parameters,docs:{...(q=v.parameters)==null?void 0:q.docs,source:{originalSource:`{
  render: () => {
    const [value, setValue] = useState(5);
    return <div style={{
      width: '300px',
      textAlign: 'center'
    }}>
        <Slider value={value} min={0} max={10} onChange={newValue => setValue(newValue)} />
        <div style={{
        marginTop: '20px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#14151a'
      }}>
          Value: {value} / 10
        </div>
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666'
      }}>
          Custom range (0-10)
        </div>
      </div>;
  }
}`,...(F=(B=v.parameters)==null?void 0:B.docs)==null?void 0:F.source}}};const Z=["Default","Min","Max","Low","High","Disabled","Interactive","DifferentWidths","CustomRange"];export{v as CustomRange,l as Default,m as DifferentWidths,p as Disabled,c as High,u as Interactive,d as Low,o as Max,i as Min,Z as __namedExportsOrder,Y as default};
