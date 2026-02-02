import{R as t,z as m,m as x,r as M,B as O}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const S={title:"Components/ExportModal",component:m,parameters:{layout:"centered"},tags:["autodocs"],decorators:[e=>t.createElement(x,null,t.createElement(e,null))]};function f(e){const[E,r]=M.useState(!1),i=u=>{console.log("Export settings:",u)},g=()=>{console.log("Edit metadata clicked")};return t.createElement("div",null,t.createElement(O,{onClick:()=>r(!0)},"Open Export Dialog"),t.createElement(m,{...e,isOpen:E,onClose:()=>r(!1),onExport:i,onEditMetadata:g}))}const o={render:e=>t.createElement(f,{...e}),args:{}},a={args:{isOpen:!0,onClose:()=>console.log("Close"),onExport:e=>console.log("Export:",e),onEditMetadata:()=>console.log("Edit metadata")}};var s,n,l;o.parameters={...o.parameters,docs:{...(s=o.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: args => <ExportModalDemo {...args} />,
  args: {}
}`,...(l=(n=o.parameters)==null?void 0:n.docs)==null?void 0:l.source}}};var c,d,p;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    isOpen: true,
    onClose: () => console.log('Close'),
    onExport: (settings: ExportSettings) => console.log('Export:', settings),
    onEditMetadata: () => console.log('Edit metadata')
  }
}`,...(p=(d=a.parameters)==null?void 0:d.docs)==null?void 0:p.source}}};const h=["Default","Open"];export{o as Default,a as Open,h as __namedExportsOrder,S as default};
