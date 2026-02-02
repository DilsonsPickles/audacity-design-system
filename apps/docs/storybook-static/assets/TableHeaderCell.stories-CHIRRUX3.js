import{_ as t,R as e,Y as l,Z as a}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const L={title:"Components/Table/TableHeaderCell",component:t,parameters:{layout:"padded"},tags:["autodocs"]},n={render:()=>e.createElement("div",{style:{width:"600px"}},e.createElement(l,null,e.createElement(a,null,e.createElement(t,{width:200},"Column 1"),e.createElement(t,{width:200},"Column 2"),e.createElement(t,{width:200},"Column 3"))))},o={render:()=>{const[r,b]=e.useState(null);return e.createElement("div",{style:{width:"600px"}},e.createElement(l,null,e.createElement(a,null,e.createElement(t,{width:200},"Not Sortable"),e.createElement(t,{width:200,sortable:!0,sortDirection:r,onSort:()=>b(r==="asc"?"desc":"asc")},"Sortable Column"),e.createElement(t,{width:200},"Not Sortable"))),e.createElement("div",{style:{marginTop:"16px",fontSize:"12px",color:"#666",fontFamily:"Inter, sans-serif"}},"Click the middle column to toggle sort direction"))}},d={render:()=>e.createElement("div",{style:{width:"800px",display:"flex",flexDirection:"column",gap:"16px"}},e.createElement("div",null,e.createElement("div",{style:{fontSize:"12px",marginBottom:"8px",fontFamily:"Inter, sans-serif",fontWeight:500}},"No sort (default)"),e.createElement(l,null,e.createElement(a,null,e.createElement(t,{width:200,sortable:!0},"Column Name")))),e.createElement("div",null,e.createElement("div",{style:{fontSize:"12px",marginBottom:"8px",fontFamily:"Inter, sans-serif",fontWeight:500}},"Ascending"),e.createElement(l,null,e.createElement(a,null,e.createElement(t,{width:200,sortable:!0,sortDirection:"asc"},"Column Name")))),e.createElement("div",null,e.createElement("div",{style:{fontSize:"12px",marginBottom:"8px",fontFamily:"Inter, sans-serif",fontWeight:500}},"Descending"),e.createElement(l,null,e.createElement(a,null,e.createElement(t,{width:200,sortable:!0,sortDirection:"desc"},"Column Name")))))},s={render:()=>e.createElement("div",{style:{width:"600px"}},e.createElement(l,null,e.createElement(a,null,e.createElement(t,{width:200},"Left (default)"),e.createElement(t,{width:200,align:"center"},"Center"),e.createElement(t,{width:200},"Left (default)"))))},i={render:()=>e.createElement("div",{style:{width:"800px"}},e.createElement(l,null,e.createElement(a,null,e.createElement(t,{width:80,align:"center"},"Enabled"),e.createElement(t,{width:250,sortable:!0},"Name"),e.createElement(t,{flexGrow:!0},"Path"),e.createElement(t,{width:120,sortable:!0},"Type"))),e.createElement("div",{style:{marginTop:"16px",fontSize:"12px",color:"#666",fontFamily:"Inter, sans-serif"}},"Typical plugin manager table header layout"))},c={render:()=>e.createElement("div",{style:{width:"800px"}},e.createElement(l,null,e.createElement(a,null,e.createElement(t,{width:100},"Fixed 100px"),e.createElement(t,{flexGrow:!0},"This column grows to fill remaining space"),e.createElement(t,{width:100},"Fixed 100px"))))},m={render:()=>{const[r,b]=e.useState(null),[u,B]=e.useState(null);return e.createElement("div",{style:{width:"800px"}},e.createElement(l,null,e.createElement(a,null,e.createElement(t,{width:80,align:"center"},"Checkbox"),e.createElement(t,{width:250,sortable:!0,sortDirection:r,onSort:()=>b(r==="asc"?"desc":"asc")},"Name (Sortable)"),e.createElement(t,{flexGrow:!0},"Path (Flex Grow)"),e.createElement(t,{width:120,sortable:!0,sortDirection:u,onSort:()=>B(u==="asc"?"desc":"asc")},"Type (Sortable)"))))}};var T,p,h;n.parameters={...n.parameters,docs:{...(T=n.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '600px'
  }}>
      <Table>
        <TableHeader>
          <TableHeaderCell width={200}>Column 1</TableHeaderCell>
          <TableHeaderCell width={200}>Column 2</TableHeaderCell>
          <TableHeaderCell width={200}>Column 3</TableHeaderCell>
        </TableHeader>
      </Table>
    </div>
}`,...(h=(p=n.parameters)==null?void 0:p.docs)==null?void 0:h.source}}};var C,H,w;o.parameters={...o.parameters,docs:{...(C=o.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => {
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc' | null>(null);
    return <div style={{
      width: '600px'
    }}>
        <Table>
          <TableHeader>
            <TableHeaderCell width={200}>Not Sortable</TableHeaderCell>
            <TableHeaderCell width={200} sortable sortDirection={sortDirection} onSort={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}>
              Sortable Column
            </TableHeaderCell>
            <TableHeaderCell width={200}>Not Sortable</TableHeaderCell>
          </TableHeader>
        </Table>
        <div style={{
        marginTop: '16px',
        fontSize: '12px',
        color: '#666',
        fontFamily: 'Inter, sans-serif'
      }}>
          Click the middle column to toggle sort direction
        </div>
      </div>;
  }
}`,...(w=(H=o.parameters)==null?void 0:H.docs)==null?void 0:w.source}}};var x,f,E;d.parameters={...d.parameters,docs:{...(x=d.parameters)==null?void 0:x.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '800px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  }}>
      <div>
        <div style={{
        fontSize: '12px',
        marginBottom: '8px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500
      }}>
          No sort (default)
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell width={200} sortable>
              Column Name
            </TableHeaderCell>
          </TableHeader>
        </Table>
      </div>
      <div>
        <div style={{
        fontSize: '12px',
        marginBottom: '8px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500
      }}>
          Ascending
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell width={200} sortable sortDirection="asc">
              Column Name
            </TableHeaderCell>
          </TableHeader>
        </Table>
      </div>
      <div>
        <div style={{
        fontSize: '12px',
        marginBottom: '8px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500
      }}>
          Descending
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell width={200} sortable sortDirection="desc">
              Column Name
            </TableHeaderCell>
          </TableHeader>
        </Table>
      </div>
    </div>
}`,...(E=(f=d.parameters)==null?void 0:f.docs)==null?void 0:E.source}}};var S,g,v;s.parameters={...s.parameters,docs:{...(S=s.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '600px'
  }}>
      <Table>
        <TableHeader>
          <TableHeaderCell width={200}>Left (default)</TableHeaderCell>
          <TableHeaderCell width={200} align="center">
            Center
          </TableHeaderCell>
          <TableHeaderCell width={200}>Left (default)</TableHeaderCell>
        </TableHeader>
      </Table>
    </div>
}`,...(v=(g=s.parameters)==null?void 0:g.docs)==null?void 0:v.source}}};var y,D,F;i.parameters={...i.parameters,docs:{...(y=i.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '800px'
  }}>
      <Table>
        <TableHeader>
          <TableHeaderCell width={80} align="center">
            Enabled
          </TableHeaderCell>
          <TableHeaderCell width={250} sortable>
            Name
          </TableHeaderCell>
          <TableHeaderCell flexGrow>
            Path
          </TableHeaderCell>
          <TableHeaderCell width={120} sortable>
            Type
          </TableHeaderCell>
        </TableHeader>
      </Table>
      <div style={{
      marginTop: '16px',
      fontSize: '12px',
      color: '#666',
      fontFamily: 'Inter, sans-serif'
    }}>
        Typical plugin manager table header layout
      </div>
    </div>
}`,...(F=(D=i.parameters)==null?void 0:D.docs)==null?void 0:F.source}}};var N,z,G;c.parameters={...c.parameters,docs:{...(N=c.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '800px'
  }}>
      <Table>
        <TableHeader>
          <TableHeaderCell width={100}>Fixed 100px</TableHeaderCell>
          <TableHeaderCell flexGrow>This column grows to fill remaining space</TableHeaderCell>
          <TableHeaderCell width={100}>Fixed 100px</TableHeaderCell>
        </TableHeader>
      </Table>
    </div>
}`,...(G=(z=c.parameters)==null?void 0:z.docs)==null?void 0:G.source}}};var I,W,A;m.parameters={...m.parameters,docs:{...(I=m.parameters)==null?void 0:I.docs,source:{originalSource:`{
  render: () => {
    const [sort1, setSort1] = React.useState<'asc' | 'desc' | null>(null);
    const [sort2, setSort2] = React.useState<'asc' | 'desc' | null>(null);
    return <div style={{
      width: '800px'
    }}>
        <Table>
          <TableHeader>
            <TableHeaderCell width={80} align="center">
              Checkbox
            </TableHeaderCell>
            <TableHeaderCell width={250} sortable sortDirection={sort1} onSort={() => setSort1(sort1 === 'asc' ? 'desc' : 'asc')}>
              Name (Sortable)
            </TableHeaderCell>
            <TableHeaderCell flexGrow>
              Path (Flex Grow)
            </TableHeaderCell>
            <TableHeaderCell width={120} sortable sortDirection={sort2} onSort={() => setSort2(sort2 === 'asc' ? 'desc' : 'asc')}>
              Type (Sortable)
            </TableHeaderCell>
          </TableHeader>
        </Table>
      </div>;
  }
}`,...(A=(W=m.parameters)==null?void 0:W.docs)==null?void 0:A.source}}};const P=["Default","Sortable","SortStates","CenterAligned","MixedWidths","FlexGrow","AllFeatures"];export{m as AllFeatures,s as CenterAligned,n as Default,c as FlexGrow,i as MixedWidths,d as SortStates,o as Sortable,P as __namedExportsOrder,L as default};
