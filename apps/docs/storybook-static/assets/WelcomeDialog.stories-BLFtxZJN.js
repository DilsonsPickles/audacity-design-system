import{r as u,R as e}from"./index-yIsmwZOr.js";import{_ as s}from"./index-DR-q5OqV.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const W={title:"Components/WelcomeDialog",component:s,parameters:{layout:"centered"},tags:["autodocs"]},o={render:()=>{const[t,n]=u.useState(!1);return e.createElement("div",null,e.createElement("button",{onClick:()=>n(!0),style:{padding:"8px 16px",backgroundColor:"#677ce4",color:"white",border:"none",borderRadius:"4px",cursor:"pointer"}},"Open Welcome Dialog (macOS)"),e.createElement(s,{isOpen:t,onClose:()=>n(!1)}))}},r={render:()=>{const[t,n]=u.useState(!1);return e.createElement("div",null,e.createElement("button",{onClick:()=>n(!0),style:{padding:"8px 16px",backgroundColor:"#677ce4",color:"white",border:"none",borderRadius:"4px",cursor:"pointer"}},"Open Welcome Dialog (Windows)"),e.createElement(s,{isOpen:t,onClose:()=>n(!1)}))}};var a,c,p;o.parameters={...o.parameters,docs:{...(a=o.parameters)==null?void 0:a.docs,source:{originalSource:`{
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
}`,...(p=(c=o.parameters)==null?void 0:c.docs)==null?void 0:p.source}}};var l,i,d;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
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
}`,...(d=(i=r.parameters)==null?void 0:i.docs)==null?void 0:d.source}}};const f=["macOS","Windows"];export{r as Windows,f as __namedExportsOrder,W as default,o as macOS};
