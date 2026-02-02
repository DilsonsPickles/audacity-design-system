import{v as P,m as w,q as H}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const D={title:"Components/EffectsPanelHeader",component:P,parameters:{layout:"centered"},tags:["autodocs"],decorators:[L=>React.createElement(w,{theme:H},React.createElement("div",{style:{width:"240px"}},React.createElement(L,null)))]},e={args:{title:"Effects",onClose:()=>console.log("Close clicked")}},o={args:{title:"Audio Effects",onClose:()=>console.log("Close clicked")}},t={args:{title:"Effects"}},s={args:{title:"Very Long Effects Panel Title That Should Truncate",onClose:()=>console.log("Close clicked")}};var r,a,c,l,n;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    title: 'Effects',
    onClose: () => console.log('Close clicked')
  }
}`,...(c=(a=e.parameters)==null?void 0:a.docs)==null?void 0:c.source},description:{story:"Default effects panel header with title and close button",...(n=(l=e.parameters)==null?void 0:l.docs)==null?void 0:n.description}}};var i,d,m,p,u;o.parameters={...o.parameters,docs:{...(i=o.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    title: 'Audio Effects',
    onClose: () => console.log('Close clicked')
  }
}`,...(m=(d=o.parameters)==null?void 0:d.docs)==null?void 0:m.source},description:{story:"Custom title",...(u=(p=o.parameters)==null?void 0:p.docs)==null?void 0:u.description}}};var f,g,C,E,h;t.parameters={...t.parameters,docs:{...(f=t.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    title: 'Effects'
  }
}`,...(C=(g=t.parameters)==null?void 0:g.docs)==null?void 0:C.source},description:{story:"Without close handler (button still visible)",...(h=(E=t.parameters)==null?void 0:E.docs)==null?void 0:h.description}}};var T,y,k,S,v;s.parameters={...s.parameters,docs:{...(T=s.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    title: 'Very Long Effects Panel Title That Should Truncate',
    onClose: () => console.log('Close clicked')
  }
}`,...(k=(y=s.parameters)==null?void 0:y.docs)==null?void 0:k.source},description:{story:"Long title with overflow",...(v=(S=s.parameters)==null?void 0:S.docs)==null?void 0:v.description}}};const R=["Default","CustomTitle","NoCloseHandler","LongTitle"];export{o as CustomTitle,e as Default,s as LongTitle,t as NoCloseHandler,R as __namedExportsOrder,D as default};
