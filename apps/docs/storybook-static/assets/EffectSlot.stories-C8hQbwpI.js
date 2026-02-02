import{R as t,p as c,m as X,q as Y}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const ee={title:"Components/EffectSlot",component:c,parameters:{layout:"centered"},tags:["autodocs"],decorators:[e=>t.createElement(X,{theme:Y},t.createElement("div",{style:{width:"240px",padding:"8px",background:"#1a1a1a"}},t.createElement(e,null)))]},s={args:{effectName:"Effect name",enabled:!0,onToggle:e=>console.log("Toggle:",e),onSelectEffect:()=>console.log("Select effect clicked"),onShowSettings:()=>console.log("Settings clicked")}},r={args:{effectName:"Effect name",enabled:!1,onToggle:e=>console.log("Toggle:",e),onSelectEffect:()=>console.log("Select effect clicked"),onShowSettings:()=>console.log("Settings clicked")}},g={render:()=>t.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"0px"}},t.createElement(c,{effectName:"Reverb",enabled:!0,onToggle:e=>console.log("Reverb toggle:",e),onSelectEffect:()=>console.log("Select reverb"),onShowSettings:()=>console.log("Reverb settings")}),t.createElement(c,{effectName:"Compressor",enabled:!0,onToggle:e=>console.log("Compressor toggle:",e),onSelectEffect:()=>console.log("Select compressor"),onShowSettings:()=>console.log("Compressor settings")}),t.createElement(c,{effectName:"EQ",enabled:!1,onToggle:e=>console.log("EQ toggle:",e),onSelectEffect:()=>console.log("Select EQ"),onShowSettings:()=>console.log("EQ settings")}))},d={args:{effectName:"Very Long Effect Name That Should Truncate With Ellipsis",enabled:!0,onToggle:e=>console.log("Toggle:",e),onSelectEffect:()=>console.log("Select effect clicked"),onShowSettings:()=>console.log("Settings clicked")}},f={args:{effectName:"Compressor",enabled:!0},render:e=>{const[m,l]=t.useState(e.enabled),[a,E]=t.useState(e.effectName);return t.createElement(c,{effectName:a,enabled:m,onToggle:S=>{l(S),console.log("Toggled to:",S)},onSelectEffect:()=>{console.log("Select effect clicked")},onShowSettings:()=>{console.log("Settings clicked")}})}},i={render:()=>{const[e,m]=t.useState([{id:"1",name:"Reverb",enabled:!0},{id:"2",name:"Compressor",enabled:!0},{id:"3",name:"EQ",enabled:!1},{id:"4",name:"Delay",enabled:!0}]),[l,a]=t.useState(null),E=n=>{m(e.map(o=>o.id===n?{...o,enabled:!o.enabled}:o))},S=n=>o=>{a(n),o.dataTransfer.effectAllowed="move"},K=n=>o=>{if(o.preventDefault(),l===null||l===n)return;const p=[...e],U=p[l];p.splice(l,1),p.splice(n,0,U),m(p),a(n)},M=()=>{a(null)};return t.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"0px"}},e.map((n,o)=>t.createElement(c,{key:n.id,effectName:n.name,enabled:n.enabled,isDragging:l===o,onToggle:()=>E(n.id),onSelectEffect:()=>console.log("Select:",n.name),onShowSettings:()=>console.log("Settings:",n.name),onDragStart:S(o),onDragOver:K(o),onDragEnd:M})))}};var u,b,h,x,D;s.parameters={...s.parameters,docs:{...(u=s.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    effectName: 'Effect name',
    enabled: true,
    onToggle: enabled => console.log('Toggle:', enabled),
    onSelectEffect: () => console.log('Select effect clicked'),
    onShowSettings: () => console.log('Settings clicked')
  }
}`,...(h=(b=s.parameters)==null?void 0:b.docs)==null?void 0:h.source},description:{story:"Effect slot in enabled state (blue toggle)",...(D=(x=s.parameters)==null?void 0:x.docs)==null?void 0:D.description}}};var v,w,T,N,y;r.parameters={...r.parameters,docs:{...(v=r.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    effectName: 'Effect name',
    enabled: false,
    onToggle: enabled => console.log('Toggle:', enabled),
    onSelectEffect: () => console.log('Select effect clicked'),
    onShowSettings: () => console.log('Settings clicked')
  }
}`,...(T=(w=r.parameters)==null?void 0:w.docs)==null?void 0:T.source},description:{story:"Effect slot in disabled state (gray toggle)",...(y=(N=r.parameters)==null?void 0:N.docs)==null?void 0:y.description}}};var k,I,R,C,Q;g.parameters={...g.parameters,docs:{...(k=g.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '0px'
  }}>
      <EffectSlot effectName="Reverb" enabled={true} onToggle={enabled => console.log('Reverb toggle:', enabled)} onSelectEffect={() => console.log('Select reverb')} onShowSettings={() => console.log('Reverb settings')} />
      <EffectSlot effectName="Compressor" enabled={true} onToggle={enabled => console.log('Compressor toggle:', enabled)} onSelectEffect={() => console.log('Select compressor')} onShowSettings={() => console.log('Compressor settings')} />
      <EffectSlot effectName="EQ" enabled={false} onToggle={enabled => console.log('EQ toggle:', enabled)} onSelectEffect={() => console.log('Select EQ')} onShowSettings={() => console.log('EQ settings')} />
    </div>
}`,...(R=(I=g.parameters)==null?void 0:I.docs)==null?void 0:R.source},description:{story:"With actual effect names",...(Q=(C=g.parameters)==null?void 0:C.docs)==null?void 0:Q.description}}};var O,L,W,A,V;d.parameters={...d.parameters,docs:{...(O=d.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    effectName: 'Very Long Effect Name That Should Truncate With Ellipsis',
    enabled: true,
    onToggle: enabled => console.log('Toggle:', enabled),
    onSelectEffect: () => console.log('Select effect clicked'),
    onShowSettings: () => console.log('Settings clicked')
  }
}`,...(W=(L=d.parameters)==null?void 0:L.docs)==null?void 0:W.source},description:{story:"Long effect name with overflow",...(V=(A=d.parameters)==null?void 0:A.docs)==null?void 0:V.description}}};var _,q,P,j,z;f.parameters={...f.parameters,docs:{...(_=f.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    effectName: 'Compressor',
    enabled: true
  },
  render: args => {
    const [enabled, setEnabled] = React.useState(args.enabled);
    const [effectName, setEffectName] = React.useState(args.effectName);
    return <EffectSlot effectName={effectName} enabled={enabled} onToggle={newEnabled => {
      setEnabled(newEnabled);
      console.log('Toggled to:', newEnabled);
    }} onSelectEffect={() => {
      console.log('Select effect clicked');
      // In real app, this would open effect selector
    }} onShowSettings={() => {
      console.log('Settings clicked');
      // In real app, this would open settings dropdown
    }} />;
  }
}`,...(P=(q=f.parameters)==null?void 0:q.docs)==null?void 0:P.source},description:{story:"Interactive example",...(z=(j=f.parameters)==null?void 0:j.docs)==null?void 0:z.description}}};var B,F,G,H,J;i.parameters={...i.parameters,docs:{...(B=i.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => {
    const [effects, setEffects] = React.useState([{
      id: '1',
      name: 'Reverb',
      enabled: true
    }, {
      id: '2',
      name: 'Compressor',
      enabled: true
    }, {
      id: '3',
      name: 'EQ',
      enabled: false
    }, {
      id: '4',
      name: 'Delay',
      enabled: true
    }]);
    const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
    const toggleEffect = (id: string) => {
      setEffects(effects.map(effect => effect.id === id ? {
        ...effect,
        enabled: !effect.enabled
      } : effect));
    };
    const handleDragStart = (index: number) => (e: React.DragEvent) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;
      const newEffects = [...effects];
      const draggedEffect = newEffects[draggedIndex];
      newEffects.splice(draggedIndex, 1);
      newEffects.splice(index, 0, draggedEffect);
      setEffects(newEffects);
      setDraggedIndex(index);
    };
    const handleDragEnd = () => {
      setDraggedIndex(null);
    };
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0px'
    }}>
        {effects.map((effect, index) => <EffectSlot key={effect.id} effectName={effect.name} enabled={effect.enabled} isDragging={draggedIndex === index} onToggle={() => toggleEffect(effect.id)} onSelectEffect={() => console.log('Select:', effect.name)} onShowSettings={() => console.log('Settings:', effect.name)} onDragStart={handleDragStart(index)} onDragOver={handleDragOver(index)} onDragEnd={handleDragEnd} />)}
      </div>;
  }
}`,...(G=(F=i.parameters)==null?void 0:F.docs)==null?void 0:G.source},description:{story:"Stack of effects (how they appear in the panel)",...(J=(H=i.parameters)==null?void 0:H.docs)==null?void 0:J.description}}};const ne=["Enabled","Disabled","WithEffectNames","LongEffectName","Interactive","EffectStack"];export{r as Disabled,i as EffectStack,s as Enabled,f as Interactive,d as LongEffectName,g as WithEffectNames,ne as __namedExportsOrder,ee as default};
