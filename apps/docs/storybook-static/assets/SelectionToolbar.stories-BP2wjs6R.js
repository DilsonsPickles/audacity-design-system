import{r as f,R as e}from"./index-yIsmwZOr.js";import{x as h}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const oe={title:"Components/SelectionToolbar",component:h,parameters:{layout:"fullscreen"},tags:["autodocs"]},i={args:{selectionStart:1.5,selectionEnd:5.25,format:"hh:mm:ss+milliseconds",sampleRate:44100,frameRate:24}},c={args:{selectionStart:null,selectionEnd:null,format:"hh:mm:ss+milliseconds"}},m={args:{selectionStart:2,selectionEnd:6.5,format:"hh:mm:ss+samples",sampleRate:44100}},d={args:{selectionStart:10.5,selectionEnd:45.25,format:"seconds+milliseconds"}},p={args:{selectionStart:3661.5,selectionEnd:7322.75,format:"dd:hh:mm:ss"}},r=()=>{const[o,l]=f.useState(2.5),[n,s]=f.useState(8.75),[S,Y]=f.useState("hh:mm:ss+milliseconds");return e.createElement("div",null,e.createElement("div",{style:{marginBottom:"16px",padding:"16px",background:"#f8f8f9",borderBottom:"1px solid #d4d5d9"}},e.createElement("h3",{style:{margin:"0 0 12px 0",fontSize:"14px",fontWeight:600}},"Interactive Selection Toolbar"),e.createElement("div",{style:{display:"flex",gap:"12px",marginBottom:"12px"}},e.createElement("button",{onClick:()=>{l(1),s(3.5)},style:{padding:"6px 12px",fontSize:"12px",cursor:"pointer"}},"Set Selection (1.0s - 3.5s)"),e.createElement("button",{onClick:()=>{l(5.25),s(12.75)},style:{padding:"6px 12px",fontSize:"12px",cursor:"pointer"}},"Set Selection (5.25s - 12.75s)"),e.createElement("button",{onClick:()=>{l(0),s(0)},style:{padding:"6px 12px",fontSize:"12px",cursor:"pointer"}},"Clear Selection")),e.createElement("p",{style:{margin:0,fontSize:"12px",color:"#666"}},"Current: ",o.toFixed(2),"s - ",n.toFixed(2),"s (Duration: ",(n-o).toFixed(2),"s)")),e.createElement(h,{selectionStart:o===0&&n===0?null:o,selectionEnd:o===0&&n===0?null:n,format:S,onFormatChange:t=>{console.log("Format changed to:",t),Y(t)},onSelectionStartChange:t=>{console.log("Selection start changed to:",t),l(t)},onSelectionEndChange:t=>{console.log("Selection end changed to:",t),s(t)}}))},a=()=>{const n=[{label:"hh:mm:ss",format:"hh:mm:ss"},{label:"hh:mm:ss + milliseconds",format:"hh:mm:ss+milliseconds"},{label:"hh:mm:ss + samples",format:"hh:mm:ss+samples"},{label:"seconds + milliseconds",format:"seconds+milliseconds"},{label:"samples",format:"samples"}];return e.createElement("div",{style:{display:"flex",flexDirection:"column"}},n.map(({label:s,format:S})=>e.createElement("div",{key:S,style:{marginBottom:"1px"}},e.createElement("div",{style:{padding:"8px 16px",background:"#f8f8f9",borderBottom:"1px solid #d4d5d9",fontSize:"11px",fontWeight:600}},s),e.createElement(h,{selectionStart:125.5,selectionEnd:256.25,format:S,sampleRate:44100}))))};r.__docgenInfo={description:"Interactive demo with format switching",methods:[],displayName:"Interactive"};a.__docgenInfo={description:"All formats showcase",methods:[],displayName:"AllFormats"};var g,u,x,E,y;i.parameters={...i.parameters,docs:{...(g=i.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    selectionStart: 1.5,
    selectionEnd: 5.25,
    format: 'hh:mm:ss+milliseconds',
    sampleRate: 44100,
    frameRate: 24
  }
}`,...(x=(u=i.parameters)==null?void 0:u.docs)==null?void 0:x.source},description:{story:"Default state with a selection",...(y=(E=i.parameters)==null?void 0:E.docs)==null?void 0:y.description}}};var b,v,F,C,w;c.parameters={...c.parameters,docs:{...(b=c.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    selectionStart: null,
    selectionEnd: null,
    format: 'hh:mm:ss+milliseconds'
  }
}`,...(F=(v=c.parameters)==null?void 0:v.docs)==null?void 0:F.source},description:{story:"No selection state (disabled)",...(w=(C=c.parameters)==null?void 0:C.docs)==null?void 0:w.description}}};var k,z,B,R,I;m.parameters={...m.parameters,docs:{...(k=m.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    selectionStart: 2.0,
    selectionEnd: 6.5,
    format: 'hh:mm:ss+samples',
    sampleRate: 44100
  }
}`,...(B=(z=m.parameters)==null?void 0:z.docs)==null?void 0:B.source},description:{story:"Sample-based format",...(I=(R=m.parameters)==null?void 0:R.docs)==null?void 0:I.description}}};var A,T,W,_,D;d.parameters={...d.parameters,docs:{...(A=d.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    selectionStart: 10.5,
    selectionEnd: 45.25,
    format: 'seconds+milliseconds'
  }
}`,...(W=(T=d.parameters)==null?void 0:T.docs)==null?void 0:W.source},description:{story:"Simple seconds format",...(D=(_=d.parameters)==null?void 0:_.docs)==null?void 0:D.description}}};var N,L,O,j,q;p.parameters={...p.parameters,docs:{...(N=p.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    selectionStart: 3661.5,
    // 1h 1m 1.5s
    selectionEnd: 7322.75,
    // 2h 2m 2.75s
    format: 'dd:hh:mm:ss'
  }
}`,...(O=(L=p.parameters)==null?void 0:L.docs)==null?void 0:O.source},description:{story:"Long selection (multiple hours)",...(q=(j=p.parameters)==null?void 0:j.docs)==null?void 0:q.description}}};var G,H,J,K,M;r.parameters={...r.parameters,docs:{...(G=r.parameters)==null?void 0:G.docs,source:{originalSource:`() => {
  const [selectionStart, setSelectionStart] = useState(2.5);
  const [selectionEnd, setSelectionEnd] = useState(8.75);
  const [format, setFormat] = useState<any>('hh:mm:ss+milliseconds');
  return <div>
      <div style={{
      marginBottom: '16px',
      padding: '16px',
      background: '#f8f8f9',
      borderBottom: '1px solid #d4d5d9'
    }}>
        <h3 style={{
        margin: '0 0 12px 0',
        fontSize: '14px',
        fontWeight: 600
      }}>
          Interactive Selection Toolbar
        </h3>
        <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '12px'
      }}>
          <button onClick={() => {
          setSelectionStart(1.0);
          setSelectionEnd(3.5);
        }} style={{
          padding: '6px 12px',
          fontSize: '12px',
          cursor: 'pointer'
        }}>
            Set Selection (1.0s - 3.5s)
          </button>
          <button onClick={() => {
          setSelectionStart(5.25);
          setSelectionEnd(12.75);
        }} style={{
          padding: '6px 12px',
          fontSize: '12px',
          cursor: 'pointer'
        }}>
            Set Selection (5.25s - 12.75s)
          </button>
          <button onClick={() => {
          setSelectionStart(0);
          setSelectionEnd(0);
        }} style={{
          padding: '6px 12px',
          fontSize: '12px',
          cursor: 'pointer'
        }}>
            Clear Selection
          </button>
        </div>
        <p style={{
        margin: 0,
        fontSize: '12px',
        color: '#666'
      }}>
          Current: {selectionStart.toFixed(2)}s - {selectionEnd.toFixed(2)}s (Duration: {(selectionEnd - selectionStart).toFixed(2)}s)
        </p>
      </div>

      <SelectionToolbar selectionStart={selectionStart === 0 && selectionEnd === 0 ? null : selectionStart} selectionEnd={selectionStart === 0 && selectionEnd === 0 ? null : selectionEnd} format={format} onFormatChange={newFormat => {
      console.log('Format changed to:', newFormat);
      setFormat(newFormat);
    }} onSelectionStartChange={newStart => {
      console.log('Selection start changed to:', newStart);
      setSelectionStart(newStart);
    }} onSelectionEndChange={newEnd => {
      console.log('Selection end changed to:', newEnd);
      setSelectionEnd(newEnd);
    }} />
    </div>;
}`,...(J=(H=r.parameters)==null?void 0:H.docs)==null?void 0:J.source},description:{story:"Interactive demo with format switching",...(M=(K=r.parameters)==null?void 0:K.docs)==null?void 0:M.description}}};var P,Q,U,V,X;a.parameters={...a.parameters,docs:{...(P=a.parameters)==null?void 0:P.docs,source:{originalSource:`() => {
  const selectionStart = 125.5;
  const selectionEnd = 256.25;
  const formats: Array<{
    label: string;
    format: any;
  }> = [{
    label: 'hh:mm:ss',
    format: 'hh:mm:ss'
  }, {
    label: 'hh:mm:ss + milliseconds',
    format: 'hh:mm:ss+milliseconds'
  }, {
    label: 'hh:mm:ss + samples',
    format: 'hh:mm:ss+samples'
  }, {
    label: 'seconds + milliseconds',
    format: 'seconds+milliseconds'
  }, {
    label: 'samples',
    format: 'samples'
  }];
  return <div style={{
    display: 'flex',
    flexDirection: 'column'
  }}>
      {formats.map(({
      label,
      format
    }) => <div key={format} style={{
      marginBottom: '1px'
    }}>
          <div style={{
        padding: '8px 16px',
        background: '#f8f8f9',
        borderBottom: '1px solid #d4d5d9',
        fontSize: '11px',
        fontWeight: 600
      }}>
            {label}
          </div>
          <SelectionToolbar selectionStart={selectionStart} selectionEnd={selectionEnd} format={format} sampleRate={44100} />
        </div>)}
    </div>;
}`,...(U=(Q=a.parameters)==null?void 0:Q.docs)==null?void 0:U.source},description:{story:"All formats showcase",...(X=(V=a.parameters)==null?void 0:V.docs)==null?void 0:X.description}}};const se=["WithSelection","NoSelection","SampleFormat","SecondsFormat","LongSelection","Interactive","AllFormats"];export{a as AllFormats,r as Interactive,p as LongSelection,c as NoSelection,m as SampleFormat,d as SecondsFormat,i as WithSelection,se as __namedExportsOrder,oe as default};
