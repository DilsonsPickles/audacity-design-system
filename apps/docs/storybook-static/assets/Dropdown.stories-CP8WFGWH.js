import{R as e,r as C}from"./index-yIsmwZOr.js";import{l as d}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const T={title:"Components/Dropdown",component:d,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{disabled:{control:"boolean"},width:{control:"text"}}},a=[{value:"en",label:"System (English)"},{value:"es",label:"Español"},{value:"fr",label:"Français"},{value:"de",label:"Deutsch"},{value:"it",label:"Italiano"},{value:"ja",label:"日本語"},{value:"zh",label:"中文"}];function t(n){const[V,W]=C.useState(n.value||"");return e.createElement(d,{...n,value:V,onChange:u=>{var c;W(u),(c=n.onChange)==null||c.call(n,u)}})}const l={render:n=>e.createElement(t,{...n}),args:{options:a,placeholder:"Select language",width:"290px"}},o={render:n=>e.createElement(t,{...n}),args:{options:a,value:"en",width:"290px"}},r={render:n=>e.createElement(t,{...n}),args:{options:a,value:"en",disabled:!0,width:"290px"}},i={render:n=>e.createElement(t,{...n}),args:{options:a,placeholder:"Select",width:"162px"}},p={render:n=>e.createElement(t,{...n}),args:{options:[{value:"1",label:"Option 1"},{value:"2",label:"Option 2"},{value:"3",label:"Option 3"},{value:"4",label:"Option 4"},{value:"5",label:"Option 5"},{value:"6",label:"Option 6"},{value:"7",label:"Option 7"},{value:"8",label:"Option 8"},{value:"9",label:"Option 9"},{value:"10",label:"Option 10"},{value:"11",label:"Option 11"},{value:"12",label:"Option 12"},{value:"13",label:"Option 13"},{value:"14",label:"Option 14"},{value:"15",label:"Option 15"}],placeholder:"Select option",width:"200px"}},s={render:()=>e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"24px"}},e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontFamily:"Inter"}},"Idle"),e.createElement(d,{options:a,placeholder:"Select option",width:"200px"})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontFamily:"Inter"}},"With Value"),e.createElement(t,{options:a,value:"en",width:"200px"})),e.createElement("div",null,e.createElement("div",{style:{marginBottom:"8px",fontSize:"12px",fontFamily:"Inter"}},"Disabled"),e.createElement(d,{options:a,value:"en",disabled:!0,width:"200px"})))};var m,v,g;l.parameters={...l.parameters,docs:{...(m=l.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: args => <DropdownDemo {...args} />,
  args: {
    options: languageOptions,
    placeholder: 'Select language',
    width: '290px'
  }
}`,...(g=(v=l.parameters)==null?void 0:v.docs)==null?void 0:g.source}}};var b,O,x;o.parameters={...o.parameters,docs:{...(b=o.parameters)==null?void 0:b.docs,source:{originalSource:`{
  render: args => <DropdownDemo {...args} />,
  args: {
    options: languageOptions,
    value: 'en',
    width: '290px'
  }
}`,...(x=(O=o.parameters)==null?void 0:O.docs)==null?void 0:x.source}}};var h,w,D;r.parameters={...r.parameters,docs:{...(h=r.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: args => <DropdownDemo {...args} />,
  args: {
    options: languageOptions,
    value: 'en',
    disabled: true,
    width: '290px'
  }
}`,...(D=(w=r.parameters)==null?void 0:w.docs)==null?void 0:D.source}}};var S,f,E;i.parameters={...i.parameters,docs:{...(S=i.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: args => <DropdownDemo {...args} />,
  args: {
    options: languageOptions,
    placeholder: 'Select',
    width: '162px'
  }
}`,...(E=(f=i.parameters)==null?void 0:f.docs)==null?void 0:E.source}}};var y,I,z;p.parameters={...p.parameters,docs:{...(y=p.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: args => <DropdownDemo {...args} />,
  args: {
    options: [{
      value: '1',
      label: 'Option 1'
    }, {
      value: '2',
      label: 'Option 2'
    }, {
      value: '3',
      label: 'Option 3'
    }, {
      value: '4',
      label: 'Option 4'
    }, {
      value: '5',
      label: 'Option 5'
    }, {
      value: '6',
      label: 'Option 6'
    }, {
      value: '7',
      label: 'Option 7'
    }, {
      value: '8',
      label: 'Option 8'
    }, {
      value: '9',
      label: 'Option 9'
    }, {
      value: '10',
      label: 'Option 10'
    }, {
      value: '11',
      label: 'Option 11'
    }, {
      value: '12',
      label: 'Option 12'
    }, {
      value: '13',
      label: 'Option 13'
    }, {
      value: '14',
      label: 'Option 14'
    }, {
      value: '15',
      label: 'Option 15'
    }],
    placeholder: 'Select option',
    width: '200px'
  }
}`,...(z=(I=p.parameters)==null?void 0:I.docs)==null?void 0:z.source}}};var F,B,L;s.parameters={...s.parameters,docs:{...(F=s.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  }}>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontFamily: 'Inter'
      }}>
          Idle
        </div>
        <Dropdown options={languageOptions} placeholder="Select option" width="200px" />
      </div>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontFamily: 'Inter'
      }}>
          With Value
        </div>
        <DropdownDemo options={languageOptions} value="en" width="200px" />
      </div>
      <div>
        <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        fontFamily: 'Inter'
      }}>
          Disabled
        </div>
        <Dropdown options={languageOptions} value="en" disabled={true} width="200px" />
      </div>
    </div>
}`,...(L=(B=s.parameters)==null?void 0:B.docs)==null?void 0:L.source}}};const k=["Default","WithValue","Disabled","Narrow","LongList","AllStates"];export{s as AllStates,l as Default,r as Disabled,p as LongList,i as Narrow,o as WithValue,k as __namedExportsOrder,T as default};
