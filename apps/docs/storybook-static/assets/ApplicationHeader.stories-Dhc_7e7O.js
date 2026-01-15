import{R as e}from"./index-yIsmwZOr.js";import{a as i}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const b={title:"Components/ApplicationHeader",component:i,parameters:{layout:"fullscreen"},tags:["autodocs"]},a={args:{os:"windows",appName:"Audacity"}},s={args:{os:"macos",appName:"Audacity"}},n={args:{os:"windows",appName:"Audacity",onMenuItemClick:o=>console.log("Menu clicked:",o),onWindowControl:o=>console.log("Window control:",o)}},r={args:{os:"macos",appName:"Audacity",onWindowControl:o=>console.log("Window control:",o)}},t={args:{os:"windows",appName:"Audacity",menuItems:["File","Edit","View","Help"]}},c={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"40px"}},e.createElement("div",null,e.createElement("h3",{style:{margin:"0 0 16px 0",fontSize:"14px",fontWeight:600}},"Windows"),e.createElement(i,{os:"windows"})),e.createElement("div",null,e.createElement("h3",{style:{margin:"0 0 16px 0",fontSize:"14px",fontWeight:600}},"macOS"),e.createElement(i,{os:"macos"})))};var m,p,l;a.parameters={...a.parameters,docs:{...(m=a.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    os: 'windows',
    appName: 'Audacity'
  }
}`,...(l=(p=a.parameters)==null?void 0:p.docs)==null?void 0:l.source}}};var d,u,g;s.parameters={...s.parameters,docs:{...(d=s.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    os: 'macos',
    appName: 'Audacity'
  }
}`,...(g=(u=s.parameters)==null?void 0:u.docs)==null?void 0:g.source}}};var w,W,y;n.parameters={...n.parameters,docs:{...(w=n.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    os: 'windows',
    appName: 'Audacity',
    onMenuItemClick: item => console.log('Menu clicked:', item),
    onWindowControl: action => console.log('Window control:', action)
  }
}`,...(y=(W=n.parameters)==null?void 0:W.docs)==null?void 0:y.source}}};var f,x,S;r.parameters={...r.parameters,docs:{...(f=r.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    os: 'macos',
    appName: 'Audacity',
    onWindowControl: action => console.log('Window control:', action)
  }
}`,...(S=(x=r.parameters)==null?void 0:x.docs)==null?void 0:S.source}}};var C,h,A;t.parameters={...t.parameters,docs:{...(C=t.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    os: 'windows',
    appName: 'Audacity',
    menuItems: ['File', 'Edit', 'View', 'Help']
  }
}`,...(A=(h=t.parameters)==null?void 0:h.docs)==null?void 0:A.source}}};var E,M,N;c.parameters={...c.parameters,docs:{...(E=c.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '40px'
  }}>
      <div>
        <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        fontWeight: 600
      }}>Windows</h3>
        <ApplicationHeader os="windows" />
      </div>
      <div>
        <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        fontWeight: 600
      }}>macOS</h3>
        <ApplicationHeader os="macos" />
      </div>
    </div>
}`,...(N=(M=c.parameters)==null?void 0:M.docs)==null?void 0:N.source}}};const z=["Windows","MacOS","WindowsWithCallbacks","MacOSWithCallbacks","CustomMenuItems","Comparison"];export{c as Comparison,t as CustomMenuItems,s as MacOS,r as MacOSWithCallbacks,a as Windows,n as WindowsWithCallbacks,z as __namedExportsOrder,b as default};
