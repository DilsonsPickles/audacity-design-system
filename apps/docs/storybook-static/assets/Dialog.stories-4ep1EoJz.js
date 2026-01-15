import{r as a,R as e}from"./index-yIsmwZOr.js";import{D as i,B as c,h as g,T as k,t as n,S as ce,L as u,i as x,j as de,k as pe}from"./index-DR-q5OqV.js";/* empty css              */import"./jsx-runtime-BjG_zV1W.js";import"./index-CZ_84MJS.js";import"./index-C1nsXWtN.js";const ye={title:"Components/Dialog",component:i,parameters:{layout:"centered"},tags:["autodocs"]},f={render:()=>{const[s,t]=a.useState(!1);return e.createElement(e.Fragment,null,e.createElement(c,{variant:"primary",onClick:()=>t(!0)},"Open Dialog"),e.createElement(i,{isOpen:s,title:"Basic Dialog",onClose:()=>t(!1),width:400},e.createElement("p",null,"This is a basic dialog with some content.")))}},h={render:()=>{const[s,t]=a.useState(!1);return e.createElement(e.Fragment,null,e.createElement(c,{variant:"primary",onClick:()=>t(!0)},"Open Dialog (No Padding)"),e.createElement(i,{isOpen:s,title:"No Padding",onClose:()=>t(!1),width:500,noPadding:!0},e.createElement("div",{style:{padding:"32px",backgroundColor:"#f0f0f0"}},e.createElement("p",{style:{margin:0}},"This dialog has noPadding=true."),e.createElement("p",{style:{margin:"8px 0 0 0"}},"The content manages its own padding (32px in this case)."))))}},S={render:()=>{const[s,t]=a.useState(!1);return e.createElement(e.Fragment,null,e.createElement(c,{variant:"primary",onClick:()=>t(!0)},"Open Dialog with Footer"),e.createElement(i,{isOpen:s,title:"Confirm Action",onClose:()=>t(!1),width:400,footer:e.createElement(g,{primaryText:"Confirm",secondaryText:"Cancel",onPrimaryClick:()=>{alert("Confirmed!"),t(!1)},onSecondaryClick:()=>t(!1)})},e.createElement("p",null,"Are you sure you want to perform this action?")))}},y={render:()=>{const[s,t]=a.useState(!1),[d,o]=a.useState(!0),[r,l]=a.useState("");return e.createElement(e.Fragment,null,e.createElement(k,null),e.createElement(c,{variant:"primary",onClick:()=>t(!0)},"Open Share Audio Dialog"),e.createElement(i,{isOpen:s,title:"Save to audio.com",onClose:()=>t(!1),width:400,minHeight:0,headerContent:e.createElement(ce,{signedIn:d,userName:"Alex Dawson",onSignOut:()=>o(!1)}),footer:e.createElement(g,{primaryText:"Done",secondaryText:"Cancel",onPrimaryClick:()=>{r.trim()?(n("Project saved successfully!","success"),t(!1)):n("Please enter a project name","error")},onSecondaryClick:()=>t(!1),primaryDisabled:!r.trim()})},e.createElement(u,{label:"Project name",value:r,onChange:l,placeholder:"Enter project name",width:"100%"})))}},C={render:()=>{const[s,t]=a.useState(!1),[d,o]=a.useState(""),[r,l]=a.useState("");return e.createElement(e.Fragment,null,e.createElement(k,null),e.createElement(c,{variant:"primary",onClick:()=>t(!0)},"Open Create Account Dialog"),e.createElement(i,{isOpen:s,title:"Save to audio.com",onClose:()=>t(!1),width:420,minHeight:0,footer:e.createElement(g,{primaryText:"Continue",secondaryText:"Cancel",onPrimaryClick:()=>{d.trim()&&r.trim()?(n("Account created successfully!","success"),t(!1)):n("Please fill in all fields","error")},onSecondaryClick:()=>t(!1)})},e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px"}},e.createElement("p",{style:{fontSize:"12px",lineHeight:"16px",margin:0}},"Create a free cloud storage account to access your projects and audio from any device"),e.createElement("div",{style:{display:"flex",gap:"8px"}},e.createElement(x,{provider:"google",onClick:()=>n("Google sign-in clicked","info")}),e.createElement(x,{provider:"facebook",onClick:()=>n("Facebook sign-in clicked","info")})),e.createElement(de,{label:"Or use email and password"}),e.createElement(u,{label:"Email",value:d,onChange:o,placeholder:"Enter email",width:"100%",type:"email"}),e.createElement(u,{label:"Password",value:r,onChange:l,placeholder:"Enter password",width:"100%",type:"password"}),e.createElement("div",{style:{display:"flex",gap:"4px",fontSize:"12px",lineHeight:"normal"}},e.createElement("span",null,"Already have an account?"),e.createElement(pe,{onClick:()=>n("Sign in clicked","info")},"Sign in here")))))}},w={render:()=>{const[s,t]=a.useState(!1),[d,o]=a.useState(!1),[r,l]=a.useState(!1),[I,O]=a.useState(""),[v,p]=a.useState(""),[D,m]=a.useState("");return e.createElement(e.Fragment,null,e.createElement(k,null),e.createElement("div",{style:{textAlign:"center"}},e.createElement(c,{variant:"primary",onClick:()=>t(!0)},"Start: Save to audio.com"),e.createElement("p",{style:{marginTop:"16px",fontSize:"12px",color:"#666",maxWidth:"500px",margin:"16px auto 0"}},e.createElement("strong",null,"Complete Flow:"),e.createElement("br",null),'1. Enter project name and click "Done"',e.createElement("br",null),"2. Sign-in dialog appears on top (Share Audio stays behind)",e.createElement("br",null),"3. Sign in (username: ",e.createElement("code",null,"admin"),", password: ",e.createElement("code",null,"password"),") or use social buttons",e.createElement("br",null),"4. After sign-in, return to Share Audio in signed-in state",e.createElement("br",null),'5. Click "Done" to save project')),e.createElement(i,{isOpen:s,title:"Save to audio.com",onClose:()=>{t(!1),O("")},width:400,minHeight:0,headerContent:e.createElement(ce,{signedIn:r,userName:"Alex Dawson",onSignOut:()=>l(!1)}),footer:e.createElement(g,{primaryText:"Done",secondaryText:"Cancel",onPrimaryClick:()=>{r?(n("Project saved successfully!","success"),t(!1),O("")):I.trim()?o(!0):n("Please enter a project name","error")},onSecondaryClick:()=>{t(!1),O("")},primaryDisabled:!I.trim()})},e.createElement(u,{label:"Project name",value:I,onChange:O,placeholder:"Enter project name",width:"100%"})),e.createElement(i,{isOpen:d,title:"Save to audio.com",onClose:()=>{o(!1),p(""),m("")},width:420,minHeight:0,footer:e.createElement(g,{primaryText:"Continue",secondaryText:"Cancel",onPrimaryClick:()=>{v==="admin"&&D==="password"?(n("Sign in successful!","success"),o(!1),l(!0),p(""),m("")):v.trim()&&D.trim()?n("Invalid email or password","error"):n("Please fill in all fields","error")},onSecondaryClick:()=>{o(!1),p(""),m("")}})},e.createElement("div",{style:{display:"flex",flexDirection:"column",gap:"16px"}},e.createElement("p",{style:{fontSize:"12px",lineHeight:"16px",margin:0}},"Create a free cloud storage account to access your projects and audio from any device"),e.createElement("div",{style:{display:"flex",gap:"8px"}},e.createElement(x,{provider:"google",onClick:()=>{n("Signed in with Google!","success"),o(!1),l(!0),p(""),m("")}}),e.createElement(x,{provider:"facebook",onClick:()=>{n("Signed in with Facebook!","success"),o(!1),l(!0),p(""),m("")}})),e.createElement(de,{label:"Or use email and password"}),e.createElement(u,{label:"Email",value:v,onChange:p,placeholder:"Enter email",width:"100%",type:"email"}),e.createElement(u,{label:"Password",value:D,onChange:m,placeholder:"Enter password",width:"100%",type:"password"}),e.createElement("div",{style:{display:"flex",gap:"4px",fontSize:"12px",lineHeight:"normal"}},e.createElement("span",null,"Already have an account?"),e.createElement(pe,{onClick:()=>{o(!1),n("Would show sign-in dialog","info")}},"Sign in here")))))}},E={render:()=>{const[s,t]=a.useState(!1);return e.createElement(e.Fragment,null,e.createElement(c,{variant:"primary",onClick:()=>t(!0)},"Open Wide Dialog"),e.createElement(i,{isOpen:s,title:"Wide Dialog",onClose:()=>t(!1),width:600,footer:e.createElement(g,{primaryText:"OK",secondaryText:"Cancel",onPrimaryClick:()=>t(!1),onSecondaryClick:()=>t(!1)})},e.createElement("p",null,"This is a wider dialog with 600px width.")))}};var P,b,A,j,T;f.parameters={...f.parameters,docs:{...(P=f.parameters)==null?void 0:P.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Dialog
        </Button>
        <Dialog isOpen={isOpen} title="Basic Dialog" onClose={() => setIsOpen(false)} width={400}>
          <p>This is a basic dialog with some content.</p>
        </Dialog>
      </>;
  }
}`,...(A=(b=f.parameters)==null?void 0:b.docs)==null?void 0:A.source},description:{story:"Basic dialog with title and content",...(T=(j=f.parameters)==null?void 0:j.docs)==null?void 0:T.description}}};var F,N,B,L,H;h.parameters={...h.parameters,docs:{...(F=h.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Dialog (No Padding)
        </Button>
        <Dialog isOpen={isOpen} title="No Padding" onClose={() => setIsOpen(false)} width={500} noPadding={true}>
          <div style={{
          padding: '32px',
          backgroundColor: '#f0f0f0'
        }}>
            <p style={{
            margin: 0
          }}>This dialog has noPadding=true.</p>
            <p style={{
            margin: '8px 0 0 0'
          }}>The content manages its own padding (32px in this case).</p>
          </div>
        </Dialog>
      </>;
  }
}`,...(B=(N=h.parameters)==null?void 0:N.docs)==null?void 0:B.source},description:{story:"Dialog with no padding - useful for custom layouts",...(H=(L=h.parameters)==null?void 0:L.docs)==null?void 0:H.description}}};var W,z,G,K,R;S.parameters={...S.parameters,docs:{...(W=S.parameters)==null?void 0:W.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Dialog with Footer
        </Button>
        <Dialog isOpen={isOpen} title="Confirm Action" onClose={() => setIsOpen(false)} width={400} footer={<DialogFooter primaryText="Confirm" secondaryText="Cancel" onPrimaryClick={() => {
        alert('Confirmed!');
        setIsOpen(false);
      }} onSecondaryClick={() => setIsOpen(false)} />}>
          <p>Are you sure you want to perform this action?</p>
        </Dialog>
      </>;
  }
}`,...(G=(z=S.parameters)==null?void 0:z.docs)==null?void 0:G.source},description:{story:"Dialog with footer buttons",...(R=(K=S.parameters)==null?void 0:K.docs)==null?void 0:R.description}}};var U,_,q,V,J;y.parameters={...y.parameters,docs:{...(U=y.parameters)==null?void 0:U.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(true);
    const [projectName, setProjectName] = useState('');
    return <>
        <ToastContainer />
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Share Audio Dialog
        </Button>
        <Dialog isOpen={isOpen} title="Save to audio.com" onClose={() => setIsOpen(false)} width={400} minHeight={0} headerContent={<SignInActionBar signedIn={isSignedIn} userName="Alex Dawson" onSignOut={() => setIsSignedIn(false)} />} footer={<DialogFooter primaryText="Done" secondaryText="Cancel" onPrimaryClick={() => {
        if (projectName.trim()) {
          toast('Project saved successfully!', 'success');
          setIsOpen(false);
        } else {
          toast('Please enter a project name', 'error');
        }
      }} onSecondaryClick={() => setIsOpen(false)} primaryDisabled={!projectName.trim()} />}>
          <LabeledInput label="Project name" value={projectName} onChange={setProjectName} placeholder="Enter project name" width="100%" />
        </Dialog>
      </>;
  }
}`,...(q=(_=y.parameters)==null?void 0:_.docs)==null?void 0:q.source},description:{story:`Share Audio Dialog - First step in the save flow
Shows signed-in state with user action bar and project name input`,...(J=(V=y.parameters)==null?void 0:V.docs)==null?void 0:J.description}}};var M,Q,X,Y,Z;C.parameters={...C.parameters,docs:{...(M=C.parameters)==null?void 0:M.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return <>
        <ToastContainer />
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Create Account Dialog
        </Button>
        <Dialog isOpen={isOpen} title="Save to audio.com" onClose={() => setIsOpen(false)} width={420} minHeight={0} footer={<DialogFooter primaryText="Continue" secondaryText="Cancel" onPrimaryClick={() => {
        if (email.trim() && password.trim()) {
          toast('Account created successfully!', 'success');
          setIsOpen(false);
        } else {
          toast('Please fill in all fields', 'error');
        }
      }} onSecondaryClick={() => setIsOpen(false)} />}>
          <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
            <p style={{
            fontSize: '12px',
            lineHeight: '16px',
            margin: 0
          }}>
              Create a free cloud storage account to access your projects and audio from any device
            </p>

            <div style={{
            display: 'flex',
            gap: '8px'
          }}>
              <SocialSignInButton provider="google" onClick={() => toast('Google sign-in clicked', 'info')} />
              <SocialSignInButton provider="facebook" onClick={() => toast('Facebook sign-in clicked', 'info')} />
            </div>

            <LabeledFormDivider label="Or use email and password" />

            <LabeledInput label="Email" value={email} onChange={setEmail} placeholder="Enter email" width="100%" type="email" />

            <LabeledInput label="Password" value={password} onChange={setPassword} placeholder="Enter password" width="100%" type="password" />

            <div style={{
            display: 'flex',
            gap: '4px',
            fontSize: '12px',
            lineHeight: 'normal'
          }}>
              <span>Already have an account?</span>
              <TextLink onClick={() => toast('Sign in clicked', 'info')}>
                Sign in here
              </TextLink>
            </div>
          </div>
        </Dialog>
      </>;
  }
}`,...(X=(Q=C.parameters)==null?void 0:Q.docs)==null?void 0:X.source},description:{story:`Create Account Dialog - Sign-up flow with social auth and email/password
Appears after user completes project name in Share Audio dialog`,...(Z=(Y=C.parameters)==null?void 0:Y.docs)==null?void 0:Z.description}}};var $,ee,te,ae,ne;w.parameters={...w.parameters,docs:{...($=w.parameters)==null?void 0:$.docs,source:{originalSource:`{
  render: () => {
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return <>
        <ToastContainer />
        <div style={{
        textAlign: 'center'
      }}>
          <Button variant="primary" onClick={() => setIsShareOpen(true)}>
            Start: Save to audio.com
          </Button>
          <p style={{
          marginTop: '16px',
          fontSize: '12px',
          color: '#666',
          maxWidth: '500px',
          margin: '16px auto 0'
        }}>
            <strong>Complete Flow:</strong><br />
            1. Enter project name and click "Done"<br />
            2. Sign-in dialog appears on top (Share Audio stays behind)<br />
            3. Sign in (username: <code>admin</code>, password: <code>password</code>) or use social buttons<br />
            4. After sign-in, return to Share Audio in signed-in state<br />
            5. Click "Done" to save project
          </p>
        </div>

        {/* Share Audio Dialog - Stays open when Create Account appears */}
        <Dialog isOpen={isShareOpen} title="Save to audio.com" onClose={() => {
        setIsShareOpen(false);
        setProjectName('');
      }} width={400} minHeight={0} headerContent={<SignInActionBar signedIn={isSignedIn} userName="Alex Dawson" onSignOut={() => setIsSignedIn(false)} />} footer={<DialogFooter primaryText="Done" secondaryText="Cancel" onPrimaryClick={() => {
        if (isSignedIn) {
          // User is signed in, save the project
          toast('Project saved successfully!', 'success');
          setIsShareOpen(false);
          setProjectName('');
        } else if (projectName.trim()) {
          // User needs to sign in, open Create Account dialog on top
          setIsCreateAccountOpen(true);
        } else {
          toast('Please enter a project name', 'error');
        }
      }} onSecondaryClick={() => {
        setIsShareOpen(false);
        setProjectName('');
      }} primaryDisabled={!projectName.trim()} />}>
          <LabeledInput label="Project name" value={projectName} onChange={setProjectName} placeholder="Enter project name" width="100%" />
        </Dialog>

        {/* Create Account Dialog - Appears on top of Share Audio */}
        <Dialog isOpen={isCreateAccountOpen} title="Save to audio.com" onClose={() => {
        setIsCreateAccountOpen(false);
        setEmail('');
        setPassword('');
      }} width={420} minHeight={0} footer={<DialogFooter primaryText="Continue" secondaryText="Cancel" onPrimaryClick={() => {
        // Validate credentials
        if (email === 'admin' && password === 'password') {
          toast('Sign in successful!', 'success');
          setIsCreateAccountOpen(false);
          setIsSignedIn(true);
          setEmail('');
          setPassword('');
        } else if (email.trim() && password.trim()) {
          toast('Invalid email or password', 'error');
        } else {
          toast('Please fill in all fields', 'error');
        }
      }} onSecondaryClick={() => {
        setIsCreateAccountOpen(false);
        setEmail('');
        setPassword('');
      }} />}>
          <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
            <p style={{
            fontSize: '12px',
            lineHeight: '16px',
            margin: 0
          }}>
              Create a free cloud storage account to access your projects and audio from any device
            </p>

            <div style={{
            display: 'flex',
            gap: '8px'
          }}>
              <SocialSignInButton provider="google" onClick={() => {
              toast('Signed in with Google!', 'success');
              setIsCreateAccountOpen(false);
              setIsSignedIn(true);
              setEmail('');
              setPassword('');
            }} />
              <SocialSignInButton provider="facebook" onClick={() => {
              toast('Signed in with Facebook!', 'success');
              setIsCreateAccountOpen(false);
              setIsSignedIn(true);
              setEmail('');
              setPassword('');
            }} />
            </div>

            <LabeledFormDivider label="Or use email and password" />

            <LabeledInput label="Email" value={email} onChange={setEmail} placeholder="Enter email" width="100%" type="email" />

            <LabeledInput label="Password" value={password} onChange={setPassword} placeholder="Enter password" width="100%" type="password" />

            <div style={{
            display: 'flex',
            gap: '4px',
            fontSize: '12px',
            lineHeight: 'normal'
          }}>
              <span>Already have an account?</span>
              <TextLink onClick={() => {
              setIsCreateAccountOpen(false);
              toast('Would show sign-in dialog', 'info');
            }}>
                Sign in here
              </TextLink>
            </div>
          </div>
        </Dialog>
      </>;
  }
}`,...(te=(ee=w.parameters)==null?void 0:ee.docs)==null?void 0:te.source},description:{story:`Complete Flow - Share Audio with Layered Sign-In
Demonstrates the full dialog sequence when saving a project.

