import{ad as e}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const V={title:"Audio/TrackMeter",component:e,parameters:{layout:"centered",docs:{description:{component:"A vertical audio level meter for track control panels. Displays volume level with optional RMS overlay, clipping indicator, and peak markers."}}},tags:["autodocs"],argTypes:{volume:{control:{type:"range",min:0,max:100,step:1},description:"Current volume level (0-100)"},clipped:{control:"boolean",description:"Whether the meter is clipping (shows red clipping region)"},meterStyle:{control:"select",options:["default","rms"],description:"Meter display style - RMS shows a lighter overlay region"},recentPeak:{control:{type:"range",min:0,max:100,step:1},description:"Recent peak level (0-100) - shown as a blue line"},maxPeak:{control:{type:"range",min:0,max:100,step:1},description:"Max peak level (0-100) - shown as a black line"}},decorators:[b=>React.createElement("div",{style:{height:"144px",display:"flex",alignItems:"center",gap:"16px"}},React.createElement(b,null))]},t={args:{volume:0,clipped:!1,meterStyle:"default"}},a={args:{volume:33,clipped:!1,meterStyle:"default",recentPeak:33,maxPeak:33}},r={args:{volume:50,clipped:!1,meterStyle:"default",recentPeak:62,maxPeak:55}},n={args:{volume:66,clipped:!1,meterStyle:"default",recentPeak:66,maxPeak:79}},l={args:{volume:66,clipped:!1,meterStyle:"rms",recentPeak:66,maxPeak:79}},c={args:{volume:100,clipped:!0,meterStyle:"default",recentPeak:100,maxPeak:100}},i={args:{volume:66,clipped:!0,meterStyle:"default",recentPeak:66,maxPeak:92}},s={render:()=>React.createElement("div",{style:{display:"flex",gap:"16px",alignItems:"stretch",height:"144px"}},React.createElement("div",{style:{textAlign:"center"}},React.createElement(e,{volume:0}),React.createElement("div",{style:{fontSize:"10px",marginTop:"4px"}},"0%")),React.createElement("div",{style:{textAlign:"center"}},React.createElement(e,{volume:33,recentPeak:33,maxPeak:33}),React.createElement("div",{style:{fontSize:"10px",marginTop:"4px"}},"33%")),React.createElement("div",{style:{textAlign:"center"}},React.createElement(e,{volume:50,recentPeak:62,maxPeak:55}),React.createElement("div",{style:{fontSize:"10px",marginTop:"4px"}},"50%")),React.createElement("div",{style:{textAlign:"center"}},React.createElement(e,{volume:66,recentPeak:66,maxPeak:79}),React.createElement("div",{style:{fontSize:"10px",marginTop:"4px"}},"66%")),React.createElement("div",{style:{textAlign:"center"}},React.createElement(e,{volume:66,meterStyle:"rms",recentPeak:66,maxPeak:79}),React.createElement("div",{style:{fontSize:"10px",marginTop:"4px"}},"66% RMS")),React.createElement("div",{style:{textAlign:"center"}},React.createElement(e,{volume:100,clipped:!0}),React.createElement("div",{style:{fontSize:"10px",marginTop:"4px"}},"Clip")),React.createElement("div",{style:{textAlign:"center"}},React.createElement(e,{volume:66,clipped:!0,recentPeak:66,maxPeak:92}),React.createElement("div",{style:{fontSize:"10px",marginTop:"4px"}},"Clip 66%")))};var o,p,m;t.parameters={...t.parameters,docs:{...(o=t.parameters)==null?void 0:o.docs,source:{originalSource:`{
  args: {
    volume: 0,
    clipped: false,
    meterStyle: 'default'
  }
}`,...(m=(p=t.parameters)==null?void 0:p.docs)==null?void 0:m.source}}};var d,v,u;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    volume: 33,
    clipped: false,
    meterStyle: 'default',
    recentPeak: 33,
    maxPeak: 33
  }
}`,...(u=(v=a.parameters)==null?void 0:v.docs)==null?void 0:u.source}}};var x,g,k;r.parameters={...r.parameters,docs:{...(x=r.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    volume: 50,
    clipped: false,
    meterStyle: 'default',
    recentPeak: 62,
    maxPeak: 55
  }
}`,...(k=(g=r.parameters)==null?void 0:g.docs)==null?void 0:k.source}}};var y,P,S;n.parameters={...n.parameters,docs:{...(y=n.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    volume: 66,
    clipped: false,
    meterStyle: 'default',
    recentPeak: 66,
    maxPeak: 79
  }
}`,...(S=(P=n.parameters)==null?void 0:P.docs)==null?void 0:S.source}}};var f,R,h;l.parameters={...l.parameters,docs:{...(f=l.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    volume: 66,
    clipped: false,
    meterStyle: 'rms',
    recentPeak: 66,
    maxPeak: 79
  }
}`,...(h=(R=l.parameters)==null?void 0:R.docs)==null?void 0:h.source}}};var E,T,M;c.parameters={...c.parameters,docs:{...(E=c.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    volume: 100,
    clipped: true,
    meterStyle: 'default',
    recentPeak: 100,
    maxPeak: 100
  }
}`,...(M=(T=c.parameters)==null?void 0:T.docs)==null?void 0:M.source}}};var A,z,C;i.parameters={...i.parameters,docs:{...(A=i.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    volume: 66,
    clipped: true,
    meterStyle: 'default',
    recentPeak: 66,
    maxPeak: 92
  }
}`,...(C=(z=i.parameters)==null?void 0:z.docs)==null?void 0:C.source}}};var w,W,H;s.parameters={...s.parameters,docs:{...(w=s.parameters)==null?void 0:w.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '16px',
    alignItems: 'stretch',
    height: '144px'
  }}>
      <div style={{
      textAlign: 'center'
    }}>
        <TrackMeter volume={0} />
        <div style={{
        fontSize: '10px',
        marginTop: '4px'
      }}>0%</div>
      </div>
      <div style={{
      textAlign: 'center'
    }}>
        <TrackMeter volume={33} recentPeak={33} maxPeak={33} />
        <div style={{
        fontSize: '10px',
        marginTop: '4px'
      }}>33%</div>
      </div>
      <div style={{
      textAlign: 'center'
    }}>
        <TrackMeter volume={50} recentPeak={62} maxPeak={55} />
        <div style={{
        fontSize: '10px',
        marginTop: '4px'
      }}>50%</div>
      </div>
      <div style={{
      textAlign: 'center'
    }}>
        <TrackMeter volume={66} recentPeak={66} maxPeak={79} />
        <div style={{
        fontSize: '10px',
        marginTop: '4px'
      }}>66%</div>
      </div>
      <div style={{
      textAlign: 'center'
    }}>
        <TrackMeter volume={66} meterStyle="rms" recentPeak={66} maxPeak={79} />
        <div style={{
        fontSize: '10px',
        marginTop: '4px'
      }}>66% RMS</div>
      </div>
      <div style={{
      textAlign: 'center'
    }}>
        <TrackMeter volume={100} clipped />
        <div style={{
        fontSize: '10px',
        marginTop: '4px'
      }}>Clip</div>
      </div>
      <div style={{
      textAlign: 'center'
    }}>
        <TrackMeter volume={66} clipped recentPeak={66} maxPeak={92} />
        <div style={{
        fontSize: '10px',
        marginTop: '4px'
      }}>Clip 66%</div>
      </div>
    </div>
}`,...(H=(W=s.parameters)==null?void 0:W.docs)==null?void 0:H.source}}};const _=["Silent","Low","Medium","High","HighWithRMS","Clipping","ClippingWithPeaks","AllVariants"];export{s as AllVariants,c as Clipping,i as ClippingWithPeaks,n as High,l as HighWithRMS,a as Low,r as Medium,t as Silent,_ as __namedExportsOrder,V as default};
