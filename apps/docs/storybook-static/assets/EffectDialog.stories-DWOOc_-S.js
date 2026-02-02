import{E as r,r as n,m as c,n as l,B as f,o as R}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const D={title:"Audio/EffectDialog",component:r,parameters:{layout:"centered"},tags:["autodocs"]},o={render:()=>{const[t,e]=n.useState(!1),[i,k]=n.useState({amplification:0,allowClipping:!1});return React.createElement(c,{initialTheme:l},React.createElement("div",null,React.createElement(f,{onClick:()=>e(!0)},"Open Amplify Effect"),React.createElement(r,{effectName:"Amplify",isOpen:t,onClose:()=>e(!1),onOk:()=>{console.log("Apply effect with params:",i)},onPreview:()=>{console.log("Preview effect with params:",i)}},React.createElement(R,{initialAmplification:i.amplification,initialAllowClipping:i.allowClipping,onChange:k}))))}},a={render:()=>{const[t,e]=n.useState(!1);return React.createElement(c,{initialTheme:l},React.createElement("div",null,React.createElement(f,{onClick:()=>e(!0)},"Open Custom Effect"),React.createElement(r,{effectName:"Custom Effect",isOpen:t,onClose:()=>e(!1),onOk:()=>{console.log("Apply custom effect")},width:700,height:600},React.createElement("div",{style:{padding:"20px"}},React.createElement("h3",null,"Custom Effect Controls"),React.createElement("p",null,"This is where you would add your custom effect UI."),React.createElement("p",null,"You can include sliders, knobs, waveform previews, or any other controls needed for the effect.")))))}},s={render:()=>{const[t,e]=n.useState(!1);return React.createElement(c,{initialTheme:l},React.createElement("div",null,React.createElement(f,{onClick:()=>e(!0)},"Open Effect (No Preview)"),React.createElement(r,{effectName:"Simple Effect",isOpen:t,onClose:()=>e(!1),onOk:()=>{console.log("Apply effect")}},React.createElement(R,null))))}};var p,m,u,d,h;o.parameters={...o.parameters,docs:{...(p=o.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [params, setParams] = useState({
      amplification: 0,
      allowClipping: false
    });
    return <ThemeProvider initialTheme={lightTheme}>
        <div>
          <Button onClick={() => setIsOpen(true)}>
            Open Amplify Effect
          </Button>

          <EffectDialog effectName="Amplify" isOpen={isOpen} onClose={() => setIsOpen(false)} onOk={() => {
          console.log('Apply effect with params:', params);
        }} onPreview={() => {
          console.log('Preview effect with params:', params);
        }}>
            <AmplifyEffect initialAmplification={params.amplification} initialAllowClipping={params.allowClipping} onChange={setParams} />
          </EffectDialog>
        </div>
      </ThemeProvider>;
  }
}`,...(u=(m=o.parameters)==null?void 0:m.docs)==null?void 0:u.source},description:{story:"Basic EffectDialog with Amplify effect content",...(h=(d=o.parameters)==null?void 0:d.docs)==null?void 0:h.description}}};var E,g,O,v,w;a.parameters={...a.parameters,docs:{...(E=a.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return <ThemeProvider initialTheme={lightTheme}>
        <div>
          <Button onClick={() => setIsOpen(true)}>
            Open Custom Effect
          </Button>

          <EffectDialog effectName="Custom Effect" isOpen={isOpen} onClose={() => setIsOpen(false)} onOk={() => {
          console.log('Apply custom effect');
        }} width={700} height={600}>
            <div style={{
            padding: '20px'
          }}>
              <h3>Custom Effect Controls</h3>
              <p>This is where you would add your custom effect UI.</p>
              <p>You can include sliders, knobs, waveform previews, or any other controls needed for the effect.</p>
            </div>
          </EffectDialog>
        </div>
      </ThemeProvider>;
  }
}`,...(O=(g=a.parameters)==null?void 0:g.docs)==null?void 0:O.source},description:{story:"EffectDialog with custom content",...(w=(v=a.parameters)==null?void 0:v.docs)==null?void 0:w.description}}};var C,y,A,T,P;s.parameters={...s.parameters,docs:{...(C=s.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return <ThemeProvider initialTheme={lightTheme}>
        <div>
          <Button onClick={() => setIsOpen(true)}>
            Open Effect (No Preview)
          </Button>

          <EffectDialog effectName="Simple Effect" isOpen={isOpen} onClose={() => setIsOpen(false)} onOk={() => {
          console.log('Apply effect');
        }}>
            <AmplifyEffect />
          </EffectDialog>
        </div>
      </ThemeProvider>;
  }
}`,...(A=(y=s.parameters)==null?void 0:y.docs)==null?void 0:A.source},description:{story:"EffectDialog without preview button",...(P=(T=s.parameters)==null?void 0:T.docs)==null?void 0:P.description}}};const B=["Amplify","CustomEffect","WithoutPreview"];export{o as Amplify,a as CustomEffect,s as WithoutPreview,B as __namedExportsOrder,D as default};
