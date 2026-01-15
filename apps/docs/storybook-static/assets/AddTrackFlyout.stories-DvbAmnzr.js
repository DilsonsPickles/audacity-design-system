import{r,R as e}from"./index-yIsmwZOr.js";import{A as a}from"./index-DR-q5OqV.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const H={title:"Components/AddTrackFlyout",component:a,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{isOpen:{control:"boolean",description:"Whether the flyout is open"},showMidiOption:{control:"boolean",description:"Whether to show the MIDI option (default: false)"},x:{control:"number",description:"X position for the flyout (in pixels)"},y:{control:"number",description:"Y position for the flyout (in pixels)"}}},c={args:{isOpen:!0,x:200,y:100,showMidiOption:!1,onSelectTrackType:t=>{console.log("Selected track type:",t)},onClose:()=>{console.log("Flyout closed")}}},p={args:{isOpen:!0,x:200,y:100,showMidiOption:!0,onSelectTrackType:t=>{console.log("Selected track type:",t)},onClose:()=>{console.log("Flyout closed")}}},d={render:()=>{const[t,n]=r.useState(!1),[i,g]=r.useState({x:0,y:0}),[l,x]=r.useState(""),m=o=>{const s=o.currentTarget.getBoundingClientRect();g({x:s.left+s.width/2-96,y:s.bottom+8}),n(!t)},S=o=>{x(o),n(!1)};return e.createElement("div",{style:{padding:"100px",textAlign:"center"}},e.createElement("button",{onClick:m,style:{padding:"8px 16px",background:"rgba(194, 196, 207, 0.7)",border:"none",borderRadius:"4px",cursor:"pointer",fontSize:"14px",fontFamily:"Inter, sans-serif"}},"Add Track"),l&&e.createElement("div",{style:{marginTop:"16px",fontSize:"14px",color:"#14151a"}},"Last selected: ",e.createElement("strong",null,l)),e.createElement(a,{isOpen:t,x:i.x,y:i.y,showMidiOption:!1,onSelectTrackType:S,onClose:()=>n(!1)}))}},u={render:()=>{const[t,n]=r.useState(!1),[i,g]=r.useState({x:0,y:0}),[l,x]=r.useState(""),m=o=>{const s=o.currentTarget.getBoundingClientRect();g({x:s.left+s.width/2-96,y:s.bottom+8}),n(!t)},S=o=>{x(o),n(!1)};return e.createElement("div",{style:{padding:"100px",textAlign:"center"}},e.createElement("button",{onClick:m,style:{padding:"8px 16px",background:"rgba(194, 196, 207, 0.7)",border:"none",borderRadius:"4px",cursor:"pointer",fontSize:"14px",fontFamily:"Inter, sans-serif"}},"Add Track"),l&&e.createElement("div",{style:{marginTop:"16px",fontSize:"14px",color:"#14151a"}},"Last selected: ",e.createElement("strong",null,l)),e.createElement(a,{isOpen:t,x:i.x,y:i.y,showMidiOption:!0,onSelectTrackType:S,onClose:()=>n(!1)}))}},y={render:()=>e.createElement("div",{style:{display:"flex",gap:"100px",padding:"100px"}},e.createElement("div",null,e.createElement("div",{style:{marginBottom:"16px",fontSize:"14px",fontWeight:"bold"}},"3 Options"),e.createElement(a,{isOpen:!0,x:0,y:0,showMidiOption:!1,onSelectTrackType:t=>console.log("Selected:",t),onClose:()=>{}})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"16px",fontSize:"14px",fontWeight:"bold"}},"4 Options (with MIDI)"),e.createElement(a,{isOpen:!0,x:0,y:0,showMidiOption:!0,onSelectTrackType:t=>console.log("Selected:",t),onClose:()=>{}})))};var f,T,h;c.parameters={...c.parameters,docs:{...(f=c.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    isOpen: true,
    x: 200,
    y: 100,
    showMidiOption: false,
    onSelectTrackType: type => {
      console.log('Selected track type:', type);
    },
    onClose: () => {
      console.log('Flyout closed');
    }
  }
}`,...(h=(T=c.parameters)==null?void 0:T.docs)==null?void 0:h.source}}};var O,k,b;p.parameters={...p.parameters,docs:{...(O=p.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    isOpen: true,
    x: 200,
    y: 100,
    showMidiOption: true,
    onSelectTrackType: type => {
      console.log('Selected track type:', type);
    },
    onClose: () => {
      console.log('Flyout closed');
    }
  }
}`,...(b=(k=p.parameters)==null?void 0:k.docs)==null?void 0:b.source}}};var v,C,I;d.parameters={...d.parameters,docs:{...(v=d.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({
      x: 0,
      y: 0
    });
    const [lastSelected, setLastSelected] = useState<string>('');
    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2 - 96,
        // Center the flyout under the button (192px / 2 = 96)
        y: rect.bottom + 8 // 8px gap below button
      });
      setIsOpen(!isOpen);
    };
    const handleSelectTrackType = (type: string) => {
      setLastSelected(type);
      setIsOpen(false);
    };
    return <div style={{
      padding: '100px',
      textAlign: 'center'
    }}>
        <button onClick={handleButtonClick} style={{
        padding: '8px 16px',
        background: 'rgba(194, 196, 207, 0.7)',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif'
      }}>
          Add Track
        </button>

        {lastSelected && <div style={{
        marginTop: '16px',
        fontSize: '14px',
        color: '#14151a'
      }}>
            Last selected: <strong>{lastSelected}</strong>
          </div>}

        <AddTrackFlyout isOpen={isOpen} x={position.x} y={position.y} showMidiOption={false} onSelectTrackType={handleSelectTrackType} onClose={() => setIsOpen(false)} />
      </div>;
  }
}`,...(I=(C=d.parameters)==null?void 0:C.docs)==null?void 0:I.source}}};var E,M,w;u.parameters={...u.parameters,docs:{...(E=u.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({
      x: 0,
      y: 0
    });
    const [lastSelected, setLastSelected] = useState<string>('');
    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2 - 96,
        // Center the flyout under the button
        y: rect.bottom + 8
      });
      setIsOpen(!isOpen);
    };
    const handleSelectTrackType = (type: string) => {
      setLastSelected(type);
      setIsOpen(false);
    };
    return <div style={{
      padding: '100px',
      textAlign: 'center'
    }}>
        <button onClick={handleButtonClick} style={{
        padding: '8px 16px',
        background: 'rgba(194, 196, 207, 0.7)',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif'
      }}>
          Add Track
        </button>

        {lastSelected && <div style={{
        marginTop: '16px',
        fontSize: '14px',
        color: '#14151a'
      }}>
            Last selected: <strong>{lastSelected}</strong>
          </div>}

        <AddTrackFlyout isOpen={isOpen} x={position.x} y={position.y} showMidiOption={true} onSelectTrackType={handleSelectTrackType} onClose={() => setIsOpen(false)} />
      </div>;
  }
}`,...(w=(M=u.parameters)==null?void 0:M.docs)==null?void 0:w.source}}};var B,F,A;y.parameters={...y.parameters,docs:{...(B=y.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => {
    return <div style={{
      display: 'flex',
      gap: '100px',
      padding: '100px'
    }}>
        <div>
          <div style={{
          marginBottom: '16px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
            3 Options
          </div>
          <AddTrackFlyout isOpen={true} x={0} y={0} showMidiOption={false} onSelectTrackType={type => console.log('Selected:', type)} onClose={() => {}} />
        </div>

        <div>
          <div style={{
          marginBottom: '16px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
            4 Options (with MIDI)
          </div>
          <AddTrackFlyout isOpen={true} x={0} y={0} showMidiOption={true} onSelectTrackType={type => console.log('Selected:', type)} onClose={() => {}} />
        </div>
      </div>;
  }
}`,...(A=(F=y.parameters)==null?void 0:F.docs)==null?void 0:A.source}}};const _=["ThreeOptions","FourOptions","Interactive","InteractiveWithMidi","Comparison"];export{y as Comparison,p as FourOptions,d as Interactive,u as InteractiveWithMidi,c as ThreeOptions,_ as __namedExportsOrder,H as default};
