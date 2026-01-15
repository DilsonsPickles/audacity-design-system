import{R as r}from"./index-yIsmwZOr.js";import{X as e}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const Cr={title:"Components/TransportButton",component:e,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{state:{control:"select",options:["idle","hover","pressed","disabled"]}}},o={args:{icon:"",state:"idle"}},t={args:{icon:"",state:"hover"}},a={args:{icon:"",state:"pressed"}},s={args:{icon:"",disabled:!0}},n={args:{icon:""}},i={args:{icon:""}},c={args:{icon:""}},d={args:{icon:""}},p={args:{icon:""}},m={render:()=>r.createElement("div",{style:{display:"flex",gap:"2px",alignItems:"center"}},r.createElement(e,{icon:""}),r.createElement(e,{icon:""}),r.createElement(e,{icon:""}),r.createElement(e,{icon:""}),r.createElement(e,{icon:""}),r.createElement(e,{icon:""}))};var g,C,u,S,l;o.parameters={...o.parameters,docs:{...(g=o.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF448),
    state: 'idle'
  }
}`,...(u=(C=o.parameters)==null?void 0:C.docs)==null?void 0:u.source},description:{story:"Skip back button in idle state",...(l=(S=o.parameters)==null?void 0:S.docs)==null?void 0:l.description}}};var f,h,k,x,b;t.parameters={...t.parameters,docs:{...(f=t.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF448),
    state: 'hover'
  }
}`,...(k=(h=t.parameters)==null?void 0:h.docs)==null?void 0:k.source},description:{story:"Skip back button in hover state",...(b=(x=t.parameters)==null?void 0:x.docs)==null?void 0:b.description}}};var B,y,F,v,T;a.parameters={...a.parameters,docs:{...(B=a.parameters)==null?void 0:B.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF448),
    state: 'pressed'
  }
}`,...(F=(y=a.parameters)==null?void 0:y.docs)==null?void 0:F.source},description:{story:"Skip back button in pressed state",...(T=(v=a.parameters)==null?void 0:v.docs)==null?void 0:T.description}}};var E,P,A,R,w;s.parameters={...s.parameters,docs:{...(E=s.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF448),
    disabled: true
  }
}`,...(A=(P=s.parameters)==null?void 0:P.docs)==null?void 0:A.source},description:{story:"Skip back button in disabled state",...(w=(R=s.parameters)==null?void 0:R.docs)==null?void 0:w.description}}};var I,D,H,_,O;n.parameters={...n.parameters,docs:{...(I=n.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF446)
  }
}`,...(H=(D=n.parameters)==null?void 0:D.docs)==null?void 0:H.source},description:{story:"Play button",...(O=(_=n.parameters)==null?void 0:_.docs)==null?void 0:O.description}}};var X,j,q,z,G;i.parameters={...i.parameters,docs:{...(X=i.parameters)==null?void 0:X.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF44B)
  }
}`,...(q=(j=i.parameters)==null?void 0:j.docs)==null?void 0:q.source},description:{story:"Pause button",...(G=(z=i.parameters)==null?void 0:z.docs)==null?void 0:G.description}}};var J,K,L,M,N;c.parameters={...c.parameters,docs:{...(J=c.parameters)==null?void 0:J.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF447)
  }
}`,...(L=(K=c.parameters)==null?void 0:K.docs)==null?void 0:L.source},description:{story:"Stop button",...(N=(M=c.parameters)==null?void 0:M.docs)==null?void 0:N.description}}};var Q,U,V,W,Y;d.parameters={...d.parameters,docs:{...(Q=d.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF449)
  }
}`,...(V=(U=d.parameters)==null?void 0:U.docs)==null?void 0:V.source},description:{story:"Skip forward button",...(Y=(W=d.parameters)==null?void 0:W.docs)==null?void 0:Y.description}}};var Z,$,rr,er,or;p.parameters={...p.parameters,docs:{...(Z=p.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  args: {
    icon: String.fromCharCode(0xF44A)
  }
}`,...(rr=($=p.parameters)==null?void 0:$.docs)==null?void 0:rr.source},description:{story:"Record button",...(or=(er=p.parameters)==null?void 0:er.docs)==null?void 0:or.description}}};var tr,ar,sr,nr,ir;m.parameters={...m.parameters,docs:{...(tr=m.parameters)==null?void 0:tr.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '2px',
    alignItems: 'center'
  }}>
      <TransportButton icon={String.fromCharCode(0xF448)} />
      <TransportButton icon={String.fromCharCode(0xF446)} />
      <TransportButton icon={String.fromCharCode(0xF44B)} />
      <TransportButton icon={String.fromCharCode(0xF447)} />
      <TransportButton icon={String.fromCharCode(0xF449)} />
      <TransportButton icon={String.fromCharCode(0xF44A)} />
    </div>
}`,...(sr=(ar=m.parameters)==null?void 0:ar.docs)==null?void 0:sr.source},description:{story:"All transport buttons in a row",...(ir=(nr=m.parameters)==null?void 0:nr.docs)==null?void 0:ir.description}}};const ur=["SkipBackIdle","SkipBackHover","SkipBackPressed","SkipBackDisabled","Play","Pause","Stop","SkipForward","Record","AllButtons"];export{m as AllButtons,i as Pause,n as Play,p as Record,s as SkipBackDisabled,t as SkipBackHover,o as SkipBackIdle,a as SkipBackPressed,d as SkipForward,c as Stop,ur as __namedExportsOrder,Cr as default};
