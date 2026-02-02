import{a1 as t,R as e,a0 as n,b as M,l as Q,N as U}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const Z={title:"Components/Table/TableCell",component:t,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{width:{control:"number",description:"Fixed width in pixels"},flexGrow:{control:"boolean",description:"Whether the cell should grow to fill available space"},align:{control:"radio",options:["left","center"],description:"Text alignment"}}},l={render:()=>e.createElement(n,null,e.createElement(t,null,"Simple text content"))},o={render:()=>{const[r,a]=e.useState(!0);return e.createElement(n,null,e.createElement(t,{align:"center"},e.createElement(M,{checked:r,onChange:a})))}},s={render:()=>{const[r,a]=e.useState("option1");return e.createElement(n,null,e.createElement(t,{width:200},e.createElement(Q,{value:r,onChange:a,options:[{value:"option1",label:"Option 1"},{value:"option2",label:"Option 2"},{value:"option3",label:"Option 3"}]})))}},c={render:()=>{const[r,a]=e.useState("");return e.createElement(n,null,e.createElement(t,{width:240},e.createElement(U,{value:r,onChange:a,placeholder:"Search..."})))}},i={render:()=>e.createElement(n,null,e.createElement(t,null,e.createElement("div",{style:{display:"flex",alignItems:"center",gap:"8px"}},e.createElement("div",{style:{width:"8px",height:"8px",borderRadius:"50%",background:"#4ade80"}}),e.createElement("span",null,"Active Plugin"))))},d={render:()=>e.createElement(n,null,e.createElement(t,{align:"center"},"Centered text"))},p={render:()=>e.createElement("div",{style:{width:"300px"}},e.createElement(n,null,e.createElement(t,{width:300},"This is a very long text that will be truncated with ellipsis because it exceeds the cell width")),e.createElement("div",{style:{marginTop:"16px",fontSize:"12px",color:"#666",fontFamily:"Inter, sans-serif"}},"Long content is truncated with ellipsis when it exceeds the cell width"))};var u,h,m,b,w;l.parameters={...l.parameters,docs:{...(u=l.parameters)==null?void 0:u.docs,source:{originalSource:`{
  render: () => <TableRow>
      <TableCell>Simple text content</TableCell>
    </TableRow>
}`,...(m=(h=l.parameters)==null?void 0:h.docs)==null?void 0:m.source},description:{story:"Basic cell with plain text content",...(w=(b=l.parameters)==null?void 0:b.docs)==null?void 0:w.description}}};var C,T,g,x,v;o.parameters={...o.parameters,docs:{...(C=o.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => {
    const [checked, setChecked] = React.useState(true);
    return <TableRow>
        <TableCell align="center">
          <Checkbox checked={checked} onChange={setChecked} />
        </TableCell>
      </TableRow>;
  }
}`,...(g=(T=o.parameters)==null?void 0:T.docs)==null?void 0:g.source},description:{story:"Cell with a checkbox control",...(v=(x=o.parameters)==null?void 0:x.docs)==null?void 0:v.description}}};var y,E,S,R,f;s.parameters={...s.parameters,docs:{...(y=s.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: () => {
    const [value, setValue] = React.useState('option1');
    return <TableRow>
        <TableCell width={200}>
          <Dropdown value={value} onChange={setValue} options={[{
          value: 'option1',
          label: 'Option 1'
        }, {
          value: 'option2',
          label: 'Option 2'
        }, {
          value: 'option3',
          label: 'Option 3'
        }]} />
        </TableCell>
      </TableRow>;
  }
}`,...(S=(E=s.parameters)==null?void 0:E.docs)==null?void 0:S.source},description:{story:"Cell with a dropdown control",...(f=(R=s.parameters)==null?void 0:R.docs)==null?void 0:f.description}}};var k,F,O,W,V;c.parameters={...c.parameters,docs:{...(k=c.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => {
    const [value, setValue] = React.useState('');
    return <TableRow>
        <TableCell width={240}>
          <SearchField value={value} onChange={setValue} placeholder="Search..." />
        </TableCell>
      </TableRow>;
  }
}`,...(O=(F=c.parameters)==null?void 0:F.docs)==null?void 0:O.source},description:{story:"Cell with a search field",...(V=(W=c.parameters)==null?void 0:W.docs)==null?void 0:V.description}}};var D,I,z,A,L;i.parameters={...i.parameters,docs:{...(D=i.parameters)==null?void 0:D.docs,source:{originalSource:`{
  render: () => <TableRow>
      <TableCell>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
          <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#4ade80'
        }} />
          <span>Active Plugin</span>
        </div>
      </TableCell>
    </TableRow>
}`,...(z=(I=i.parameters)==null?void 0:I.docs)==null?void 0:z.source},description:{story:"Cell with custom styled content (status indicator)",...(L=(A=i.parameters)==null?void 0:A.docs)==null?void 0:L.description}}};var P,_,B,G,N;d.parameters={...d.parameters,docs:{...(P=d.parameters)==null?void 0:P.docs,source:{originalSource:`{
  render: () => <TableRow>
      <TableCell align="center">
        Centered text
      </TableCell>
    </TableRow>
}`,...(B=(_=d.parameters)==null?void 0:_.docs)==null?void 0:B.source},description:{story:"Centered alignment",...(N=(G=d.parameters)==null?void 0:G.docs)==null?void 0:N.description}}};var j,q,H,J,K;p.parameters={...p.parameters,docs:{...(j=p.parameters)==null?void 0:j.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '300px'
  }}>
      <TableRow>
        <TableCell width={300}>
          This is a very long text that will be truncated with ellipsis because it exceeds the cell width
        </TableCell>
      </TableRow>
      <div style={{
      marginTop: '16px',
      fontSize: '12px',
      color: '#666',
      fontFamily: 'Inter, sans-serif'
    }}>
        Long content is truncated with ellipsis when it exceeds the cell width
      </div>
    </div>
}`,...(H=(q=p.parameters)==null?void 0:q.docs)==null?void 0:H.source},description:{story:"Cell with long text that gets truncated with ellipsis",...(K=(J=p.parameters)==null?void 0:J.docs)==null?void 0:K.description}}};const $=["Text","WithCheckbox","WithDropdown","WithSearchField","CustomContent","Centered","TextTruncation"];export{d as Centered,i as CustomContent,l as Text,p as TextTruncation,o as WithCheckbox,s as WithDropdown,c as WithSearchField,$ as __namedExportsOrder,Z as default};
