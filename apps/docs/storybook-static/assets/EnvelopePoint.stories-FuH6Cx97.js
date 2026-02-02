import{r as e,y as o}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const _={title:"Audio/EnvelopePoint",component:o,parameters:{layout:"centered"},tags:["autodocs"],decorators:[r=>e.createElement("div",{style:{width:"200px",height:"200px",position:"relative",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center"}},e.createElement(r,null))]},t={args:{x:100,y:100,isHovered:!1,isDragged:!1,color:"#ffffff",hoverColor:"#ffaa00",strokeColor:"#2ecc71",radius:4}},s={args:{x:100,y:100,isHovered:!0,isDragged:!1,color:"#ffffff",hoverColor:"#ffaa00",strokeColor:"#2ecc71",radius:4}},f={args:{x:100,y:100,isHovered:!1,isDragged:!0,color:"#ffffff",hoverColor:"#ffaa00",strokeColor:"#2ecc71",radius:4}},a={args:{x:100,y:100,isHovered:!1,isDragged:!1,color:"#ffffff",hoverColor:"#ffaa00",strokeColor:"#2ecc71",radius:8}},l={args:{x:100,y:100,isHovered:!1,isDragged:!1,color:"#ff6b6b",hoverColor:"#ffd43b",strokeColor:"#4dabf7",radius:6}},n={render:()=>e.createElement("div",{style:{width:"400px",height:"300px",position:"relative",background:"#1a1a1a"}},e.createElement(o,{x:100,y:100,color:"#ffffff",hoverColor:"#ffaa00",strokeColor:"#2ecc71"}),e.createElement(o,{x:200,y:100,isHovered:!0,color:"#ffffff",hoverColor:"#ffaa00",strokeColor:"#2ecc71"}),e.createElement(o,{x:300,y:100,isDragged:!0,color:"#ffffff",hoverColor:"#ffaa00",strokeColor:"#2ecc71"}),e.createElement(o,{x:50,y:200,color:"#ffffff",strokeColor:"#2ecc71"}),e.createElement(o,{x:150,y:150,color:"#ffffff",strokeColor:"#2ecc71"}),e.createElement(o,{x:250,y:200,color:"#ffffff",strokeColor:"#2ecc71"}),e.createElement(o,{x:350,y:150,color:"#ffffff",strokeColor:"#2ecc71"}),e.createElement("div",{style:{position:"absolute",top:"10px",left:"10px",color:"#fff",fontSize:"12px"}},e.createElement("div",null,"White: Default"),e.createElement("div",null,"Orange: Hovered/Dragged")))},c={render:()=>{const[r,O]=e.useState({x:200,y:150}),[z,i]=e.useState(!1);return e.createElement("div",{style:{width:"400px",height:"300px",position:"relative",background:"#1a1a1a"}},e.createElement(o,{x:r.x,y:r.y,isHovered:z,color:"#ffffff",hoverColor:"#ffaa00",strokeColor:"#2ecc71",onMouseEnter:()=>i(!0),onMouseLeave:()=>i(!1)}),e.createElement("div",{style:{position:"absolute",bottom:"10px",left:"10px",color:"#fff",fontSize:"12px"}},"Hover over the point to see interaction"))}};var d,p,v;t.parameters={...t.parameters,docs:{...(d=t.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    x: 100,
    y: 100,
    isHovered: false,
    isDragged: false,
    color: '#ffffff',
    hoverColor: '#ffaa00',
    strokeColor: '#2ecc71',
    radius: 4
  }
}`,...(v=(p=t.parameters)==null?void 0:p.docs)==null?void 0:v.source}}};var u,g,m;s.parameters={...s.parameters,docs:{...(u=s.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    x: 100,
    y: 100,
    isHovered: true,
    isDragged: false,
    color: '#ffffff',
    hoverColor: '#ffaa00',
    strokeColor: '#2ecc71',
    radius: 4
  }
}`,...(m=(g=s.parameters)==null?void 0:g.docs)==null?void 0:m.source}}};var x,C,y;f.parameters={...f.parameters,docs:{...(x=f.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    x: 100,
    y: 100,
    isHovered: false,
    isDragged: true,
    color: '#ffffff',
    hoverColor: '#ffaa00',
    strokeColor: '#2ecc71',
    radius: 4
  }
}`,...(y=(C=f.parameters)==null?void 0:C.docs)==null?void 0:y.source}}};var h,k,E;a.parameters={...a.parameters,docs:{...(h=a.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    x: 100,
    y: 100,
    isHovered: false,
    isDragged: false,
    color: '#ffffff',
    hoverColor: '#ffaa00',
    strokeColor: '#2ecc71',
    radius: 8
  }
}`,...(E=(k=a.parameters)==null?void 0:k.docs)==null?void 0:E.source}}};var H,D,b;l.parameters={...l.parameters,docs:{...(H=l.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    x: 100,
    y: 100,
    isHovered: false,
    isDragged: false,
    color: '#ff6b6b',
    hoverColor: '#ffd43b',
    strokeColor: '#4dabf7',
    radius: 6
  }
}`,...(b=(D=l.parameters)==null?void 0:D.docs)==null?void 0:b.source}}};var S,P,I;n.parameters={...n.parameters,docs:{...(S=n.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '400px',
    height: '300px',
    position: 'relative',
    background: '#1a1a1a'
  }}>
      {/* Default */}
      <EnvelopePoint x={100} y={100} color="#ffffff" hoverColor="#ffaa00" strokeColor="#2ecc71" />

      {/* Hovered */}
      <EnvelopePoint x={200} y={100} isHovered={true} color="#ffffff" hoverColor="#ffaa00" strokeColor="#2ecc71" />

      {/* Dragged */}
      <EnvelopePoint x={300} y={100} isDragged={true} color="#ffffff" hoverColor="#ffaa00" strokeColor="#2ecc71" />

      {/* Different positions */}
      <EnvelopePoint x={50} y={200} color="#ffffff" strokeColor="#2ecc71" />
      <EnvelopePoint x={150} y={150} color="#ffffff" strokeColor="#2ecc71" />
      <EnvelopePoint x={250} y={200} color="#ffffff" strokeColor="#2ecc71" />
      <EnvelopePoint x={350} y={150} color="#ffffff" strokeColor="#2ecc71" />

      {/* Labels */}
      <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      color: '#fff',
      fontSize: '12px'
    }}>
        <div>White: Default</div>
        <div>Orange: Hovered/Dragged</div>
      </div>
    </div>
}`,...(I=(P=n.parameters)==null?void 0:P.docs)==null?void 0:I.source}}};var M,w,L;c.parameters={...c.parameters,docs:{...(M=c.parameters)==null?void 0:M.docs,source:{originalSource:`{
  render: () => {
    const [position, setPosition] = React.useState({
      x: 200,
      y: 150
    });
    const [isHovered, setIsHovered] = React.useState(false);
    return <div style={{
      width: '400px',
      height: '300px',
      position: 'relative',
      background: '#1a1a1a'
    }}>
        <EnvelopePoint x={position.x} y={position.y} isHovered={isHovered} color="#ffffff" hoverColor="#ffaa00" strokeColor="#2ecc71" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} />
        <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        color: '#fff',
        fontSize: '12px'
      }}>
          Hover over the point to see interaction
        </div>
      </div>;
  }
}`,...(L=(w=c.parameters)==null?void 0:w.docs)==null?void 0:L.source}}};const j=["Default","Hovered","Dragged","Large","CustomColors","MultiplePoints","Interactive"];export{l as CustomColors,t as Default,f as Dragged,s as Hovered,c as Interactive,a as Large,n as MultiplePoints,j as __namedExportsOrder,_ as default};
