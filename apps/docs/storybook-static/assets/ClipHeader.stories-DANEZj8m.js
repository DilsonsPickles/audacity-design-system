import{R as e}from"./index-yIsmwZOr.js";import{e as a}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const q={title:"Audio/ClipHeader",component:a,tags:["autodocs"],parameters:{layout:"centered"},argTypes:{color:{control:"select",options:["cyan","blue","violet","magenta","red","orange","yellow","green","teal"],description:"Clip color from the 9-color palette"},selected:{control:"boolean",description:"Whether the parent clip is selected"},state:{control:"select",options:["default","hover"],description:"Interaction state"},name:{control:"text",description:"Clip name displayed in header"},width:{control:"number",description:"Width in pixels"},showPitch:{control:"boolean",description:"Show pitch indicator"},pitchValue:{control:"text",description:"Pitch value to display"},showSpeed:{control:"boolean",description:"Show speed indicator"},speedValue:{control:"text",description:"Speed value to display"},showMenu:{control:"boolean",description:"Show menu button"}}},r={args:{color:"blue",selected:!1,state:"default",name:"Clip",width:272,showPitch:!1,showSpeed:!1,showMenu:!0}},n={args:{...r.args,name:"Audio Track",showPitch:!0,pitchValue:"4.04",showSpeed:!0,speedValue:"112%"}},l={args:{...r.args,selected:!0}},c={args:{...r.args,state:"hover"}},i={args:{...r.args,selected:!0,state:"hover"}},o={render:()=>e.createElement("div",{style:{padding:"20px"}},e.createElement("h3",{style:{marginBottom:"16px",fontFamily:"Inter, sans-serif"}},"All Clip Header States"),e.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(4, 280px)",gap:"8px"}},["cyan","blue","violet","magenta","red","orange","yellow","green","teal"].map(t=>e.createElement(e.Fragment,{key:t},e.createElement(a,{color:t,name:`${t} default`,width:272}),e.createElement(a,{color:t,name:`${t} hover`,state:"hover",width:272}),e.createElement(a,{color:t,name:`${t} selected`,selected:!0,width:272}),e.createElement(a,{color:t,name:`${t} sel+hover`,selected:!0,state:"hover",width:272})))))},s={render:()=>{const[t,T]=e.useState(!1),[B,d]=e.useState(!1);return e.createElement("div",{style:{padding:"20px"}},e.createElement("p",{style:{marginBottom:"16px",fontFamily:"Inter, sans-serif"}},"Click to toggle selection, hover to see hover state"),e.createElement(a,{color:"blue",name:"Interactive Clip",selected:t,state:B?"hover":"default",showPitch:!0,pitchValue:"4.04",showSpeed:!0,speedValue:"112%",onClick:()=>T(!t),onMouseEnter:()=>d(!0),onMouseLeave:()=>d(!1),onMenuClick:()=>alert("Menu clicked!"),width:272}))}};var p,m,u;r.parameters={...r.parameters,docs:{...(p=r.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    color: 'blue',
    selected: false,
    state: 'default',
    name: 'Clip',
    width: 272,
    showPitch: false,
    showSpeed: false,
    showMenu: true
  }
}`,...(u=(m=r.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var h,g,v;n.parameters={...n.parameters,docs:{...(h=n.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    name: 'Audio Track',
    showPitch: true,
    pitchValue: '4.04',
    showSpeed: true,
    speedValue: '112%'
  }
}`,...(v=(g=n.parameters)==null?void 0:g.docs)==null?void 0:v.source}}};var w,f,y;l.parameters={...l.parameters,docs:{...(w=l.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    selected: true
  }
}`,...(y=(f=l.parameters)==null?void 0:f.docs)==null?void 0:y.source}}};var S,C,x;c.parameters={...c.parameters,docs:{...(S=c.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    state: 'hover'
  }
}`,...(x=(C=c.parameters)==null?void 0:C.docs)==null?void 0:x.source}}};var H,b,E;i.parameters={...i.parameters,docs:{...(H=i.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    selected: true,
    state: 'hover'
  }
}`,...(E=(b=i.parameters)==null?void 0:b.docs)==null?void 0:E.source}}};var M,k,I,P,V;o.parameters={...o.parameters,docs:{...(M=o.parameters)==null?void 0:M.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: '20px'
  }}>
      <h3 style={{
      marginBottom: '16px',
      fontFamily: 'Inter, sans-serif'
    }}>All Clip Header States</h3>
      <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 280px)',
      gap: '8px'
    }}>
        {['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'].map(color => <React.Fragment key={color}>
            <ClipHeader color={color as any} name={\`\${color} default\`} width={272} />
            <ClipHeader color={color as any} name={\`\${color} hover\`} state="hover" width={272} />
            <ClipHeader color={color as any} name={\`\${color} selected\`} selected width={272} />
            <ClipHeader color={color as any} name={\`\${color} sel+hover\`} selected state="hover" width={272} />
          </React.Fragment>)}
      </div>
    </div>
}`,...(I=(k=o.parameters)==null?void 0:k.docs)==null?void 0:I.source},description:{story:"Complete state matrix showing all combinations",...(V=(P=o.parameters)==null?void 0:P.docs)==null?void 0:V.description}}};var $,A,F,D,R;s.parameters={...s.parameters,docs:{...($=s.parameters)==null?void 0:$.docs,source:{originalSource:`{
  render: () => {
    const [selected, setSelected] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);
    return <div style={{
      padding: '20px'
    }}>
        <p style={{
        marginBottom: '16px',
        fontFamily: 'Inter, sans-serif'
      }}>
          Click to toggle selection, hover to see hover state
        </p>
        <ClipHeader color="blue" name="Interactive Clip" selected={selected} state={hovered ? 'hover' : 'default'} showPitch pitchValue="4.04" showSpeed speedValue="112%" onClick={() => setSelected(!selected)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onMenuClick={() => alert('Menu clicked!')} width={272} />
      </div>;
  }
}`,...(F=(A=s.parameters)==null?void 0:A.docs)==null?void 0:F.source},description:{story:"Interactive example with pitch and speed",...(R=(D=s.parameters)==null?void 0:D.docs)==null?void 0:R.description}}};const z=["Default","WithPitchAndSpeed","Selected","Hover","SelectedHover","StateMatrix","Interactive"];export{r as Default,c as Hover,s as Interactive,l as Selected,i as SelectedHover,o as StateMatrix,n as WithPitchAndSpeed,z as __namedExportsOrder,q as default};