Flow:
1. Enter project name and click "Done"
2. Create Account dialog appears ON TOP (Share Audio stays open behind)
3. Sign in with credentials (username: admin, password: password) or social buttons
4. After successful sign-in, return to Share Audio dialog in signed-in state
5. Click "Done" again to save the project`,...(ne=(ae=w.parameters)==null?void 0:ae.docs)==null?void 0:ne.description}}};var se,oe,re,ie,le;E.parameters={...E.parameters,docs:{...(se=E.parameters)==null?void 0:se.docs,source:{originalSource:`{
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Wide Dialog
        </Button>
        <Dialog isOpen={isOpen} title="Wide Dialog" onClose={() => setIsOpen(false)} width={600} footer={<DialogFooter primaryText="OK" secondaryText="Cancel" onPrimaryClick={() => setIsOpen(false)} onSecondaryClick={() => setIsOpen(false)} />}>
          <p>This is a wider dialog with 600px width.</p>
        </Dialog>
      </>;
  }
}`,...(re=(oe=E.parameters)==null?void 0:oe.docs)==null?void 0:re.source},description:{story:"Wide Dialog - Example of custom width",...(le=(ie=E.parameters)==null?void 0:ie.docs)==null?void 0:le.description}}};const Ce=["Basic","NoPadding","WithFooter","ShareAudioDialog","CreateAccountDialog","CompleteFlow","WideDialog"];export{f as Basic,w as CompleteFlow,C as CreateAccountDialog,h as NoPadding,y as ShareAudioDialog,E as WideDialog,S as WithFooter,Ce as __namedExportsOrder,ye as default};
