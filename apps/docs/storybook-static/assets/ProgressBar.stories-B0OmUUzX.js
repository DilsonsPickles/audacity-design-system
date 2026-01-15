import{u as D}from"./index-DR-q5OqV.js";import{R as e}from"./index-yIsmwZOr.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const j={title:"Components/ProgressBar",component:D,parameters:{layout:"centered"},tags:["autodocs"]},r={args:{value:0,width:220}},s={args:{value:25,width:220}},t={args:{value:50,width:220}},a={args:{value:75,width:220}},n={args:{value:100,width:220}},o={args:{value:60,width:400}},c={render:()=>{const[i,F]=e.useState(0);return e.useEffect(()=>{const H=setInterval(()=>{F(m=>m>=100?0:m+1)},50);return()=>clearInterval(H)},[]),e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",alignItems:"center"}},e.createElement(D,{value:i,width:300}),e.createElement("div",{style:{fontSize:"12px",fontFamily:"Inter, sans-serif"}},i,"%"))}};var u,p,d;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    value: 0,
    width: 220
  }
}`,...(d=(p=r.parameters)==null?void 0:p.docs)==null?void 0:d.source}}};var l,g,v;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    value: 25,
    width: 220
  }
}`,...(v=(g=s.parameters)==null?void 0:g.docs)==null?void 0:v.source}}};var f,h,w;t.parameters={...t.parameters,docs:{...(f=t.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    value: 50,
    width: 220
  }
}`,...(w=(h=t.parameters)==null?void 0:h.docs)==null?void 0:w.source}}};var y,S,x;a.parameters={...a.parameters,docs:{...(y=a.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    value: 75,
    width: 220
  }
}`,...(x=(S=a.parameters)==null?void 0:S.docs)==null?void 0:x.source}}};var E,I,P;n.parameters={...n.parameters,docs:{...(E=n.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    value: 100,
    width: 220
  }
}`,...(P=(I=n.parameters)==null?void 0:I.docs)==null?void 0:P.source}}};var C,Q,R;o.parameters={...o.parameters,docs:{...(C=o.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    value: 60,
    width: 400
  }
}`,...(R=(Q=o.parameters)==null?void 0:Q.docs)==null?void 0:R.source}}};var B,z,A;c.parameters={...c.parameters,docs:{...(B=c.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => {
    const [progress, setProgress] = React.useState(0);
    React.useEffect(() => {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            return 0;
          }
          return prev + 1;
        });
      }, 50);
      return () => clearInterval(timer);
    }, []);
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      alignItems: 'center'
    }}>
        <ProgressBar value={progress} width={300} />
        <div style={{
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      }}>
          {progress}%
        </div>
      </div>;
  }
}`,...(A=(z=c.parameters)==null?void 0:z.docs)==null?void 0:A.source}}};const k=["Empty","Quarter","Half","ThreeQuarters","Complete","CustomWidth","Animated"];export{c as Animated,n as Complete,o as CustomWidth,r as Empty,t as Half,s as Quarter,a as ThreeQuarters,k as __namedExportsOrder,j as default};
