import{R as r,r as l}from"./index-yIsmwZOr.js";import{s as p,B}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const b={title:"Components/PreferencesModal",component:p,parameters:{layout:"centered"},tags:["autodocs"]};function g(e){const[u,a]=l.useState(!1),[y,w]=l.useState("general");return r.createElement("div",null,r.createElement(B,{onClick:()=>a(!0)},"Open Preferences"),r.createElement(p,{...e,isOpen:u,onClose:()=>a(!1),currentPage:y,onPageChange:w}))}const n={render:e=>r.createElement(g,{...e}),args:{}},s={render:e=>r.createElement(g,{...e}),args:{currentPage:"general"}},t={render:e=>r.createElement(g,{...e}),args:{currentPage:"appearance"}},o={render:e=>r.createElement(g,{...e}),args:{currentPage:"audio-settings"}},c={render:e=>{const[u,a]=l.useState("general");return r.createElement(p,{...e,isOpen:!0,onClose:()=>console.log("Close clicked"),currentPage:u,onPageChange:a})},args:{}};var d,m,P;n.parameters={...n.parameters,docs:{...(d=n.parameters)==null?void 0:d.docs,source:{originalSource:`{
  render: args => <PreferencesModalDemo {...args} />,
  args: {}
}`,...(P=(m=n.parameters)==null?void 0:m.docs)==null?void 0:P.source}}};var i,f,C;s.parameters={...s.parameters,docs:{...(i=s.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: args => <PreferencesModalDemo {...args} />,
  args: {
    currentPage: 'general'
  }
}`,...(C=(f=s.parameters)==null?void 0:f.docs)==null?void 0:C.source}}};var S,E,M;t.parameters={...t.parameters,docs:{...(S=t.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: args => <PreferencesModalDemo {...args} />,
  args: {
    currentPage: 'appearance'
  }
}`,...(M=(E=t.parameters)==null?void 0:E.docs)==null?void 0:M.source}}};var O,D,A;o.parameters={...o.parameters,docs:{...(O=o.parameters)==null?void 0:O.docs,source:{originalSource:`{
  render: args => <PreferencesModalDemo {...args} />,
  args: {
    currentPage: 'audio-settings'
  }
}`,...(A=(D=o.parameters)==null?void 0:D.docs)==null?void 0:A.source}}};var h,k,x;c.parameters={...c.parameters,docs:{...(h=c.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: args => {
    const [currentPage, setCurrentPage] = useState<PreferencesPage>('general');
    return <PreferencesModal {...args} isOpen={true} onClose={() => console.log('Close clicked')} currentPage={currentPage} onPageChange={setCurrentPage} />;
  },
  args: {}
}`,...(x=(k=c.parameters)==null?void 0:k.docs)==null?void 0:x.source}}};const j=["Default","GeneralPage","AppearancePage","AudioSettingsPage","AlwaysOpen"];export{c as AlwaysOpen,t as AppearancePage,o as AudioSettingsPage,n as Default,s as GeneralPage,j as __namedExportsOrder,b as default};
