import{R as e}from"./index-yIsmwZOr.js";import{N as t,t as n,T as q}from"./index-DR-q5OqV.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const M={title:"Components/Toast",component:t,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{type:{control:"select",options:["success","error","warning","info"],description:"Toast type/variant"},title:{control:"text",description:"Toast title"},description:{control:"text",description:"Toast description/message"},showCloseButton:{control:"boolean",description:"Show dismiss button"}}},r={args:{id:"success-1",type:"success",title:"Success!",description:"Operation completed successfully.",showCloseButton:!0}},s={args:{id:"error-1",type:"error",title:"Error!",description:"Something went wrong. Please try again.",showCloseButton:!0}},i={args:{id:"warning-1",type:"warning",title:"Warning!",description:"This action may have unintended consequences.",showCloseButton:!0}},a={args:{id:"info-1",type:"info",title:"Info",description:"Here is some helpful information for you.",showCloseButton:!0}},c={args:{id:"with-actions-1",type:"success",title:"Success!",description:"All saved changes will now update to the cloud. You can manage this file from your uploaded projects page on audio.com",actions:[{label:"View on audio.com",onClick:()=>alert("View clicked!")}],showCloseButton:!0}},l={args:{id:"title-only-1",type:"info",title:"Quick notification",showCloseButton:!0}},d={render:()=>e.createElement("div",{style:{padding:"40px"}},e.createElement("div",{style:{marginBottom:"24px",textAlign:"center"}},e.createElement("h3",{style:{marginBottom:"8px",fontFamily:"Inter, sans-serif",fontSize:"14px"}},"Toast Notification Demo"),e.createElement("p",{style:{fontSize:"12px",color:"#666",fontFamily:"Inter, sans-serif"}},"Click buttons to show toasts in the bottom-right corner")),e.createElement("div",{style:{display:"flex",gap:"12px",flexWrap:"wrap",justifyContent:"center"}},e.createElement("button",{onClick:()=>n.success("Success!","Operation completed successfully."),style:{padding:"8px 16px",fontSize:"13px",fontFamily:"Inter, sans-serif",cursor:"pointer",backgroundColor:"#4caf50",color:"white",border:"none",borderRadius:"4px"}},"Show Success"),e.createElement("button",{onClick:()=>n.error("Error!","Something went wrong. Please try again."),style:{padding:"8px 16px",fontSize:"13px",fontFamily:"Inter, sans-serif",cursor:"pointer",backgroundColor:"#f44336",color:"white",border:"none",borderRadius:"4px"}},"Show Error"),e.createElement("button",{onClick:()=>n.warning("Warning!","This action may have consequences."),style:{padding:"8px 16px",fontSize:"13px",fontFamily:"Inter, sans-serif",cursor:"pointer",backgroundColor:"#ff9800",color:"white",border:"none",borderRadius:"4px"}},"Show Warning"),e.createElement("button",{onClick:()=>n.info("Info","Here is some helpful information."),style:{padding:"8px 16px",fontSize:"13px",fontFamily:"Inter, sans-serif",cursor:"pointer",backgroundColor:"#2196f3",color:"white",border:"none",borderRadius:"4px"}},"Show Info"),e.createElement("button",{onClick:()=>n.success("Success!","All saved changes will now update to the cloud.",[{label:"View details",onClick:()=>alert("Details clicked!")}]),style:{padding:"8px 16px",fontSize:"13px",fontFamily:"Inter, sans-serif",cursor:"pointer",backgroundColor:"#9c27b0",color:"white",border:"none",borderRadius:"4px"}},"Toast with Actions"),e.createElement("button",{onClick:()=>{for(let o=0;o<3;o++)setTimeout(()=>{n.info(`Toast ${o+1}`,`This is toast number ${o+1}`)},o*500)},style:{padding:"8px 16px",fontSize:"13px",fontFamily:"Inter, sans-serif",cursor:"pointer",backgroundColor:"#607d8b",color:"white",border:"none",borderRadius:"4px"}},"Show Multiple (Stacking)")),e.createElement(q,{maxToasts:5}))},p={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",padding:"20px"}},e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",color:"#666",fontFamily:"Inter, sans-serif"}},"Success"),e.createElement(t,{id:"success-demo",type:"success",title:"Success!",description:"Operation completed successfully.",showCloseButton:!0})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",color:"#666",fontFamily:"Inter, sans-serif"}},"Error"),e.createElement(t,{id:"error-demo",type:"error",title:"Error!",description:"Something went wrong. Please try again.",showCloseButton:!0})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",color:"#666",fontFamily:"Inter, sans-serif"}},"Warning"),e.createElement(t,{id:"warning-demo",type:"warning",title:"Warning!",description:"This action may have unintended consequences.",showCloseButton:!0})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",color:"#666",fontFamily:"Inter, sans-serif"}},"Info"),e.createElement(t,{id:"info-demo",type:"info",title:"Info",description:"Here is some helpful information for you.",showCloseButton:!0})))};var u,m,f;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    id: 'success-1',
    type: 'success',
    title: 'Success!',
    description: 'Operation completed successfully.',
    showCloseButton: true
  }
}`,...(f=(m=r.parameters)==null?void 0:m.docs)==null?void 0:f.source}}};var g,y,x;s.parameters={...s.parameters,docs:{...(g=s.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    id: 'error-1',
    type: 'error',
    title: 'Error!',
    description: 'Something went wrong. Please try again.',
    showCloseButton: true
  }
}`,...(x=(y=s.parameters)==null?void 0:y.docs)==null?void 0:x.source}}};var h,w,b;i.parameters={...i.parameters,docs:{...(h=i.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    id: 'warning-1',
    type: 'warning',
    title: 'Warning!',
    description: 'This action may have unintended consequences.',
    showCloseButton: true
  }
}`,...(b=(w=i.parameters)==null?void 0:w.docs)==null?void 0:b.source}}};var S,C,v;a.parameters={...a.parameters,docs:{...(S=a.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    id: 'info-1',
    type: 'info',
    title: 'Info',
    description: 'Here is some helpful information for you.',
    showCloseButton: true
  }
}`,...(v=(C=a.parameters)==null?void 0:C.docs)==null?void 0:v.source}}};var k,E,I;c.parameters={...c.parameters,docs:{...(k=c.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    id: 'with-actions-1',
    type: 'success',
    title: 'Success!',
    description: 'All saved changes will now update to the cloud. You can manage this file from your uploaded projects page on audio.com',
    actions: [{
      label: 'View on audio.com',
      onClick: () => alert('View clicked!')
    }],
    showCloseButton: true
  }
}`,...(I=(E=c.parameters)==null?void 0:E.docs)==null?void 0:I.source}}};var T,B,z;l.parameters={...l.parameters,docs:{...(T=l.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    id: 'title-only-1',
    type: 'info',
    title: 'Quick notification',
    showCloseButton: true
  }
}`,...(z=(B=l.parameters)==null?void 0:B.docs)==null?void 0:z.source}}};var F,W,R;d.parameters={...d.parameters,docs:{...(F=d.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: '40px'
  }}>
      <div style={{
      marginBottom: '24px',
      textAlign: 'center'
    }}>
        <h3 style={{
        marginBottom: '8px',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px'
      }}>
          Toast Notification Demo
        </h3>
        <p style={{
        fontSize: '12px',
        color: '#666',
        fontFamily: 'Inter, sans-serif'
      }}>
          Click buttons to show toasts in the bottom-right corner
        </p>
      </div>

      <div style={{
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    }}>
        <button onClick={() => toast.success('Success!', 'Operation completed successfully.')} style={{
        padding: '8px 16px',
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        backgroundColor: '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }}>
          Show Success
        </button>

        <button onClick={() => toast.error('Error!', 'Something went wrong. Please try again.')} style={{
        padding: '8px 16px',
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }}>
          Show Error
        </button>

        <button onClick={() => toast.warning('Warning!', 'This action may have consequences.')} style={{
        padding: '8px 16px',
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        backgroundColor: '#ff9800',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }}>
          Show Warning
        </button>

        <button onClick={() => toast.info('Info', 'Here is some helpful information.')} style={{
        padding: '8px 16px',
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }}>
          Show Info
        </button>

        <button onClick={() => toast.success('Success!', 'All saved changes will now update to the cloud.', [{
        label: 'View details',
        onClick: () => alert('Details clicked!')
      }])} style={{
        padding: '8px 16px',
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        backgroundColor: '#9c27b0',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }}>
          Toast with Actions
        </button>

        <button onClick={() => {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            toast.info(\`Toast \${i + 1}\`, \`This is toast number \${i + 1}\`);
          }, i * 500);
        }
      }} style={{
        padding: '8px 16px',
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        backgroundColor: '#607d8b',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }}>
          Show Multiple (Stacking)
        </button>
      </div>

      <ToastContainer maxToasts={5} />
    </div>
}`,...(R=(W=d.parameters)==null?void 0:W.docs)==null?void 0:R.source}}};var A,O,D;p.parameters={...p.parameters,docs:{...(A=p.parameters)==null?void 0:A.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px'
  }}>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        color: '#666',
        fontFamily: 'Inter, sans-serif'
      }}>
          Success
        </div>
        <Toast id="success-demo" type="success" title="Success!" description="Operation completed successfully." showCloseButton />
      </div>

      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        color: '#666',
        fontFamily: 'Inter, sans-serif'
      }}>
          Error
        </div>
        <Toast id="error-demo" type="error" title="Error!" description="Something went wrong. Please try again." showCloseButton />
      </div>

      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        color: '#666',
        fontFamily: 'Inter, sans-serif'
      }}>
          Warning
        </div>
        <Toast id="warning-demo" type="warning" title="Warning!" description="This action may have unintended consequences." showCloseButton />
      </div>

      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        color: '#666',
        fontFamily: 'Inter, sans-serif'
      }}>
          Info
        </div>
        <Toast id="info-demo" type="info" title="Info" description="Here is some helpful information for you." showCloseButton />
      </div>
    </div>
}`,...(D=(O=p.parameters)==null?void 0:O.docs)==null?void 0:D.source}}};const Q=["Success","Error","Warning","Info","WithActions","TitleOnly","InteractiveDemo","AllTypes"];export{p as AllTypes,s as Error,a as Info,d as InteractiveDemo,r as Success,l as TitleOnly,i as Warning,c as WithActions,Q as __namedExportsOrder,M as default};
