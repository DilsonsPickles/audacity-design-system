import{R as c,w as q,m as P,q as j}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const F={title:"Components/EffectsStackHeader",component:q,parameters:{layout:"centered"},tags:["autodocs"],decorators:[e=>c.createElement(P,{theme:j},c.createElement("div",{style:{width:"240px"}},c.createElement(e,null)))]},a={args:{name:"Track name",allEnabled:!1,onToggleAll:e=>console.log("Toggle all:",e),onContextMenu:e=>console.log("Context menu clicked")}},o={args:{name:"Track name",allEnabled:!0,onToggleAll:e=>console.log("Toggle all:",e),onContextMenu:e=>console.log("Context menu clicked")}},l={args:{name:"Master track",allEnabled:!1,isMaster:!0,onToggleAll:e=>console.log("Toggle all master:",e),onContextMenu:e=>console.log("Context menu clicked")}},t={args:{name:"Master track",allEnabled:!0,isMaster:!0,onToggleAll:e=>console.log("Toggle all master:",e),onContextMenu:e=>console.log("Context menu clicked")}},r={args:{name:"Very Long Track Name That Should Truncate With Ellipsis",allEnabled:!1,onToggleAll:e=>console.log("Toggle all:",e),onContextMenu:e=>console.log("Context menu clicked")}},s={args:{name:"Audio Track 1",allEnabled:!1},render:e=>{const[D,O]=c.useState(e.allEnabled);return c.createElement(q,{...e,allEnabled:D,onToggleAll:n=>{O(n),console.log("Toggled to:",n)},onContextMenu:n=>{console.log("Context menu clicked at",n.clientX,n.clientY)}})}};var d,g,i,m,u;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    name: 'Track name',
    allEnabled: false,
    onToggleAll: enabled => console.log('Toggle all:', enabled),
    onContextMenu: e => console.log('Context menu clicked')
  }
}`,...(i=(g=a.parameters)==null?void 0:g.docs)==null?void 0:i.source},description:{story:"Default track header with effects disabled",...(u=(m=a.parameters)==null?void 0:m.docs)==null?void 0:u.description}}};var p,T,b,k,E;o.parameters={...o.parameters,docs:{...(p=o.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    name: 'Track name',
    allEnabled: true,
    onToggleAll: enabled => console.log('Toggle all:', enabled),
    onContextMenu: e => console.log('Context menu clicked')
  }
}`,...(b=(T=o.parameters)==null?void 0:T.docs)==null?void 0:b.source},description:{story:"Track header with all effects enabled (active state)",...(E=(k=o.parameters)==null?void 0:k.docs)==null?void 0:E.description}}};var x,M,C,f,A;l.parameters={...l.parameters,docs:{...(x=l.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    name: 'Master track',
    allEnabled: false,
    isMaster: true,
    onToggleAll: enabled => console.log('Toggle all master:', enabled),
    onContextMenu: e => console.log('Context menu clicked')
  }
}`,...(C=(M=l.parameters)==null?void 0:M.docs)==null?void 0:C.source},description:{story:"Master track header (inactive)",...(A=(f=l.parameters)==null?void 0:f.docs)==null?void 0:A.description}}};var h,v,S,y,w;t.parameters={...t.parameters,docs:{...(h=t.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    name: 'Master track',
    allEnabled: true,
    isMaster: true,
    onToggleAll: enabled => console.log('Toggle all master:', enabled),
    onContextMenu: e => console.log('Context menu clicked')
  }
}`,...(S=(v=t.parameters)==null?void 0:v.docs)==null?void 0:S.source},description:{story:"Master track header (active)",...(w=(y=t.parameters)==null?void 0:y.docs)==null?void 0:w.description}}};var I,L,N,H,R;r.parameters={...r.parameters,docs:{...(I=r.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    name: 'Very Long Track Name That Should Truncate With Ellipsis',
    allEnabled: false,
    onToggleAll: enabled => console.log('Toggle all:', enabled),
    onContextMenu: e => console.log('Context menu clicked')
  }
}`,...(N=(L=r.parameters)==null?void 0:L.docs)==null?void 0:N.source},description:{story:"Long track name with overflow",...(R=(H=r.parameters)==null?void 0:H.docs)==null?void 0:R.description}}};var V,W,X,Y,_;s.parameters={...s.parameters,docs:{...(V=s.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    name: 'Audio Track 1',
    allEnabled: false
  },
  render: args => {
    const [enabled, setEnabled] = React.useState(args.allEnabled);
    return <EffectsStackHeader {...args} allEnabled={enabled} onToggleAll={newEnabled => {
      setEnabled(newEnabled);
      console.log('Toggled to:', newEnabled);
    }} onContextMenu={e => {
      console.log('Context menu clicked at', e.clientX, e.clientY);
    }} />;
  }
}`,...(X=(W=s.parameters)==null?void 0:W.docs)==null?void 0:X.source},description:{story:"Interactive example",...(_=(Y=s.parameters)==null?void 0:Y.docs)==null?void 0:_.description}}};const G=["Inactive","Active","MasterInactive","MasterActive","LongName","Interactive"];export{o as Active,a as Inactive,s as Interactive,r as LongName,t as MasterActive,l as MasterInactive,G as __namedExportsOrder,F as default};
