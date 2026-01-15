import{r as f,R as e}from"./index-yIsmwZOr.js";import{K as r}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const j={title:"Components/TimeCode",component:r,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{value:{control:{type:"number",min:0,max:3600,step:.1},description:"Current time value in seconds"},format:{control:"select",options:["dd:hh:mm:ss","hh:mm:ss","hh:mm:ss+hundredths","hh:mm:ss+milliseconds","hh:mm:ss+samples","hh:mm:ss+frames","samples","seconds","seconds+milliseconds","film-frames","beats:bars","Hz"],description:"Format to display the timecode"},sampleRate:{control:{type:"number",min:8e3,max:192e3,step:100},description:"Sample rate for sample-based formats"},frameRate:{control:{type:"number",min:23.976,max:60,step:.001},description:"Frame rate for frame-based formats"},showFormatSelector:{control:"boolean",description:"Show format selector dropdown"},disabled:{control:"boolean",description:"Disabled state"}}},l={args:{value:125.5,format:"hh:mm:ss",sampleRate:44100,frameRate:24,showFormatSelector:!0,disabled:!1}},o={render:()=>{const[s]=f.useState(125.5),t=[{format:"dd:hh:mm:ss",label:"Days, Hours, Minutes, Seconds"},{format:"hh:mm:ss",label:"Hours, Minutes, Seconds"},{format:"hh:mm:ss+hundredths",label:"HH:MM:SS + Hundredths"},{format:"hh:mm:ss+milliseconds",label:"HH:MM:SS + Milliseconds"},{format:"hh:mm:ss+samples",label:"HH:MM:SS + Samples"},{format:"hh:mm:ss+frames",label:"HH:MM:SS + Frames"},{format:"samples",label:"Samples"},{format:"seconds",label:"Seconds"},{format:"seconds+milliseconds",label:"Seconds + Milliseconds"},{format:"film-frames",label:"Film Frames (24fps)"},{format:"beats:bars",label:"Beats:Bars"},{format:"Hz",label:"Hz"}];return e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",padding:"20px"}},t.map(({format:a,label:c})=>e.createElement("div",{key:a,style:{display:"flex",alignItems:"center",gap:"16px"}},e.createElement("div",{style:{width:"250px",fontSize:"14px",color:"#666"}},c),e.createElement(r,{value:s,format:a,showFormatSelector:!1}))))}},n={render:()=>{const[s,t]=f.useState(125.5),[a,c]=f.useState("hh:mm:ss");return e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"24px",padding:"20px"}},e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"8px"}},e.createElement("label",{style:{fontSize:"14px",fontWeight:600}},"Time Value (seconds):"),e.createElement("input",{type:"range",min:"0",max:"3600",step:"0.1",value:s,onChange:W=>t(parseFloat(W.target.value)),style:{width:"300px"}}),e.createElement("span",{style:{fontSize:"12px",color:"#666"}},s.toFixed(1),"s")),e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"8px"}},e.createElement("label",{style:{fontSize:"14px",fontWeight:600}},"TimeCode Component:"),e.createElement(r,{value:s,format:a,onChange:t,onFormatChange:c,showFormatSelector:!0})))}},m={render:()=>{const t=[8e3,22050,44100,48e3,96e3,192e3];return e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",padding:"20px"}},t.map(a=>e.createElement("div",{key:a,style:{display:"flex",alignItems:"center",gap:"16px"}},e.createElement("div",{style:{width:"100px",fontSize:"14px",color:"#666"}},a," Hz"),e.createElement(r,{value:1.5,format:"samples",sampleRate:a,showFormatSelector:!1}))))}},i={render:()=>{const t=[23.976,24,25,29.97,30,50,60];return e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",padding:"20px"}},t.map(a=>e.createElement("div",{key:a,style:{display:"flex",alignItems:"center",gap:"16px"}},e.createElement("div",{style:{width:"80px",fontSize:"14px",color:"#666"}},a," fps"),e.createElement(r,{value:10.5,format:"film-frames",frameRate:a,showFormatSelector:!1}))))}},p={args:{value:125.5,format:"hh:mm:ss",disabled:!0,showFormatSelector:!0}},d={args:{value:125.5,format:"hh:mm:ss",showFormatSelector:!1}};var u,h,x;l.parameters={...l.parameters,docs:{...(u=l.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    value: 125.5,
    format: 'hh:mm:ss',
    sampleRate: 44100,
    frameRate: 24,
    showFormatSelector: true,
    disabled: false
  }
}`,...(x=(h=l.parameters)==null?void 0:h.docs)==null?void 0:x.source}}};var S,v,y;o.parameters={...o.parameters,docs:{...(S=o.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: () => {
    const [value] = useState(125.5);
    const formats: {
      format: TimeCodeFormat;
      label: string;
    }[] = [{
      format: 'dd:hh:mm:ss',
      label: 'Days, Hours, Minutes, Seconds'
    }, {
      format: 'hh:mm:ss',
      label: 'Hours, Minutes, Seconds'
    }, {
      format: 'hh:mm:ss+hundredths',
      label: 'HH:MM:SS + Hundredths'
    }, {
      format: 'hh:mm:ss+milliseconds',
      label: 'HH:MM:SS + Milliseconds'
    }, {
      format: 'hh:mm:ss+samples',
      label: 'HH:MM:SS + Samples'
    }, {
      format: 'hh:mm:ss+frames',
      label: 'HH:MM:SS + Frames'
    }, {
      format: 'samples',
      label: 'Samples'
    }, {
      format: 'seconds',
      label: 'Seconds'
    }, {
      format: 'seconds+milliseconds',
      label: 'Seconds + Milliseconds'
    }, {
      format: 'film-frames',
      label: 'Film Frames (24fps)'
    }, {
      format: 'beats:bars',
      label: 'Beats:Bars'
    }, {
      format: 'Hz',
      label: 'Hz'
    }];
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px'
    }}>
        {formats.map(({
        format,
        label
      }) => <div key={format} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
            <div style={{
          width: '250px',
          fontSize: '14px',
          color: '#666'
        }}>{label}</div>
            <TimeCode value={value} format={format} showFormatSelector={false} />
          </div>)}
      </div>;
  }
}`,...(y=(v=o.parameters)==null?void 0:v.docs)==null?void 0:y.source}}};var g,b,F;n.parameters={...n.parameters,docs:{...(g=n.parameters)==null?void 0:g.docs,source:{originalSource:`{
  render: () => {
    const [value, setValue] = useState(125.5);
    const [format, setFormat] = useState<TimeCodeFormat>('hh:mm:ss');
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '20px'
    }}>
        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
          <label style={{
          fontSize: '14px',
          fontWeight: 600
        }}>Time Value (seconds):</label>
          <input type="range" min="0" max="3600" step="0.1" value={value} onChange={e => setValue(parseFloat(e.target.value))} style={{
          width: '300px'
        }} />
          <span style={{
          fontSize: '12px',
          color: '#666'
        }}>{value.toFixed(1)}s</span>
        </div>

        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
          <label style={{
          fontSize: '14px',
          fontWeight: 600
        }}>TimeCode Component:</label>
          <TimeCode value={value} format={format} onChange={setValue} onFormatChange={setFormat} showFormatSelector={true} />
        </div>
      </div>;
  }
}`,...(F=(b=n.parameters)==null?void 0:b.docs)==null?void 0:F.source}}};var H,w,M;m.parameters={...m.parameters,docs:{...(H=m.parameters)==null?void 0:H.docs,source:{originalSource:`{
  render: () => {
    const value = 1.5;
    const sampleRates = [8000, 22050, 44100, 48000, 96000, 192000];
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px'
    }}>
        {sampleRates.map(sampleRate => <div key={sampleRate} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
            <div style={{
          width: '100px',
          fontSize: '14px',
          color: '#666'
        }}>{sampleRate} Hz</div>
            <TimeCode value={value} format="samples" sampleRate={sampleRate} showFormatSelector={false} />
          </div>)}
      </div>;
  }
}`,...(M=(w=m.parameters)==null?void 0:w.docs)==null?void 0:M.source}}};var R,D,E;i.parameters={...i.parameters,docs:{...(R=i.parameters)==null?void 0:R.docs,source:{originalSource:`{
  render: () => {
    const value = 10.5;
    const frameRates = [23.976, 24, 25, 29.97, 30, 50, 60];
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px'
    }}>
        {frameRates.map(frameRate => <div key={frameRate} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
            <div style={{
          width: '80px',
          fontSize: '14px',
          color: '#666'
        }}>{frameRate} fps</div>
            <TimeCode value={value} format="film-frames" frameRate={frameRate} showFormatSelector={false} />
          </div>)}
      </div>;
  }
}`,...(E=(D=i.parameters)==null?void 0:D.docs)==null?void 0:E.source}}};var C,z,T;p.parameters={...p.parameters,docs:{...(C=p.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    value: 125.5,
    format: 'hh:mm:ss',
    disabled: true,
    showFormatSelector: true
  }
}`,...(T=(z=p.parameters)==null?void 0:z.docs)==null?void 0:T.source}}};var I,k,V;d.parameters={...d.parameters,docs:{...(I=d.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    value: 125.5,
    format: 'hh:mm:ss',
    showFormatSelector: false
  }
}`,...(V=(k=d.parameters)==null?void 0:k.docs)==null?void 0:V.source}}};const q=["Default","AllFormats","Interactive","DifferentSampleRates","DifferentFrameRates","Disabled","WithoutFormatSelector"];export{o as AllFormats,l as Default,i as DifferentFrameRates,m as DifferentSampleRates,p as Disabled,n as Interactive,d as WithoutFormatSelector,q as __namedExportsOrder,j as default};
