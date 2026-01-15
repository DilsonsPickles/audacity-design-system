import{R as e}from"./index-yIsmwZOr.js";import{M as o}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const W={title:"Layout/TimelineRuler",component:o,parameters:{layout:"fullscreen"},tags:["autodocs"],argTypes:{pixelsPerSecond:{control:{type:"range",min:10,max:200,step:10},description:"Zoom level - pixels per second"},totalDuration:{control:{type:"range",min:10,max:120,step:10},description:"Total duration in seconds"},width:{control:{type:"range",min:800,max:5e3,step:100},description:"Width of the ruler in pixels"},height:{control:{type:"range",min:30,max:80,step:5},description:"Height of the ruler"},scrollX:{control:{type:"range",min:0,max:1e3,step:10},description:"Horizontal scroll offset (use 0 for native CSS scrolling)"},backgroundColor:{control:"color",description:"Background color"},textColor:{control:"color",description:"Text color"},lineColor:{control:"color",description:"Divider and major tick color"},tickColor:{control:"color",description:"Minor tick color"}}},r={args:{pixelsPerSecond:100,scrollX:0,totalDuration:50,width:5e3,height:40,leftPadding:12},render:t=>e.createElement("div",{style:{width:"100%",height:"100vh",overflow:"auto",backgroundColor:"#212433"}},e.createElement("div",{style:{minWidth:`${t.width}px`}},e.createElement(o,{...t})))},n={args:{pixelsPerSecond:200,scrollX:0,totalDuration:30,width:6e3,height:40,leftPadding:12},render:t=>e.createElement("div",{style:{width:"100%",height:"100vh",overflow:"auto",backgroundColor:"#212433"}},e.createElement("div",{style:{minWidth:`${t.width}px`}},e.createElement(o,{...t})))},i={args:{pixelsPerSecond:50,scrollX:0,totalDuration:100,width:5e3,height:40,leftPadding:12},render:t=>e.createElement("div",{style:{width:"100%",height:"100vh",overflow:"auto",backgroundColor:"#212433"}},e.createElement("div",{style:{minWidth:`${t.width}px`}},e.createElement(o,{...t})))},l={args:{pixelsPerSecond:100,scrollX:0,totalDuration:50,width:5e3,height:30,leftPadding:12},render:t=>e.createElement("div",{style:{width:"100%",height:"100vh",overflow:"auto",backgroundColor:"#212433"}},e.createElement("div",{style:{minWidth:`${t.width}px`}},e.createElement(o,{...t})))},a={args:{pixelsPerSecond:100,scrollX:0,totalDuration:50,width:5e3,height:40,leftPadding:12,backgroundColor:"#1a1a2e",textColor:"#ffffff",lineColor:"#16213e",tickColor:"#0f3460"},render:t=>e.createElement("div",{style:{width:"100%",height:"100vh",overflow:"auto",backgroundColor:"#0f0e17"}},e.createElement("div",{style:{minWidth:`${t.width}px`}},e.createElement(o,{...t})))};var d,s,c;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    pixelsPerSecond: 100,
    scrollX: 0,
    totalDuration: 50,
    width: 5000,
    height: 40,
    leftPadding: 12
  },
  render: args => <div style={{
    width: '100%',
    height: '100vh',
    overflow: 'auto',
    backgroundColor: '#212433'
  }}>
      <div style={{
      minWidth: \`\${args.width}px\`
    }}>
        <TimelineRuler {...args} />
      </div>
    </div>
}`,...(c=(s=r.parameters)==null?void 0:s.docs)==null?void 0:c.source}}};var h,m,g;n.parameters={...n.parameters,docs:{...(h=n.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    pixelsPerSecond: 200,
    scrollX: 0,
    totalDuration: 30,
    width: 6000,
    height: 40,
    leftPadding: 12
  },
  render: args => <div style={{
    width: '100%',
    height: '100vh',
    overflow: 'auto',
    backgroundColor: '#212433'
  }}>
      <div style={{
      minWidth: \`\${args.width}px\`
    }}>
        <TimelineRuler {...args} />
      </div>
    </div>
}`,...(g=(m=n.parameters)==null?void 0:m.docs)==null?void 0:g.source}}};var p,u,v;i.parameters={...i.parameters,docs:{...(p=i.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    pixelsPerSecond: 50,
    scrollX: 0,
    totalDuration: 100,
    width: 5000,
    height: 40,
    leftPadding: 12
  },
  render: args => <div style={{
    width: '100%',
    height: '100vh',
    overflow: 'auto',
    backgroundColor: '#212433'
  }}>
      <div style={{
      minWidth: \`\${args.width}px\`
    }}>
        <TimelineRuler {...args} />
      </div>
    </div>
}`,...(v=(u=i.parameters)==null?void 0:u.docs)==null?void 0:v.source}}};var f,w,x;l.parameters={...l.parameters,docs:{...(f=l.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    pixelsPerSecond: 100,
    scrollX: 0,
    totalDuration: 50,
    width: 5000,
    height: 30,
    leftPadding: 12
  },
  render: args => <div style={{
    width: '100%',
    height: '100vh',
    overflow: 'auto',
    backgroundColor: '#212433'
  }}>
      <div style={{
      minWidth: \`\${args.width}px\`
    }}>
        <TimelineRuler {...args} />
      </div>
    </div>
}`,...(x=(w=l.parameters)==null?void 0:w.docs)==null?void 0:x.source}}};var C,y,P;a.parameters={...a.parameters,docs:{...(C=a.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    pixelsPerSecond: 100,
    scrollX: 0,
    totalDuration: 50,
    width: 5000,
    height: 40,
    leftPadding: 12,
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
    lineColor: '#16213e',
    tickColor: '#0f3460'
  },
  render: args => <div style={{
    width: '100%',
    height: '100vh',
    overflow: 'auto',
    backgroundColor: '#0f0e17'
  }}>
      <div style={{
      minWidth: \`\${args.width}px\`
    }}>
        <TimelineRuler {...args} />
      </div>
    </div>
}`,...(P=(y=a.parameters)==null?void 0:y.docs)==null?void 0:P.source}}};const X=["Default","Zoomed","ZoomedOut","Compact","CustomColors"];export{l as Compact,a as CustomColors,r as Default,n as Zoomed,i as ZoomedOut,X as __namedExportsOrder,W as default};
