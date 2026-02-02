import{ah as s,r as u,R as e}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const g={title:"Components/WelcomeDialog",component:s,parameters:{layout:"centered"},tags:["autodocs"]},o={render:()=>{const[t,n]=u.useState(!1);return e.createElement("div",null,e.createElement("button",{onClick:()=>n(!0),style:{padding:"8px 16px",backgroundColor:"#677ce4",color:"white",border:"none",borderRadius:"4px",cursor:"pointer"}},"Open Welcome Dialog (macOS)"),e.createElement(s,{isOpen:t,onClose:()=>n(!1)}))}},r={render:()=>{const[t,n]=u.useState(!1);return e.createElement("div",null,e.createElement("button",{onClick:()=>n(!0),style:{padding:"8px 16px",backgroundColor:"#677ce4",color:"white",border:"none",borderRadius:"4px",cursor:"pointer"}},"Open Welcome Dialog (Windows)"),e.createElement(s,{isOpen:t,onClose:()=>n(!1)}))}};var a,c,l;o.parameters={...o.parameters,docs:{...(a=o.parameters)==null?void 0:a.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return <div>
        <button onClick={() => setIsOpen(true)} style={{
        padding: '8px 16px',
        backgroundColor: '#677ce4',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}>
          Open Welcome Dialog (macOS)
        </button>
        <WelcomeDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>;
  }
}`,...(l=(c=o.parameters)==null?void 0:c.docs)==null?void 0:l.source}}};var p,i,d;r.parameters={...r.parameters,docs:{...(p=r.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return <div>
        <button onClick={() => setIsOpen(true)} style={{
        padding: '8px 16px',
        backgroundColor: '#677ce4',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}>
          Open Welcome Dialog (Windows)
        </button>
        <WelcomeDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>;
  }
}`,...(d=(i=r.parameters)==null?void 0:i.docs)==null?void 0:d.source}}};const b=["macOS","Windows"];export{r as Windows,b as __namedExportsOrder,g as default,o as macOS};
