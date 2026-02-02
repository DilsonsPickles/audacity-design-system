import{M as n,r,R as e,u as F}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const W={title:"Layout & Behavior/ResizablePanel",component:n,parameters:{layout:"padded"},tags:["autodocs"],argTypes:{minHeight:{control:{type:"number",min:20,max:200,step:1},description:"Minimum height the panel can be resized to"},maxHeight:{control:{type:"number",min:100,max:500,step:10},description:"Maximum height the panel can be resized to"},resizeEdge:{control:"select",options:["top","bottom","both"],description:"Which edge(s) can be used to resize"},resizeThreshold:{control:{type:"number",min:4,max:16,step:2},description:"Size of the resize zone in pixels"}}},a={render:()=>{const[t,i]=r.useState(114);return e.createElement("div",{style:{width:"300px"}},e.createElement(n,{initialHeight:t,minHeight:44,resizeEdge:"bottom",onHeightChange:i},e.createElement("div",{style:{backgroundColor:"#EEEEF1",padding:"12px",height:"100%",border:"1px solid #CDCED7",borderRadius:"4px"}},e.createElement("div",{style:{marginBottom:"8px",fontSize:"14px",fontWeight:600}},"Resizable Content"),e.createElement("div",{style:{fontSize:"12px",color:"#666"}},"Height: ",t,"px"),e.createElement("div",{style:{fontSize:"11px",color:"#999",marginTop:"8px"}},"Drag the bottom edge to resize"))))}},s={render:()=>{const[t,i]=r.useState(114),o=()=>t<44?"collapsed":t<80?"truncated":"default";return e.createElement("div",{style:{width:"240px",backgroundColor:"#f5f5f5",padding:"16px"}},e.createElement(n,{initialHeight:t,minHeight:44,resizeEdge:"bottom",onHeightChange:i},e.createElement(F,{trackName:"Audio Track",height:o(),state:"idle"})),e.createElement("div",{style:{marginTop:"16px",fontSize:"12px",color:"#666"}},"Current height: ",t,"px (",o(),")"))}},d={render:()=>{const[t,i]=r.useState(100);return e.createElement("div",{style:{width:"300px"}},e.createElement(n,{initialHeight:t,minHeight:60,maxHeight:200,resizeEdge:"bottom",onHeightChange:i},e.createElement("div",{style:{backgroundColor:"#EEEEF1",padding:"12px",height:"100%",border:"1px solid #CDCED7",borderRadius:"4px"}},e.createElement("div",{style:{marginBottom:"8px",fontSize:"14px",fontWeight:600}},"Constrained Resize"),e.createElement("div",{style:{fontSize:"12px",color:"#666"}},"Height: ",t,"px"),e.createElement("div",{style:{fontSize:"11px",color:"#999",marginTop:"8px"}},"Min: 60px, Max: 200px"))))}},l={args:{minHeight:60,resizeEdge:"bottom",resizeThreshold:8},render:t=>{const[i,o]=r.useState(100);return e.createElement("div",{style:{width:"300px"}},e.createElement(n,{...t,initialHeight:i,onHeightChange:o},e.createElement("div",{style:{backgroundColor:"#E3F2FD",padding:"12px",height:"100%",border:"1px solid #90CAF9",borderRadius:"4px"}},e.createElement("div",{style:{marginBottom:"8px",fontSize:"14px",fontWeight:600}},"Bottom Edge Resize"),e.createElement("div",{style:{fontSize:"12px",color:"#1976D2"}},"Drag bottom edge (",t.resizeThreshold,"px zone)"))))}},g={render:()=>{const[t,i]=r.useState(80),[o,P]=r.useState(120),[h,D]=r.useState(100);return e.createElement("div",{style:{width:"300px",display:"flex",flexDirection:"column",gap:"4px"}},e.createElement(n,{initialHeight:t,minHeight:44,resizeEdge:"bottom",onHeightChange:i,isFirstPanel:!0},e.createElement("div",{style:{backgroundColor:"#E3F2FD",padding:"12px",height:"100%",border:"1px solid #90CAF9"}},e.createElement("div",{style:{fontSize:"14px",fontWeight:600}},"Panel 1"),e.createElement("div",{style:{fontSize:"12px",color:"#1976D2"}},"Height: ",t,"px"))),e.createElement(n,{initialHeight:o,minHeight:44,resizeEdge:"bottom",onHeightChange:P},e.createElement("div",{style:{backgroundColor:"#F3E5F5",padding:"12px",height:"100%",border:"1px solid #CE93D8"}},e.createElement("div",{style:{fontSize:"14px",fontWeight:600}},"Panel 2"),e.createElement("div",{style:{fontSize:"12px",color:"#7B1FA2"}},"Height: ",o,"px"))),e.createElement(n,{initialHeight:h,minHeight:44,resizeEdge:"bottom",onHeightChange:D},e.createElement("div",{style:{backgroundColor:"#E8F5E9",padding:"12px",height:"100%",border:"1px solid #A5D6A7"}},e.createElement("div",{style:{fontSize:"14px",fontWeight:600}},"Panel 3"),e.createElement("div",{style:{fontSize:"12px",color:"#388E3C"}},"Height: ",h,"px"))))}};var p,c,m;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => {
    const [height, setHeight] = useState(114);
    return <div style={{
      width: '300px'
    }}>
        <ResizablePanel initialHeight={height} minHeight={44} resizeEdge="bottom" onHeightChange={setHeight}>
          <div style={{
          backgroundColor: '#EEEEF1',
          padding: '12px',
          height: '100%',
          border: '1px solid #CDCED7',
          borderRadius: '4px'
        }}>
            <div style={{
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 600
          }}>Resizable Content</div>
            <div style={{
            fontSize: '12px',
            color: '#666'
          }}>
              Height: {height}px
            </div>
            <div style={{
            fontSize: '11px',
            color: '#999',
            marginTop: '8px'
          }}>
              Drag the bottom edge to resize
            </div>
          </div>
        </ResizablePanel>
      </div>;
  }
}`,...(m=(c=a.parameters)==null?void 0:c.docs)==null?void 0:m.source}}};var x,u,E;s.parameters={...s.parameters,docs:{...(x=s.parameters)==null?void 0:x.docs,source:{originalSource:`{
  render: () => {
    const [height, setHeight] = useState(114);
    const getHeightVariant = (): 'default' | 'truncated' | 'collapsed' => {
      if (height < 44) return 'collapsed';
      if (height < 80) return 'truncated';
      return 'default';
    };
    return <div style={{
      width: '240px',
      backgroundColor: '#f5f5f5',
      padding: '16px'
    }}>
        <ResizablePanel initialHeight={height} minHeight={44} resizeEdge="bottom" onHeightChange={setHeight}>
          <TrackControlPanel trackName="Audio Track" height={getHeightVariant()} state="idle" />
        </ResizablePanel>
        <div style={{
        marginTop: '16px',
        fontSize: '12px',
        color: '#666'
      }}>
          Current height: {height}px ({getHeightVariant()})
        </div>
      </div>;
  }
}`,...(E=(u=s.parameters)==null?void 0:u.docs)==null?void 0:E.source}}};var z,H,v;d.parameters={...d.parameters,docs:{...(z=d.parameters)==null?void 0:z.docs,source:{originalSource:`{
  render: () => {
    const [height, setHeight] = useState(100);
    return <div style={{
      width: '300px'
    }}>
        <ResizablePanel initialHeight={height} minHeight={60} maxHeight={200} resizeEdge="bottom" onHeightChange={setHeight}>
          <div style={{
          backgroundColor: '#EEEEF1',
          padding: '12px',
          height: '100%',
          border: '1px solid #CDCED7',
          borderRadius: '4px'
        }}>
            <div style={{
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 600
          }}>Constrained Resize</div>
            <div style={{
            fontSize: '12px',
            color: '#666'
          }}>
              Height: {height}px
            </div>
            <div style={{
            fontSize: '11px',
            color: '#999',
            marginTop: '8px'
          }}>
              Min: 60px, Max: 200px
            </div>
          </div>
        </ResizablePanel>
      </div>;
  }
}`,...(v=(H=d.parameters)==null?void 0:H.docs)==null?void 0:v.source}}};var b,f,y;l.parameters={...l.parameters,docs:{...(b=l.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    minHeight: 60,
    resizeEdge: 'bottom',
    resizeThreshold: 8
  },
  render: args => {
    const [height, setHeight] = useState(100);
    return <div style={{
      width: '300px'
    }}>
        <ResizablePanel {...args} initialHeight={height} onHeightChange={setHeight}>
          <div style={{
          backgroundColor: '#E3F2FD',
          padding: '12px',
          height: '100%',
          border: '1px solid #90CAF9',
          borderRadius: '4px'
        }}>
            <div style={{
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 600
          }}>Bottom Edge Resize</div>
            <div style={{
            fontSize: '12px',
            color: '#1976D2'
          }}>
              Drag bottom edge ({args.resizeThreshold}px zone)
            </div>
          </div>
        </ResizablePanel>
      </div>;
  }
}`,...(y=(f=l.parameters)==null?void 0:f.docs)==null?void 0:y.source}}};var C,S,R;g.parameters={...g.parameters,docs:{...(C=g.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => {
    const [height1, setHeight1] = useState(80);
    const [height2, setHeight2] = useState(120);
    const [height3, setHeight3] = useState(100);
    return <div style={{
      width: '300px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
        <ResizablePanel initialHeight={height1} minHeight={44} resizeEdge="bottom" onHeightChange={setHeight1} isFirstPanel={true}>
          <div style={{
          backgroundColor: '#E3F2FD',
          padding: '12px',
          height: '100%',
          border: '1px solid #90CAF9'
        }}>
            <div style={{
            fontSize: '14px',
            fontWeight: 600
          }}>Panel 1</div>
            <div style={{
            fontSize: '12px',
            color: '#1976D2'
          }}>Height: {height1}px</div>
          </div>
        </ResizablePanel>

        <ResizablePanel initialHeight={height2} minHeight={44} resizeEdge="bottom" onHeightChange={setHeight2}>
          <div style={{
          backgroundColor: '#F3E5F5',
          padding: '12px',
          height: '100%',
          border: '1px solid #CE93D8'
        }}>
            <div style={{
            fontSize: '14px',
            fontWeight: 600
          }}>Panel 2</div>
            <div style={{
            fontSize: '12px',
            color: '#7B1FA2'
          }}>Height: {height2}px</div>
          </div>
        </ResizablePanel>

        <ResizablePanel initialHeight={height3} minHeight={44} resizeEdge="bottom" onHeightChange={setHeight3}>
          <div style={{
          backgroundColor: '#E8F5E9',
          padding: '12px',
          height: '100%',
          border: '1px solid #A5D6A7'
        }}>
            <div style={{
            fontSize: '14px',
            fontWeight: 600
          }}>Panel 3</div>
            <div style={{
            fontSize: '12px',
            color: '#388E3C'
          }}>Height: {height3}px</div>
          </div>
        </ResizablePanel>
      </div>;
  }
}`,...(R=(S=g.parameters)==null?void 0:S.docs)==null?void 0:R.source}}};const B=["Default","WithTrackControlPanel","MinMaxConstraints","BottomEdge","MultipleResizablePanels"];export{l as BottomEdge,a as Default,d as MinMaxConstraints,g as MultipleResizablePanels,s as WithTrackControlPanel,B as __namedExportsOrder,W as default};
