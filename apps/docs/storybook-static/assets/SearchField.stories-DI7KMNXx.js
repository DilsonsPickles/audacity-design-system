import{r as m,R as e}from"./index-yIsmwZOr.js";import{w as t}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const Q={title:"Components/SearchField",component:t,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{value:{control:"text",description:"Current value of the search field"},placeholder:{control:"text",description:"Placeholder text"},disabled:{control:"boolean",description:"Whether the field is disabled"},width:{control:"number",description:"Width of the search field in pixels"}}},a={args:{placeholder:"Search",width:162}},r={args:{value:"Search term",placeholder:"Search",width:162}},s={args:{placeholder:"Search",disabled:!0,width:162}},l={args:{placeholder:"Search",width:250}},i={render:d=>{const[o,c]=m.useState("");return e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",alignItems:"center"}},e.createElement(t,{...d,value:o,onChange:c,onClear:()=>{c(""),console.log("Cleared")},onSubmit:p=>console.log("Submitted:",p)}),e.createElement("div",{style:{fontSize:"12px",color:"#666"}},'Current value: "',o,'"'))},args:{placeholder:"Search",width:200}},n={render:()=>{const[d,o]=m.useState(""),[c,p]=m.useState("Search term");return e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px",padding:"20px"}},e.createElement("div",{style:{display:"flex",alignItems:"center",gap:"12px"}},e.createElement("span",{style:{fontSize:"12px",width:"100px"}},"Empty:"),e.createElement(t,{value:d,onChange:o})),e.createElement("div",{style:{display:"flex",alignItems:"center",gap:"12px"}},e.createElement("span",{style:{fontSize:"12px",width:"100px"}},"With value:"),e.createElement(t,{value:c,onChange:p})),e.createElement("div",{style:{display:"flex",alignItems:"center",gap:"12px"}},e.createElement("span",{style:{fontSize:"12px",width:"100px"}},"Disabled:"),e.createElement(t,{disabled:!0})),e.createElement("div",{style:{display:"flex",alignItems:"center",gap:"12px"}},e.createElement("span",{style:{fontSize:"12px",width:"100px"}},"Wide:"),e.createElement(t,{width:250,placeholder:"Search for something..."})))}};var h,u,g,x,S;a.parameters={...a.parameters,docs:{...(h=a.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    placeholder: 'Search',
    width: 162
  }
}`,...(g=(u=a.parameters)==null?void 0:u.docs)==null?void 0:g.source},description:{story:"Default empty state",...(S=(x=a.parameters)==null?void 0:x.docs)==null?void 0:S.description}}};var v,y,f,w,E;r.parameters={...r.parameters,docs:{...(v=r.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    value: 'Search term',
    placeholder: 'Search',
    width: 162
  }
}`,...(f=(y=r.parameters)==null?void 0:y.docs)==null?void 0:f.source},description:{story:"With a search term entered",...(E=(w=r.parameters)==null?void 0:w.docs)==null?void 0:E.description}}};var b,C,I,D,V;s.parameters={...s.parameters,docs:{...(b=s.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    placeholder: 'Search',
    disabled: true,
    width: 162
  }
}`,...(I=(C=s.parameters)==null?void 0:C.docs)==null?void 0:I.source},description:{story:"Disabled state",...(V=(D=s.parameters)==null?void 0:D.docs)==null?void 0:V.description}}};var W,z,F,A,R;l.parameters={...l.parameters,docs:{...(W=l.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    placeholder: 'Search',
    width: 250
  }
}`,...(F=(z=l.parameters)==null?void 0:z.docs)==null?void 0:F.source},description:{story:"Wider search field",...(R=(A=l.parameters)==null?void 0:A.docs)==null?void 0:R.description}}};var _,O,P,T,j;i.parameters={...i.parameters,docs:{...(_=i.parameters)==null?void 0:_.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState('');
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      alignItems: 'center'
    }}>
        <SearchField {...args} value={value} onChange={setValue} onClear={() => {
        setValue('');
        console.log('Cleared');
      }} onSubmit={val => console.log('Submitted:', val)} />
        <div style={{
        fontSize: '12px',
        color: '#666'
      }}>
          Current value: "{value}"
        </div>
      </div>;
  },
  args: {
    placeholder: 'Search',
    width: 200
  }
}`,...(P=(O=i.parameters)==null?void 0:O.docs)==null?void 0:P.source},description:{story:"Interactive example with state management",...(j=(T=i.parameters)==null?void 0:T.docs)==null?void 0:j.description}}};var k,q,B,G,H;n.parameters={...n.parameters,docs:{...(k=n.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => {
    const [value1, setValue1] = useState('');
    const [value2, setValue2] = useState('Search term');
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px'
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
          <span style={{
          fontSize: '12px',
          width: '100px'
        }}>Empty:</span>
          <SearchField value={value1} onChange={setValue1} />
        </div>

        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
          <span style={{
          fontSize: '12px',
          width: '100px'
        }}>With value:</span>
          <SearchField value={value2} onChange={setValue2} />
        </div>

        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
          <span style={{
          fontSize: '12px',
          width: '100px'
        }}>Disabled:</span>
          <SearchField disabled />
        </div>

        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
          <span style={{
          fontSize: '12px',
          width: '100px'
        }}>Wide:</span>
          <SearchField width={250} placeholder="Search for something..." />
        </div>
      </div>;
  }
}`,...(B=(q=n.parameters)==null?void 0:q.docs)==null?void 0:B.source},description:{story:"All states showcased together",...(H=(G=n.parameters)==null?void 0:G.docs)==null?void 0:H.description}}};const U=["Default","WithValue","Disabled","Wide","Interactive","AllStates"];export{n as AllStates,a as Default,s as Disabled,i as Interactive,l as Wide,r as WithValue,U as __namedExportsOrder,Q as default};
