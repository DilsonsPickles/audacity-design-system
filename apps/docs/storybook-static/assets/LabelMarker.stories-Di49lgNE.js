import{R as e}from"./index-yIsmwZOr.js";import{p as t}from"./index-DR-q5OqV.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const Q={title:"Audio/LabelMarker",component:t,parameters:{layout:"centered",backgrounds:{default:"track",values:[{name:"track",value:"#eeeef1"}]}},tags:["autodocs"],argTypes:{text:{control:"text",description:"Label text to display"},type:{control:"select",options:["point","region"],description:"Type of label marker"},state:{control:"select",options:["idle","hover","active"],description:"Visual state of the label"},width:{control:"number",description:"Width in pixels (for region labels)"},stalkHeight:{control:"number",description:"Height of the stalk in pixels"},selected:{control:"boolean",description:"Whether the label is selected"}}},a={args:{text:"Label 1",type:"point",state:"idle",stalkHeight:60,selected:!1}},r={args:{text:"Label 1",type:"point",state:"hover",stalkHeight:60,selected:!1}},o={args:{text:"Label 1",type:"point",state:"active",stalkHeight:60,selected:!0}},n={args:{text:"Label 1",type:"region",state:"idle",width:225,stalkHeight:60,selected:!1}},s={args:{text:"Label 1",type:"region",state:"hover",width:225,stalkHeight:60,selected:!1}},c={args:{text:"Label 1",type:"region",state:"active",width:225,stalkHeight:60,selected:!0}},d={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"40px",alignItems:"flex-start"}},e.createElement("div",null,e.createElement(t,{text:"Short",type:"region",width:100,stalkHeight:60}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"100px")),e.createElement("div",null,e.createElement(t,{text:"Medium Label",type:"region",width:225,stalkHeight:60}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"225px")),e.createElement("div",null,e.createElement(t,{text:"Very Long Label Name",type:"region",width:350,stalkHeight:60}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"350px")))},p={render:()=>e.createElement("div",{style:{display:"flex",gap:"60px",alignItems:"flex-start"}},e.createElement("div",null,e.createElement("div",{style:{marginBottom:"16px",fontSize:"14px",fontWeight:"bold"}},"Point Markers"),e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"40px"}},e.createElement("div",null,e.createElement(t,{text:"Label 1",type:"point",state:"idle",stalkHeight:60}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Idle")),e.createElement("div",null,e.createElement(t,{text:"Label 1",type:"point",state:"hover",stalkHeight:60}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Hover")),e.createElement("div",null,e.createElement(t,{text:"Label 1",type:"point",state:"active",stalkHeight:60,selected:!0}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Active")))),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"16px",fontSize:"14px",fontWeight:"bold"}},"Region Markers"),e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"40px"}},e.createElement("div",null,e.createElement(t,{text:"Label 1",type:"region",width:225,state:"idle",stalkHeight:60}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Idle")),e.createElement("div",null,e.createElement(t,{text:"Label 1",type:"region",width:225,state:"hover",stalkHeight:60}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Hover")),e.createElement("div",null,e.createElement(t,{text:"Label 1",type:"region",width:225,state:"active",stalkHeight:60,selected:!0}),e.createElement("div",{style:{marginTop:"8px",fontSize:"11px",color:"#666"}},"Active")))))},g={render:()=>{const[l,m]=e.useState(null),[i,x]=e.useState(null);return e.createElement("div",{style:{padding:"40px"}},e.createElement("div",{style:{marginBottom:"32px"}},e.createElement("h3",{style:{marginBottom:"16px"}},"Point Markers (Click to select)"),e.createElement("div",{style:{display:"flex",gap:"40px",alignItems:"flex-start"}},e.createElement(t,{text:"Intro",type:"point",stalkHeight:60,selected:l===0,onClick:()=>m(l===0?null:0)}),e.createElement(t,{text:"Verse",type:"point",stalkHeight:60,selected:l===1,onClick:()=>m(l===1?null:1)}),e.createElement(t,{text:"Chorus",type:"point",stalkHeight:60,selected:l===2,onClick:()=>m(l===2?null:2)}))),e.createElement("div",null,e.createElement("h3",{style:{marginBottom:"16px"}},"Region Markers (Click to select)"),e.createElement("div",{style:{display:"flex",gap:"40px",alignItems:"flex-start"}},e.createElement(t,{text:"Section A",type:"region",width:180,stalkHeight:60,selected:i===0,onClick:()=>x(i===0?null:0)}),e.createElement(t,{text:"Section B",type:"region",width:200,stalkHeight:60,selected:i===1,onClick:()=>x(i===1?null:1)}))))}};var v,y,h;a.parameters={...a.parameters,docs:{...(v=a.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    text: 'Label 1',
    type: 'point',
    state: 'idle',
    stalkHeight: 60,
    selected: false
  }
}`,...(h=(y=a.parameters)==null?void 0:y.docs)==null?void 0:h.source}}};var u,k,f;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    text: 'Label 1',
    type: 'point',
    state: 'hover',
    stalkHeight: 60,
    selected: false
  }
}`,...(f=(k=r.parameters)==null?void 0:k.docs)==null?void 0:f.source}}};var b,S,H;o.parameters={...o.parameters,docs:{...(b=o.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    text: 'Label 1',
    type: 'point',
    state: 'active',
    stalkHeight: 60,
    selected: true
  }
}`,...(H=(S=o.parameters)==null?void 0:S.docs)==null?void 0:H.source}}};var E,L,M;n.parameters={...n.parameters,docs:{...(E=n.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    text: 'Label 1',
    type: 'region',
    state: 'idle',
    width: 225,
    stalkHeight: 60,
    selected: false
  }
}`,...(M=(L=n.parameters)==null?void 0:L.docs)==null?void 0:M.source}}};var R,w,P;s.parameters={...s.parameters,docs:{...(R=s.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    text: 'Label 1',
    type: 'region',
    state: 'hover',
    width: 225,
    stalkHeight: 60,
    selected: false
  }
}`,...(P=(w=s.parameters)==null?void 0:w.docs)==null?void 0:P.source}}};var z,I,T;c.parameters={...c.parameters,docs:{...(z=c.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    text: 'Label 1',
    type: 'region',
    state: 'active',
    width: 225,
    stalkHeight: 60,
    selected: true
  }
}`,...(T=(I=c.parameters)==null?void 0:I.docs)==null?void 0:T.source}}};var C,A,B;d.parameters={...d.parameters,docs:{...(C=d.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
    alignItems: 'flex-start'
  }}>
      <div>
        <LabelMarker text="Short" type="region" width={100} stalkHeight={60} />
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666'
      }}>100px</div>
      </div>
      <div>
        <LabelMarker text="Medium Label" type="region" width={225} stalkHeight={60} />
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666'
      }}>225px</div>
      </div>
      <div>
        <LabelMarker text="Very Long Label Name" type="region" width={350} stalkHeight={60} />
        <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666'
      }}>350px</div>
      </div>
    </div>
}`,...(B=(A=d.parameters)==null?void 0:A.docs)==null?void 0:B.source}}};var W,D,V;p.parameters={...p.parameters,docs:{...(W=p.parameters)==null?void 0:W.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '60px',
    alignItems: 'flex-start'
  }}>
      <div>
        <div style={{
        marginBottom: '16px',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
          Point Markers
        </div>
        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '40px'
      }}>
          <div>
            <LabelMarker text="Label 1" type="point" state="idle" stalkHeight={60} />
            <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#666'
          }}>Idle</div>
          </div>
          <div>
            <LabelMarker text="Label 1" type="point" state="hover" stalkHeight={60} />
            <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#666'
          }}>Hover</div>
          </div>
          <div>
            <LabelMarker text="Label 1" type="point" state="active" stalkHeight={60} selected={true} />
            <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#666'
          }}>Active</div>
          </div>
        </div>
      </div>

      <div>
        <div style={{
        marginBottom: '16px',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
          Region Markers
        </div>
        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '40px'
      }}>
          <div>
            <LabelMarker text="Label 1" type="region" width={225} state="idle" stalkHeight={60} />
            <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#666'
          }}>Idle</div>
          </div>
          <div>
            <LabelMarker text="Label 1" type="region" width={225} state="hover" stalkHeight={60} />
            <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#666'
          }}>Hover</div>
          </div>
          <div>
            <LabelMarker text="Label 1" type="region" width={225} state="active" stalkHeight={60} selected={true} />
            <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#666'
          }}>Active</div>
          </div>
        </div>
      </div>
    </div>
}`,...(V=(D=p.parameters)==null?void 0:D.docs)==null?void 0:V.source}}};var N,_,O;g.parameters={...g.parameters,docs:{...(N=g.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => {
    const [selectedPoint, setSelectedPoint] = React.useState<number | null>(null);
    const [selectedRegion, setSelectedRegion] = React.useState<number | null>(null);
    return <div style={{
      padding: '40px'
    }}>
        <div style={{
        marginBottom: '32px'
      }}>
          <h3 style={{
          marginBottom: '16px'
        }}>Point Markers (Click to select)</h3>
          <div style={{
          display: 'flex',
          gap: '40px',
          alignItems: 'flex-start'
        }}>
            <LabelMarker text="Intro" type="point" stalkHeight={60} selected={selectedPoint === 0} onClick={() => setSelectedPoint(selectedPoint === 0 ? null : 0)} />
            <LabelMarker text="Verse" type="point" stalkHeight={60} selected={selectedPoint === 1} onClick={() => setSelectedPoint(selectedPoint === 1 ? null : 1)} />
            <LabelMarker text="Chorus" type="point" stalkHeight={60} selected={selectedPoint === 2} onClick={() => setSelectedPoint(selectedPoint === 2 ? null : 2)} />
          </div>
        </div>

        <div>
          <h3 style={{
          marginBottom: '16px'
        }}>Region Markers (Click to select)</h3>
          <div style={{
          display: 'flex',
          gap: '40px',
          alignItems: 'flex-start'
        }}>
            <LabelMarker text="Section A" type="region" width={180} stalkHeight={60} selected={selectedRegion === 0} onClick={() => setSelectedRegion(selectedRegion === 0 ? null : 0)} />
            <LabelMarker text="Section B" type="region" width={200} stalkHeight={60} selected={selectedRegion === 1} onClick={() => setSelectedRegion(selectedRegion === 1 ? null : 1)} />
          </div>
        </div>
      </div>;
  }
}`,...(O=(_=g.parameters)==null?void 0:_.docs)==null?void 0:O.source}}};const U=["PointIdle","PointHover","PointActive","RegionIdle","RegionHover","RegionActive","RegionWidths","AllStates","Interactive"];export{p as AllStates,g as Interactive,o as PointActive,r as PointHover,a as PointIdle,c as RegionActive,s as RegionHover,n as RegionIdle,d as RegionWidths,U as __namedExportsOrder,Q as default};
