import{R as e}from"./index-yIsmwZOr.js";import{U as i,V as r,G as n,I as t,W as m,X as o,O as u}from"./index-DR-q5OqV.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const O={title:"Layout/Toolbar",component:i,parameters:{layout:"fullscreen"},tags:["autodocs"]},a={args:{children:"Toolbar content"}},s={render:()=>e.createElement(i,null,e.createElement(r,{gap:4},e.createElement(n,null,e.createElement(t,{name:"fa-bars",size:16})),e.createElement(n,null,e.createElement(t,{name:"fa-folder-open",size:16}))),e.createElement(m,null),e.createElement(r,{gap:2},e.createElement(o,{icon:""}),e.createElement(o,{icon:""}),e.createElement(o,{icon:""}),e.createElement(o,{icon:""}),e.createElement(o,{icon:""}),e.createElement(o,{icon:""})),e.createElement(m,null),e.createElement(r,{gap:4},e.createElement(u,null,e.createElement(t,{name:"fa-magnet",size:16})),e.createElement(u,{isActive:!0},e.createElement(t,{name:"fa-wave-square",size:16}))))},c={render:()=>e.createElement(i,{rightContent:e.createElement(r,{gap:4},e.createElement(n,null,e.createElement(t,{name:"fa-gear",size:16})),e.createElement(n,null,e.createElement(t,{name:"fa-question-circle",size:16})))},e.createElement(r,{gap:4},e.createElement(n,null,e.createElement(t,{name:"fa-play",size:16})),e.createElement(n,null,e.createElement(t,{name:"fa-pause",size:16})),e.createElement(n,null,e.createElement(t,{name:"fa-stop",size:16}))))},l={render:()=>e.createElement(i,{height:64},e.createElement(r,{gap:4},e.createElement(n,null,e.createElement(t,{name:"fa-file",size:20})),e.createElement(n,null,e.createElement(t,{name:"fa-folder",size:20}))))};var p,d,g,h,B;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    children: 'Toolbar content'
  }
}`,...(g=(d=a.parameters)==null?void 0:d.docs)==null?void 0:g.source},description:{story:"Basic toolbar with simple text content",...(B=(h=a.parameters)==null?void 0:h.docs)==null?void 0:B.description}}};var f,E,T,G,b;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => <Toolbar>
      <ToolbarButtonGroup gap={4}>
        <GhostButton>
          <Icon name="fa-bars" size={16} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-folder-open" size={16} />
        </GhostButton>
      </ToolbarButtonGroup>

      <ToolbarDivider />

      <ToolbarButtonGroup gap={2}>
        <TransportButton icon={String.fromCharCode(0xF448)} />
        <TransportButton icon={String.fromCharCode(0xF446)} />
        <TransportButton icon={String.fromCharCode(0xF44B)} />
        <TransportButton icon={String.fromCharCode(0xF447)} />
        <TransportButton icon={String.fromCharCode(0xF449)} />
        <TransportButton icon={String.fromCharCode(0xF44A)} />
      </ToolbarButtonGroup>

      <ToolbarDivider />

      <ToolbarButtonGroup gap={4}>
        <ToggleButton>
          <Icon name="fa-magnet" size={16} />
        </ToggleButton>
        <ToggleButton isActive>
          <Icon name="fa-wave-square" size={16} />
        </ToggleButton>
      </ToolbarButtonGroup>
    </Toolbar>
}`,...(T=(E=s.parameters)==null?void 0:E.docs)==null?void 0:T.source},description:{story:"Toolbar with button groups and dividers matching Figma design",...(b=(G=s.parameters)==null?void 0:G.docs)==null?void 0:b.description}}};var C,z,S,I,x;c.parameters={...c.parameters,docs:{...(C=c.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => <Toolbar rightContent={<ToolbarButtonGroup gap={4}>
          <GhostButton>
            <Icon name="fa-gear" size={16} />
          </GhostButton>
          <GhostButton>
            <Icon name="fa-question-circle" size={16} />
          </GhostButton>
        </ToolbarButtonGroup>}>
      <ToolbarButtonGroup gap={4}>
        <GhostButton>
          <Icon name="fa-play" size={16} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-pause" size={16} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-stop" size={16} />
        </GhostButton>
      </ToolbarButtonGroup>
    </Toolbar>
}`,...(S=(z=c.parameters)==null?void 0:z.docs)==null?void 0:S.source},description:{story:"Toolbar with content in both left and right sections",...(x=(I=c.parameters)==null?void 0:I.docs)==null?void 0:x.description}}};var v,y,F,w,W;l.parameters={...l.parameters,docs:{...(v=l.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => <Toolbar height={64}>
      <ToolbarButtonGroup gap={4}>
        <GhostButton>
          <Icon name="fa-file" size={20} />
        </GhostButton>
        <GhostButton>
          <Icon name="fa-folder" size={20} />
        </GhostButton>
      </ToolbarButtonGroup>
    </Toolbar>
}`,...(F=(y=l.parameters)==null?void 0:y.docs)==null?void 0:F.source},description:{story:"Custom height toolbar",...(W=(w=l.parameters)==null?void 0:w.docs)==null?void 0:W.description}}};const _=["Basic","WithButtonGroups","WithRightContent","CustomHeight"];export{a as Basic,l as CustomHeight,s as WithButtonGroups,c as WithRightContent,_ as __namedExportsOrder,O as default};
