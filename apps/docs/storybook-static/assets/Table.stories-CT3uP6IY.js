import{Y as i,R as e,Z as T,_ as l,$ as p,a0 as h,a1 as t,b as u}from"./iframe-cFmfFvS6.js";import"./preload-helper-C1FmrZbK.js";const V={title:"Components/Table",component:i,parameters:{layout:"padded"},tags:["autodocs"]},C=[{id:"1",name:"Reverb",type:"Nyquist",path:"/Library/Audio/Plug-Ins/Nyquist/reverb.ny",enabled:!0},{id:"2",name:"Delay",type:"Nyquist",path:"/Library/Audio/Plug-Ins/Nyquist/delay.ny",enabled:!0},{id:"3",name:"Compressor",type:"Internal effect",path:"/Applications/Audacity.app/Contents/PlugIns/compressor",enabled:!0},{id:"4",name:"Noise Gate",type:"Internal effect",path:"/Applications/Audacity.app/Contents/PlugIns/noisegate",enabled:!1},{id:"5",name:"AUGraphicEQ",type:"Audio unit",path:"/System/Library/Components/AUGraphicEQ.component",enabled:!0},{id:"6",name:"FabFilter Pro-Q 3",type:"VST3",path:"/Library/Audio/Plug-Ins/VST3/FabFilter Pro-Q 3.vst3",enabled:!0},{id:"7",name:"Valhalla VintageVerb",type:"VST",path:"/Library/Audio/Plug-Ins/VST/ValhallaVintageVerb.vst",enabled:!0},{id:"8",name:"TAP Equalizer",type:"LADSPA",path:"/usr/lib/ladspa/tap_eq.so",enabled:!0}],c={render:()=>e.createElement("div",{style:{width:"800px"}},e.createElement(i,null,e.createElement(T,null,e.createElement(l,{width:80,align:"center"},"Enabled"),e.createElement(l,{width:250},"Name"),e.createElement(l,{flexGrow:!0},"Path"),e.createElement(l,{width:120},"Type")),e.createElement(p,null,C.map(a=>e.createElement(h,{key:a.id},e.createElement(t,{width:80,align:"center"},e.createElement(u,{checked:a.enabled})),e.createElement(t,{width:250},a.name),e.createElement(t,{flexGrow:!0},a.path),e.createElement(t,{width:120},a.type))))))},s={render:()=>{const[a,w]=e.useState(null),[o,r]=e.useState("asc"),d=n=>{a===n?r(o==="asc"?"desc":"asc"):(w(n),r("asc"))},R=[...C].sort((n,A)=>{if(!a)return 0;const y=n[a].localeCompare(A[a]);return o==="asc"?y:-y});return e.createElement("div",{style:{width:"800px"}},e.createElement(i,null,e.createElement(T,null,e.createElement(l,{width:80,align:"center"},"Enabled"),e.createElement(l,{width:250,sortable:!0,sortDirection:a==="name"?o:null,onSort:()=>d("name")},"Name"),e.createElement(l,{flexGrow:!0},"Path"),e.createElement(l,{width:120,sortable:!0,sortDirection:a==="type"?o:null,onSort:()=>d("type")},"Type")),e.createElement(p,null,R.map(n=>e.createElement(h,{key:n.id},e.createElement(t,{width:80,align:"center"},e.createElement(u,{checked:n.enabled})),e.createElement(t,{width:250},n.name),e.createElement(t,{flexGrow:!0},n.path),e.createElement(t,{width:120},n.type))))))}},m={render:()=>e.createElement("div",{style:{width:"800px"}},e.createElement(i,{minBodyHeight:300,maxBodyHeight:300},e.createElement(T,null,e.createElement(l,{width:80,align:"center"},"Enabled"),e.createElement(l,{width:250},"Name"),e.createElement(l,{flexGrow:!0},"Path"),e.createElement(l,{width:120},"Type")),e.createElement(p,null,C.map(a=>e.createElement(h,{key:a.id},e.createElement(t,{width:80,align:"center"},e.createElement(u,{checked:a.enabled})),e.createElement(t,{width:250},a.name),e.createElement(t,{flexGrow:!0},a.path),e.createElement(t,{width:120},a.type))))))},b={render:()=>{const[a,w]=e.useState(C),o=r=>{w(a.map(d=>d.id===r?{...d,enabled:!d.enabled}:d))};return e.createElement("div",{style:{width:"800px"}},e.createElement(i,null,e.createElement(T,null,e.createElement(l,{width:80,align:"center"},"Enabled"),e.createElement(l,{width:250},"Name"),e.createElement(l,{flexGrow:!0},"Path"),e.createElement(l,{width:120},"Type")),e.createElement(p,null,a.map(r=>e.createElement(h,{key:r.id},e.createElement(t,{width:80,align:"center"},e.createElement(u,{checked:r.enabled,onChange:()=>o(r.id)})),e.createElement(t,{width:250},r.name),e.createElement(t,{flexGrow:!0},r.path),e.createElement(t,{width:120},r.type))))))}};var E,H,g;c.parameters={...c.parameters,docs:{...(E=c.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '800px'
  }}>
      <Table>
        <TableHeader>
          <TableHeaderCell width={80} align="center">
            Enabled
          </TableHeaderCell>
          <TableHeaderCell width={250}>
            Name
          </TableHeaderCell>
          <TableHeaderCell flexGrow>
            Path
          </TableHeaderCell>
          <TableHeaderCell width={120}>
            Type
          </TableHeaderCell>
        </TableHeader>
        <TableBody>
          {sampleData.map(item => <TableRow key={item.id}>
              <TableCell width={80} align="center">
                <Checkbox checked={item.enabled} />
              </TableCell>
              <TableCell width={250}>{item.name}</TableCell>
              <TableCell flexGrow>{item.path}</TableCell>
              <TableCell width={120}>{item.type}</TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>
}`,...(g=(H=c.parameters)==null?void 0:H.docs)==null?void 0:g.source}}};var S,x,f;s.parameters={...s.parameters,docs:{...(S=s.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: () => {
    const [sortColumn, setSortColumn] = React.useState<'name' | 'type' | null>(null);
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
    const handleSort = (column: 'name' | 'type') => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    };
    const sortedData = [...sampleData].sort((a, b) => {
      if (!sortColumn) return 0;
      const comparison = a[sortColumn].localeCompare(b[sortColumn]);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return <div style={{
      width: '800px'
    }}>
        <Table>
          <TableHeader>
            <TableHeaderCell width={80} align="center">
              Enabled
            </TableHeaderCell>
            <TableHeaderCell width={250} sortable sortDirection={sortColumn === 'name' ? sortDirection : null} onSort={() => handleSort('name')}>
              Name
            </TableHeaderCell>
            <TableHeaderCell flexGrow>
              Path
            </TableHeaderCell>
            <TableHeaderCell width={120} sortable sortDirection={sortColumn === 'type' ? sortDirection : null} onSort={() => handleSort('type')}>
              Type
            </TableHeaderCell>
          </TableHeader>
          <TableBody>
            {sortedData.map(item => <TableRow key={item.id}>
                <TableCell width={80} align="center">
                  <Checkbox checked={item.enabled} />
                </TableCell>
                <TableCell width={250}>{item.name}</TableCell>
                <TableCell flexGrow>{item.path}</TableCell>
                <TableCell width={120}>{item.type}</TableCell>
              </TableRow>)}
          </TableBody>
        </Table>
      </div>;
  }
}`,...(f=(x=s.parameters)==null?void 0:x.docs)==null?void 0:f.source}}};var D,k,G;m.parameters={...m.parameters,docs:{...(D=m.parameters)==null?void 0:D.docs,source:{originalSource:`{
  render: () => <div style={{
    width: '800px'
  }}>
      <Table minBodyHeight={300} maxBodyHeight={300}>
        <TableHeader>
          <TableHeaderCell width={80} align="center">
            Enabled
          </TableHeaderCell>
          <TableHeaderCell width={250}>
            Name
          </TableHeaderCell>
          <TableHeaderCell flexGrow>
            Path
          </TableHeaderCell>
          <TableHeaderCell width={120}>
            Type
          </TableHeaderCell>
        </TableHeader>
        <TableBody>
          {sampleData.map(item => <TableRow key={item.id}>
              <TableCell width={80} align="center">
                <Checkbox checked={item.enabled} />
              </TableCell>
              <TableCell width={250}>{item.name}</TableCell>
              <TableCell flexGrow>{item.path}</TableCell>
              <TableCell width={120}>{item.type}</TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>
}`,...(G=(k=m.parameters)==null?void 0:k.docs)==null?void 0:G.source}}};var v,P,B;b.parameters={...b.parameters,docs:{...(v=b.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => {
    const [data, setData] = React.useState(sampleData);
    const toggleEnabled = (id: string) => {
      setData(data.map(item => item.id === id ? {
        ...item,
        enabled: !item.enabled
      } : item));
    };
    return <div style={{
      width: '800px'
    }}>
        <Table>
          <TableHeader>
            <TableHeaderCell width={80} align="center">
              Enabled
            </TableHeaderCell>
            <TableHeaderCell width={250}>
              Name
            </TableHeaderCell>
            <TableHeaderCell flexGrow>
              Path
            </TableHeaderCell>
            <TableHeaderCell width={120}>
              Type
            </TableHeaderCell>
          </TableHeader>
          <TableBody>
            {data.map(item => <TableRow key={item.id}>
                <TableCell width={80} align="center">
                  <Checkbox checked={item.enabled} onChange={() => toggleEnabled(item.id)} />
                </TableCell>
                <TableCell width={250}>{item.name}</TableCell>
                <TableCell flexGrow>{item.path}</TableCell>
                <TableCell width={120}>{item.type}</TableCell>
              </TableRow>)}
          </TableBody>
        </Table>
      </div>;
  }
}`,...(B=(P=b.parameters)==null?void 0:P.docs)==null?void 0:B.source}}};const q=["Basic","WithSorting","WithScroll","Interactive"];export{c as Basic,b as Interactive,m as WithScroll,s as WithSorting,q as __namedExportsOrder,V as default};
