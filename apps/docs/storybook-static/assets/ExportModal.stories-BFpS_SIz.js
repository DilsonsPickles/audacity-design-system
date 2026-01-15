import{R as o,r as x}from"./index-yIsmwZOr.js";import{n as m,o as f,B as M}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const v={title:"Components/ExportModal",component:m,parameters:{layout:"centered"},tags:["autodocs"],decorators:[e=>o.createElement(f,null,o.createElement(e,null))]};function O(e){const[i,r]=x.useState(!1),E=u=>{console.log("Export settings:",u)},g=()=>{console.log("Edit metadata clicked")};return o.createElement("div",null,o.createElement(M,{onClick:()=>r(!0)},"Open Export Dialog"),o.createElement(m,{...e,isOpen:i,onClose:()=>r(!1),onExport:E,onEditMetadata:g}))}const t={render:e=>o.createElement(O,{...e}),args:{}},a={args:{isOpen:!0,onClose:()=>console.log("Close"),onExport:e=>console.log("Export:",e),onEditMetadata:()=>console.log("Edit metadata")}};var n,s,l;t.parameters={...t.parameters,docs:{...(n=t.parameters)==null?void 0:n.docs,source:{originalSource:`{
  render: args => <ExportModalDemo {...args} />,
  args: {}
}`,...(l=(s=t.parameters)==null?void 0:s.docs)==null?void 0:l.source}}};var c,p,d;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    isOpen: true,
    onClose: () => console.log('Close'),
    onExport: (settings: ExportSettings) => console.log('Export:', settings),
    onEditMetadata: () => console.log('Edit metadata')
  }
}`,...(d=(p=a.parameters)==null?void 0:p.docs)==null?void 0:d.source}}};const B=["Default","Open"];export{t as Default,a as Open,B as __namedExportsOrder,v as default};
