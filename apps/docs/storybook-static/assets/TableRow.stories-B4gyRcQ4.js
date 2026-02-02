import{a0 as t,R as e,Y as i,$ as d,a1 as l}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const x={title:"Components/Table/TableRow",component:t,parameters:{layout:"padded"},tags:["autodocs"]},a={render:()=>e.createElement("div",{style:{width:"600px"}},e.createElement(i,null,e.createElement(d,null,e.createElement(t,null,e.createElement(l,{width:200},"Cell 1"),e.createElement(l,{width:200},"Cell 2"),e.createElement(l,{width:200},"Cell 3")))))},n={render:()=>e.createElement("div",{style:{width:"600px"}},e.createElement(i,null,e.createElement(d,null,e.createElement(t,null,e.createElement(l,{width:200},"Row 1, Cell 1"),e.createElement(l,{width:200},"Row 1, Cell 2"),e.createElement(l,{width:200},"Row 1, Cell 3")),e.createElement(t,null,e.createElement(l,{width:200},"Row 2, Cell 1"),e.createElement(l,{width:200},"Row 2, Cell 2"),e.createElement(l,{width:200},"Row 2, Cell 3")),e.createElement(t,null,e.createElement(l,{width:200},"Row 3, Cell 1"),e.createElement(l,{width:200},"Row 3, Cell 2"),e.createElement(l,{width:200},"Row 3, Cell 3")))))},r={render:()=>e.createElement("div",{style:{width:"600px"}},e.createElement(i,null,e.createElement(d,null,e.createElement(t,null,e.createElement(l,{width:200},"Hover over this row"),e.createElement(l,{width:200},"To see the hover effect"),e.createElement(l,{width:200},"Applied to the row")),e.createElement(t,null,e.createElement(l,{width:200},"Second row"),e.createElement(l,{width:200},"Also has hover"),e.createElement(l,{width:200},"State")))))},o={render:()=>e.createElement("div",{style:{width:"600px"}},e.createElement(i,null,e.createElement(d,null,e.createElement(t,null,e.createElement(l,{width:200},"All rows are 40px tall"),e.createElement(l,{width:200},"Consistent height"),e.createElement(l,{width:200},"Across all rows")),e.createElement(t,null,e.createElement(l,{width:200},"Even with"),e.createElement(l,{width:200},"Different content"),e.createElement(l,{width:200},"Lengths")))),e.createElement("div",{style:{marginTop:"16px",fontSize:"12px",color:"#666",fontFamily:"Inter, sans-serif"}},"Each row is exactly 40px in height"))};var w,s,c;a.parameters={...a.parameters,docs:{...(w=a.parameters)==null?void 0:w.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '600px'
  }}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell width={200}>Cell 1</TableCell>
            <TableCell width={200}>Cell 2</TableCell>
            <TableCell width={200}>Cell 3</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
}`,...(c=(s=a.parameters)==null?void 0:s.docs)==null?void 0:c.source}}};var T,b,h;n.parameters={...n.parameters,docs:{...(T=n.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '600px'
  }}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell width={200}>Row 1, Cell 1</TableCell>
            <TableCell width={200}>Row 1, Cell 2</TableCell>
            <TableCell width={200}>Row 1, Cell 3</TableCell>
          </TableRow>
          <TableRow>
            <TableCell width={200}>Row 2, Cell 1</TableCell>
            <TableCell width={200}>Row 2, Cell 2</TableCell>
            <TableCell width={200}>Row 2, Cell 3</TableCell>
          </TableRow>
          <TableRow>
            <TableCell width={200}>Row 3, Cell 1</TableCell>
            <TableCell width={200}>Row 3, Cell 2</TableCell>
            <TableCell width={200}>Row 3, Cell 3</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
}`,...(h=(b=n.parameters)==null?void 0:b.docs)==null?void 0:h.source}}};var C,m,E;r.parameters={...r.parameters,docs:{...(C=r.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '600px'
  }}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell width={200}>Hover over this row</TableCell>
            <TableCell width={200}>To see the hover effect</TableCell>
            <TableCell width={200}>Applied to the row</TableCell>
          </TableRow>
          <TableRow>
            <TableCell width={200}>Second row</TableCell>
            <TableCell width={200}>Also has hover</TableCell>
            <TableCell width={200}>State</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
}`,...(E=(m=r.parameters)==null?void 0:m.docs)==null?void 0:E.source}}};var p,R,u;o.parameters={...o.parameters,docs:{...(p=o.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '600px'
  }}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell width={200}>All rows are 40px tall</TableCell>
            <TableCell width={200}>Consistent height</TableCell>
            <TableCell width={200}>Across all rows</TableCell>
          </TableRow>
          <TableRow>
            <TableCell width={200}>Even with</TableCell>
            <TableCell width={200}>Different content</TableCell>
            <TableCell width={200}>Lengths</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div style={{
      marginTop: '16px',
      fontSize: '12px',
      color: '#666',
      fontFamily: 'Inter, sans-serif'
    }}>
        Each row is exactly 40px in height
      </div>
    </div>
}`,...(u=(R=o.parameters)==null?void 0:R.docs)==null?void 0:u.source}}};const f=["Default","MultipleRows","WithHoverState","FixedHeight"];export{a as Default,o as FixedHeight,n as MultipleRows,r as WithHoverState,f as __namedExportsOrder,x as default};
