import{R as t,r as f}from"./index-yIsmwZOr.js";import{F as e}from"./index-DR-q5OqV.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const h={title:"Components/SwipeyDots",component:e,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{totalDots:{control:"number",description:"Total number of dots"},activeDot:{control:"number",description:"Active dot index (0-based)"}}},o={args:{totalDots:3,activeDot:0}},n={args:{totalDots:5,activeDot:2}},r={render:()=>{const[S,y]=f.useState(0);return t.createElement("div",null,t.createElement(e,{totalDots:4,activeDot:S,onDotClick:y}),t.createElement("div",{style:{marginTop:"16px",fontSize:"12px",color:"#666",textAlign:"center"}},"Click dots to change active slide"))}},i={render:()=>t.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"24px"}},t.createElement("div",null,t.createElement(e,{totalDots:4,activeDot:0}),t.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"First dot active")),t.createElement("div",null,t.createElement(e,{totalDots:4,activeDot:1}),t.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Second dot active")),t.createElement("div",null,t.createElement(e,{totalDots:4,activeDot:2}),t.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Third dot active")),t.createElement("div",null,t.createElement(e,{totalDots:4,activeDot:3}),t.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666",textAlign:"center"}},"Fourth dot active")))};var a,c,s;o.parameters={...o.parameters,docs:{...(a=o.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    totalDots: 3,
    activeDot: 0
  }
}`,...(s=(c=o.parameters)==null?void 0:c.docs)==null?void 0:s.source}}};var l,d,p;n.parameters={...n.parameters,docs:{...(l=n.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    totalDots: 5,
    activeDot: 2
  }
}`,...(p=(d=n.parameters)==null?void 0:d.docs)==null?void 0:p.source}}};var v,m,D;r.parameters={...r.parameters,docs:{...(v=r.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => {
    const [activeDot, setActiveDot] = useState(0);
    return <div>
        <SwipeyDots totalDots={4} activeDot={activeDot} onDotClick={setActiveDot} />
        <div style={{
        marginTop: '16px',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
          Click dots to change active slide
        </div>
      </div>;
  }
}`,...(D=(m=r.parameters)==null?void 0:m.docs)==null?void 0:D.source}}};var x,g,u;i.parameters={...i.parameters,docs:{...(x=i.parameters)==null?void 0:x.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  }}>
      <div>
        <SwipeyDots totalDots={4} activeDot={0} />
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          First dot active
        </div>
      </div>
      <div>
        <SwipeyDots totalDots={4} activeDot={1} />
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Second dot active
        </div>
      </div>
      <div>
        <SwipeyDots totalDots={4} activeDot={2} />
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Third dot active
        </div>
      </div>
      <div>
        <SwipeyDots totalDots={4} activeDot={3} />
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
          Fourth dot active
        </div>
      </div>
    </div>
}`,...(u=(g=i.parameters)==null?void 0:g.docs)==null?void 0:u.source}}};const C=["Default","FiveDots","Interactive","AllStates"];export{i as AllStates,o as Default,n as FiveDots,r as Interactive,C as __namedExportsOrder,h as default};
